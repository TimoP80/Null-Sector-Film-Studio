# Modal LTX HTTP service

This directory is the isolated deployment-side transport for the Null Sector
`modal-ltx` provider. It is separate from the benchmark and does not modify the
local ComfyUI/LTX pipeline.

## Current status

The HTTP surface is implemented with:

- `POST /v1/jobs`
- `GET /v1/jobs/{id}`
- `DELETE /v1/jobs/{id}`
- `GET /v1/jobs/{id}/result`
- bearer authentication via the `nullsector-ltx-http` Modal Secret
- required `Idempotency-Key`
- durable job records in a Modal Volume
- bounded request/frame/step/body limits
- MP4 validation hooks using FFprobe and FFmpeg

The worker now contains the extracted pinned ComfyUI v0.20.1/LTX v0.9.1 workflow, model materialization, controlled I2V input handling, and MP4 validation. It must still be deployed and smoke-tested before enabling application traffic.

## Required secret

Create a Modal Secret containing only:

```text
MODAL_LTX_TOKEN=<strong-random-bearer-token>
```

Do not commit the value, put it in `.env.example`, print it, or send it to the
frontend. The Null Sector server should receive the same token through its
runtime secret mechanism as `MODAL_LTX_TOKEN`.

## Deployment shape

The service uses an ephemeral L4 function and two Volumes:

- `nullsector-ltx-service-state`: durable job/idempotency records
- `nullsector-ltx-service-models`: dedicated model cache populated from the exact benchmark files

The function is not an always-on GPU worker. Queue/concurrency enforcement and
remote cancellation still need a production validation pass against the Modal
runtime before enabling it for application traffic.

Create the service secret and deploy:

```bash
modal secret create nullsector-ltx-http MODAL_LTX_TOKEN="<strong-random-token>"
cd scripts/modal-ltx-service
modal deploy service.py --name nullsector-ltx-http
```

The deployment creates/uses the dedicated model volume and downloads only the
exact LTX checkpoint and T5 encoder when first needed. Run the deployment only
when the Modal account has sufficient credit for the image build and one real
L4 smoke test.

Use the deployed Modal web-function URL as `MODAL_LTX_ENDPOINT`, with the
service path expected by the application adapter. The endpoint must be HTTPS.

## Request

```http
POST /v1/jobs
Authorization: Bearer <token>
Idempotency-Key: <stable-client-operation-id>
Content-Type: application/json
```

```json
{
  "type": "t2v",
  "prompt": "...",
  "resolution": "864x480",
  "duration": 1,
  "fps": 24,
  "frames": 25,
  "steps": 25,
  "cfg": 3,
  "seed": 42,
  "outputFormat": "mp4"
}
```

For I2V use `type: "i2v"` and a validated `data:image/png|jpeg|webp;base64,...`
source image. Arbitrary filesystem paths and remote URLs are not accepted.

## Safety limits

The initial service limits are:

- 8 MiB request body
- 6 MiB source image
- 97 frames
- 60 FPS
- 10 seconds
- 50 steps
- CFG 20
- bounded queue and one GPU worker
- 900 second function timeout

These protect the Modal account through operational limits rather than an
inaccurate billing calculator.
