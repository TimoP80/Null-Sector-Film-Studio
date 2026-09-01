import React from 'react';
import { AlertTriangle, ExternalLink } from 'lucide-react';
import { getProviderErrorPresentation } from '../utils/providerErrors';

interface ProviderErrorNoticeProps {
  error: unknown;
  provider?: string;
  model?: string;
  onOpenSettings?: () => void;
  className?: string;
}

export const ProviderErrorNotice: React.FC<ProviderErrorNoticeProps> = ({
  error,
  provider = 'Gemini image generation',
  model,
  onOpenSettings,
  className = '',
}) => {
  const presentation = getProviderErrorPresentation(error, provider, model);

  return (
    <div className={`rounded-xl border border-rose-500/40 bg-rose-950/25 p-4 text-left ${className}`}>
      <div className="flex items-start gap-2">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-300" />
        <div className="min-w-0">
          <div className="text-[11px] font-bold uppercase tracking-wider text-rose-200">
            {presentation.title}
          </div>
          <div className="mt-1 text-sm font-semibold text-rose-100">
            {presentation.message}
          </div>
          <div className="mt-2 text-xs leading-relaxed text-rose-200/90">
            {presentation.detail}
          </div>
          <div className="mt-2 text-xs leading-relaxed text-rose-200/90">
            <strong>What you can do:</strong> {presentation.action}
          </div>
          {presentation.retryMessage && (
            <div className="mt-2 text-xs font-mono text-amber-200">
              {presentation.retryMessage}
            </div>
          )}
          <div className="mt-2 text-[11px] leading-relaxed text-slate-300">
            Continue working on screenplay, shots, characters, continuity, and production planning without generation.
          </div>
          {onOpenSettings && (
            <button
              type="button"
              onClick={onOpenSettings}
              className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-rose-300/40 bg-rose-900/40 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide text-rose-100 hover:bg-rose-800/50"
            >
              <ExternalLink className="h-3 w-3" />
              Provider Settings
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
