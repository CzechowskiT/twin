# Interactive demo video pipeline

## Status (this batch)

| Step | Status | Notes |
|------|--------|-------|
| Scene manifest | PASS | `demo:validate-scenes` |
| Frame capture spec | PASS | `demo:capture:pipeline` @ `01f6545b` — Playwright frames |
| MP4 render | **RENDERED** | 4 variants EN/PL homepage+full — ffprobe PASS in `reports/demo-video/` |

## Commands

```bash
cd frontend
npm run demo:render:video      # EN command manifest
npm run demo:render:video:pl # PL command manifest
```

Output: `reports/demo-video/render-commands-{en|pl}.md`

## FFmpeg stitch (after frames exist)

```bash
ffmpeg -y -framerate 2 -i "reports/demo-video/frames-en/frame-%04d.png" \
  -c:v libx264 -pix_fmt yuv420p \
  "reports/demo-video/twin-demo-en.mp4"
```

Do not mark PASS without frame artifacts on disk.
