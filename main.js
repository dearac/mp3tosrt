const path = require('path');
const fs = require('fs');
const { app, BrowserWindow, dialog, ipcMain, shell } = require('electron');
const { spawn } = require('child_process');

let mainWindow;
let activeProcess = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 980,
    height: 720,
    minWidth: 760,
    minHeight: 560,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

ipcMain.handle('select-mp3', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Choose MP3 File',
    properties: ['openFile'],
    filters: [{ name: 'Audio files', extensions: ['mp3'] }]
  });

  if (result.canceled || !result.filePaths[0]) {
    return null;
  }

  return result.filePaths[0];
});

ipcMain.handle('select-output-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Choose Output Folder',
    properties: ['openDirectory', 'createDirectory']
  });

  if (result.canceled || !result.filePaths[0]) {
    return null;
  }

  return result.filePaths[0];
});

function resolvePythonExecutable() {
  const candidates = [
    path.join(__dirname, '.venv', 'Scripts', 'python.exe'),
    path.join(__dirname, 'venv', 'Scripts', 'python.exe'),
    path.join(__dirname, '.venv', 'bin', 'python'),
    path.join(__dirname, 'venv', 'bin', 'python')
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  if (process.platform === 'win32') {
    return 'python';
  }

  return 'python3';
}

ipcMain.handle('transcribe', async (_event, payload) => {
  const { inputPath, outputDir, model, device, computeType } = payload;

  if (!inputPath) {
    throw new Error('Missing input MP3 path.');
  }

  const finalOutputDir = outputDir || path.dirname(inputPath);

  if (activeProcess) {
    throw new Error('A transcription is already in progress.');
  }

  const pythonExe = resolvePythonExecutable();
  const scriptPath = path.join(__dirname, 'python', 'transcribe_srt.py');

  return await new Promise((resolve, reject) => {
    let outputFile = null;

    const args = [
      scriptPath,
      '--input',
      inputPath,
      '--output_dir',
      finalOutputDir,
      '--model',
      model,
      '--device',
      device,
      '--compute_type',
      computeType
    ];

    activeProcess = spawn(pythonExe, args, {
      cwd: __dirname,
      windowsHide: true
    });

    mainWindow.webContents.send('transcribe-log', `Starting Python process: ${pythonExe}`);

    activeProcess.stdout.on('data', (chunk) => {
      const text = chunk.toString();
      text.split(/\r?\n/).forEach((line) => {
        if (!line.trim()) {
          return;
        }

        if (line.startsWith('OUTPUT_FILE=')) {
          outputFile = line.replace('OUTPUT_FILE=', '').trim();
        }

        mainWindow.webContents.send('transcribe-log', line);
      });
    });

    activeProcess.stderr.on('data', (chunk) => {
      const text = chunk.toString();
      text.split(/\r?\n/).forEach((line) => {
        if (!line.trim()) {
          return;
        }
        mainWindow.webContents.send('transcribe-log', `[stderr] ${line}`);
      });
    });

    activeProcess.on('error', (err) => {
      activeProcess = null;
      reject(new Error(`Failed to start Python process: ${err.message}`));
    });

    activeProcess.on('close', (code) => {
      activeProcess = null;
      if (code === 0) {
        resolve({ code, outputFile, outputDir: finalOutputDir });
      } else {
        reject(new Error(`Transcription failed with exit code ${code}.`));
      }
    });
  });
});

ipcMain.handle('open-folder', async (_event, folderPath) => {
  if (!folderPath) {
    throw new Error('Folder path is required.');
  }

  const errorMessage = await shell.openPath(folderPath);
  return { ok: !errorMessage, error: errorMessage || null };
});
