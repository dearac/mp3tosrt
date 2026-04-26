const dropZone = document.getElementById('dropZone');
const chooseMp3Btn = document.getElementById('chooseMp3Btn');
const chooseOutputBtn = document.getElementById('chooseOutputBtn');
const transcribeBtn = document.getElementById('transcribeBtn');
const openOutputBtn = document.getElementById('openOutputBtn');
const selectedMp3 = document.getElementById('selectedMp3');
const selectedOutput = document.getElementById('selectedOutput');
const modelSelect = document.getElementById('modelSelect');
const deviceSelect = document.getElementById('deviceSelect');
const computeTypeSelect = document.getElementById('computeTypeSelect');
const logArea = document.getElementById('logArea');

let inputPath = '';
let outputDir = '';
let latestOutputFile = '';

function appendLog(text) {
  logArea.value += `${text}\n`;
  logArea.scrollTop = logArea.scrollHeight;
}

function updateFileSelection(pathValue) {
  inputPath = pathValue;
  selectedMp3.textContent = pathValue || 'No file selected';
}

function updateOutputSelection(pathValue) {
  outputDir = pathValue;
  selectedOutput.textContent = pathValue || 'Default: same folder as MP3';
}

function setBusy(isBusy) {
  transcribeBtn.disabled = isBusy;
  chooseMp3Btn.disabled = isBusy;
  chooseOutputBtn.disabled = isBusy;
}

function looksLikeMp3(filePath) {
  return typeof filePath === 'string' && filePath.toLowerCase().endsWith('.mp3');
}

chooseMp3Btn.addEventListener('click', async () => {
  const selected = await window.mp3ToSrtApi.selectMp3();
  if (selected) {
    updateFileSelection(selected);
  }
});

chooseOutputBtn.addEventListener('click', async () => {
  const selected = await window.mp3ToSrtApi.selectOutputFolder();
  if (selected) {
    updateOutputSelection(selected);
    openOutputBtn.disabled = false;
  }
});

;['dragenter', 'dragover'].forEach((eventName) => {
  dropZone.addEventListener(eventName, (event) => {
    event.preventDefault();
    event.stopPropagation();
    dropZone.classList.add('drag-over');
  });
});

;['dragleave', 'drop'].forEach((eventName) => {
  dropZone.addEventListener(eventName, (event) => {
    event.preventDefault();
    event.stopPropagation();
    dropZone.classList.remove('drag-over');
  });
});

dropZone.addEventListener('drop', (event) => {
  const files = Array.from(event.dataTransfer?.files || []);
  if (!files.length) {
    return;
  }

  const mp3File = files.find((f) => looksLikeMp3(f.path));
  if (!mp3File) {
    appendLog('Please drop an .mp3 file.');
    return;
  }

  updateFileSelection(mp3File.path);
});

window.mp3ToSrtApi.onLog((line) => appendLog(line));

transcribeBtn.addEventListener('click', async () => {
  if (!inputPath) {
    appendLog('Please choose an MP3 file first.');
    return;
  }

  latestOutputFile = '';
  openOutputBtn.disabled = true;
  setBusy(true);
  appendLog('Starting transcription...');

  try {
    const result = await window.mp3ToSrtApi.transcribe({
      inputPath,
      outputDir,
      model: modelSelect.value,
      device: deviceSelect.value,
      computeType: computeTypeSelect.value
    });

    latestOutputFile = result.outputFile || '';

    if (latestOutputFile) {
      appendLog(`Finished. SRT: ${latestOutputFile}`);
    } else {
      appendLog('Finished, but output file path was not detected from logs.');
    }

    if (result.outputDir) {
      outputDir = result.outputDir;
      selectedOutput.textContent = outputDir;
      openOutputBtn.disabled = false;
    }
  } catch (err) {
    appendLog(`ERROR: ${err.message}`);
  } finally {
    setBusy(false);
  }
});

openOutputBtn.addEventListener('click', async () => {
  const folder = outputDir || (latestOutputFile ? latestOutputFile.replace(/[\\/][^\\/]+$/, '') : '');
  if (!folder) {
    appendLog('No output folder available yet.');
    return;
  }

  const result = await window.mp3ToSrtApi.openFolder(folder);
  if (!result.ok) {
    appendLog(`Could not open folder: ${result.error || 'Unknown error'}`);
  }
});
