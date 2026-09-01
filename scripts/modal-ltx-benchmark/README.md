# Modal LTX-Video Benchmark (isolated)

Evaluation harness comparing LTX-Video 0.9.1 generation on **Modal's L4 GPU**
against the verified **local GTX 1070** baseline. **Not** wired into the
production Null Sector runtime — this is a benchmark only.

## What runs

- ComfyUI **v0.20.1** (same version as the verified local backend)
- `ltx-video-2b-v0.9.1.safetensors` + `t5xxl_fp8_e4m3fn.safetensors`
- The **same workflow graph** the local pipeline builds:
  CheckpointLoaderSimple → CLIPLoader(ltxv) → CLIPTextEncode×2 →
  LTXVConditioning → EmptyLTXVLatentVideo → KSamplerSelect → LTXVScheduler →
  SamplerCustom → VAEDecode → CreateVideo → SaveVideo (mp4/h264)

## Cost guard

- Only runs known GPUs (T4 / L4 / A10).
- Hard budget `$10`, preferred `<$5`, estimated from on-demand hourly price.
- Refuses to launch if the conservative estimate exceeds the budget.

## Run

```bash
cd scripts/modal-ltx-benchmark
modal run benchmark.py                       # L4, text-to-video, 864x480 25 frames
modal run benchmark.py --mode i2v            # image-to-video (synthetic test image)
MODAL_BENCH_GPU=T4 modal run benchmark.py   # cheaper/slower (16 GB VRAM)
modal run benchmark.py --mode t2v --seed 7
modal run benchmark.py --force-download      # re-download models to volume
```

First run downloads ~10.5 GB of models into the `ltx-benchmark-models` volume
(one-time). Outputs land in `ltx-benchmark-outputs` volume and are listed in
the returned JSON.

## Verify output locally

```bash
modal volume get ltx-benchmark-outputs <output_file> data/benchmarks/modal-ltx/<output_file>
"C:\ffmpeg\bin\ffprobe.EXE" -v error -show_entries format=format_name,duration,size \
  -show_entries stream=codec_name,width,height,r_frame_rate,nb_frames,pix_fmt \
  -of json data/benchmarks/modal-ltx/<output_file>
"C:\ffmpeg\bin\ffmpeg.EXE" -v error -i data/benchmarks/modal-ltx/<output_file> -f null -
```

## Cleanup

```bash
modal app stop nullsector-ltx-benchmark         # stop any running containers
modal volume delete ltx-benchmark-models -y     # only once fully done with re-runs
modal volume delete ltx-benchmark-outputs -y
```