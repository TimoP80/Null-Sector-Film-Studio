const { app, BrowserWindow, shell } = require('electron');
const { spawn } = require('node:child_process');
const http = require('node:http');
const net = require('node:net');
const path = require('node:path');
const fs = require('node:fs');

const configuredPort = Number(process.env.NULL_SECTOR_PORT || 0);
let serverPort = configuredPort;
let serverProcess = null;
let mainWindow = null;

const isPackaged = app.isPackaged;

// In a packaged app, stderr/stdout go nowhere with 'inherit'.
// Use a log file so we can diagnose startup failures.
const logDir = isPackaged
  ? path.join(app.getPath('userData'), 'logs')
  : path.join(app.getAppPath(), 'logs');
if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });
const logFile = path.join(logDir, 'electron.log');

const log = (msg) => {
  const line = `[${new Date().toISOString()}] ${msg}\n`;
  try { fs.appendFileSync(logFile, line); } catch (_) { /* ignore */ }
  if (!isPackaged) process.stdout.write(line);
};

const getServerScriptPath = () => {
  if (isPackaged) {
    return path.join(process.resourcesPath, 'app.asar.unpacked', 'dist', 'server.cjs');
  }
  return path.join(app.getAppPath(), 'dist', 'server.cjs');
};

const getServerStaticPath = () => {
  if (isPackaged) {
    return path.join(process.resourcesPath, 'app.asar.unpacked', 'dist');
  }
  return path.join(app.getAppPath(), 'dist');
};

const waitForServer = (url, timeoutMs = 30_000) => new Promise((resolve, reject) => {
  const startedAt = Date.now();
  const check = () => {
    const request = http.get(url, (response) => {
      response.resume();
      if (response.statusCode && response.statusCode < 500) {
        resolve();
        return;
      }
      retry();
    });
    request.on('error', retry);
    request.setTimeout(1_000, () => {
      request.destroy();
      retry();
    });
  };
  const retry = () => {
    if (Date.now() - startedAt >= timeoutMs) {
      reject(new Error(`Server did not start within ${timeoutMs / 1000}s`));
      return;
    }
    setTimeout(check, 500);
  };
  check();
});

const findFreePort = () => new Promise((resolve, reject) => {
  const probe = net.createServer();
  probe.once('error', reject);
  probe.listen(configuredPort || 0, '127.0.0.1', () => {
    const address = probe.address();
    const port = address && typeof address === 'object' ? address.port : 0;
    probe.close(error => error ? reject(error) : resolve(port));
  });
});

const startServer = () => {
  const serverScript = getServerScriptPath();

  if (!fs.existsSync(serverScript)) {
    log(`ERROR: Server script not found at ${serverScript}`);
    return;
  }

  const staticPath = getServerStaticPath();
  log(`Starting server: ${serverScript}`);
  log(`Static path: ${staticPath}`);
  log(`Port: ${serverPort}`);

  // Resolve the executable path explicitly — process.execPath may contain spaces
  // and some Windows environments fail with spawn ENOENT.
  const execPath = app.isPackaged ? app.getPath('exe') : process.execPath;
  log(`Exec path: ${execPath}`);

  serverProcess = spawn(execPath, [serverScript], {
    // app.getAppPath() returns the .asar archive path in packaged apps, which is not a real directory.
    // Use the exe's parent directory instead so spawn can resolve the cwd.
    cwd: isPackaged ? path.dirname(app.getPath('exe')) : app.getAppPath(),
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: '1',
      NODE_ENV: 'production',
      PORT: String(serverPort),
      NODE_PATH: [
        path.join(app.getAppPath(), 'node_modules'),
        isPackaged ? path.join(process.resourcesPath, 'app.asar.unpacked', 'node_modules') : '',
        process.env.NODE_PATH,
      ].filter(Boolean).join(path.delimiter),
      NULL_SECTOR_DIST_PATH: staticPath,
      NULL_SECTOR_ASSET_DIR: path.join(app.getPath('userData'), 'assets'),
    },
    // In packaged apps, 'inherit' goes nowhere. Use pipe so we can log.
    stdio: isPackaged ? ['ignore', 'pipe', 'pipe'] : 'inherit',
  });

  if (isPackaged && serverProcess.stdout) {
    serverProcess.stdout.on('data', (data) => {
      log(`[server] ${data.toString().trim()}`);
    });
  }
  if (isPackaged && serverProcess.stderr) {
    serverProcess.stderr.on('data', (data) => {
      log(`[server:err] ${data.toString().trim()}`);
    });
  }

  serverProcess.on('error', (error) => {
    log(`ERROR: Could not start server: ${error.message}`);
  });

  serverProcess.on('exit', (code, signal) => {
    log(`Server exited with code=${code} signal=${signal}`);
    serverProcess = null;
  });
};

const stopServer = () => {
  if (!serverProcess || serverProcess.killed) return;
  log('Stopping server...');
  serverProcess.kill();
  serverProcess = null;
};

const createWindow = async () => {
  log(`Waiting for server at http://127.0.0.1:${serverPort}/api/providers/status`);

  try {
    await waitForServer(`http://127.0.0.1:${serverPort}/api/providers/status`);
  } catch (err) {
    log(`ERROR: Server did not become ready: ${err.message}`);
    app.quit();
    return;
  }

  log('Server ready, creating window...');

  // Resolve icon: packaged apps use resourcesPath; dev uses project root.
  const iconPath = isPackaged
    ? path.join(process.resourcesPath, 'app.asar.unpacked', 'build', 'icon.ico')
    : path.join(app.getAppPath(), 'build', 'icon.ico');
  const iconFile = fs.existsSync(iconPath) ? iconPath : undefined;

  mainWindow = new BrowserWindow({
    width: 1440,
    height: 960,
    minWidth: 1024,
    minHeight: 700,
    backgroundColor: '#0A0A0B',
    icon: iconFile,
    show: false, // show after content loads to avoid white flash
    webPreferences: {
      preload: path.join(app.getAppPath(), 'electron', 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription) => {
    log(`ERROR: Page load failed: ${errorCode} - ${errorDescription}`);
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  try {
    await mainWindow.loadURL(`http://127.0.0.1:${serverPort}`);
    mainWindow.show();
    log('Window loaded successfully');
  } catch (err) {
    log(`ERROR: Failed to load URL: ${err.message}`);
  }
};

app.whenReady().then(async () => {
  try {
    log('Electron app starting...');
    serverPort = await findFreePort();
    log(`Selected port: ${serverPort}`);
    startServer();
    await createWindow();
  } catch (error) {
    log(`FATAL: ${error.message}\n${error.stack}`);
    app.quit();
  }
});

app.on('before-quit', () => {
  log('App quitting, stopping server...');
  stopServer();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow().catch((err) => {
    log(`ERROR: Failed to create window on activate: ${err.message}`);
  });
});
