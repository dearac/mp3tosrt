# MP3 to SRT (Electron + faster-whisper)

A local, offline-first desktop app for Windows 11 (also works on macOS/Linux) that converts an MP3 file into an SRT subtitle file.

- UI built with Electron + Node.js
- Local Python script backend (`faster-whisper`)
- No paid transcription API
- Saves subtitles as `your-audio-name.srt`

## Features

- Drag-and-drop MP3 area
- **Choose MP3** file button
- Model dropdown: `tiny`, `base`, `small`, `medium`, `large-v3`
- Device dropdown: `cuda`, `cpu`
- Compute type dropdown: `float16`, `int8_float16`, `int8`
- **Choose Output Folder** (optional)
- **Transcribe to SRT** button
- Live log/status area (stdout/stderr)
- **Open Output Folder** button after completion
- Safe Electron setup (`contextIsolation: true`, `nodeIntegration: false`, preload IPC bridge)

## Project structure

```text
package.json
main.js
preload.js
renderer/
  index.html
  renderer.js
  styles.css
python/
  transcribe_srt.py
README.md
```

## Requirements

1. **Node.js** (LTS recommended)
2. **Python 3.10 or 3.11**
3. **FFmpeg** (required by audio/transcription stack)

## Windows 11 setup (step-by-step)

### 1) Install Node.js

- Download and install Node.js LTS from the official site.
- Verify:

```bash
node -v
npm -v
```

### 2) Install Python 3.10 or 3.11

- Install from python.org.
- During install, enable **Add Python to PATH**.
- Verify:

```bash
python --version
```

### 3) Install FFmpeg on Windows

You can use one of these methods:

- `winget install --id Gyan.FFmpeg -e`
- or install via Chocolatey: `choco install ffmpeg`
- or download a build manually and add `ffmpeg/bin` to PATH.

Verify:

```bash
ffmpeg -version
```

### 4) Create Python virtual environment

From the project root:

```bash
python -m venv .venv
```

Activate it in PowerShell:

```powershell
.\.venv\Scripts\Activate.ps1
```

### 5) Install Python dependency

```bash
pip install faster-whisper
```

> On first run, the selected Whisper model (default `large-v3`) is downloaded automatically.

### 6) Install Node dependencies

```bash
npm install
```

### 7) Start the app

```bash
npm start
```

## How to use

1. Launch app with `npm start`.
2. Drag/drop an MP3 file or click **Choose MP3**.
3. (Optional) Click **Choose Output Folder**; otherwise output is next to the MP3.
4. Choose model/device/compute options (defaults: `large-v3`, `cuda`, `float16`).
5. Click **Transcribe to SRT**.
6. Wait until logs show `OUTPUT_FILE=<full path>`.
7. Click **Open Output Folder**.

## Python CLI behavior

The backend script accepts:

```bash
python python/transcribe_srt.py \
  --input "path/to/audio.mp3" \
  --output_dir "path/to/output" \
  --model large-v3 \
  --device cuda \
  --compute_type float16
```

It uses:

- `WhisperModel(model, device=device, compute_type=compute_type)`
- `vad_filter=True`
- `beam_size=5`

It writes valid SRT timestamps:

```text
HH:MM:SS,mmm --> HH:MM:SS,mmm
```

Final success line is:

```text
OUTPUT_FILE=<full path>
```

## Notes

- If CUDA is unavailable, switch to `device=cpu` and `compute_type=int8`.
- This project currently runs Python externally and does not package Whisper model files into the Electron app.
