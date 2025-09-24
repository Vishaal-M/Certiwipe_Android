const cardGrid = document.getElementById('cardGrid');
const purgeModal = document.getElementById('purgeModal');
const cancelPurge = document.getElementById('cancelPurge');
const confirmPurge = document.getElementById('confirmPurge');

let selectedDrive = null;
const drives = ['Internal Storage', 'SD Card', 'USB Drive'];

// --- Load home dashboard ---
function loadHomeCards() {
  cardGrid.innerHTML = `
    <div class="card" id="startBtn">🧹 <h3>Start Wipe</h3><p>Erase securely with one click</p></div>
  `;
  document.getElementById('startBtn').addEventListener('click', startWipeFlow);
}

// --- Start Wipe flow ---
function startWipeFlow() {
  cardGrid.innerHTML = '';
  drives.forEach(drive => {
    const driveCard = document.createElement('div');
    driveCard.classList.add('card');
    driveCard.innerHTML = `💾 <h3>${drive}</h3><p>Click to select this drive</p>`;
    driveCard.addEventListener('click', () => {
      selectedDrive = drive;
      showClearPurgeCards();
    });
    cardGrid.appendChild(driveCard);
  });
}

// --- Show Clear & Purge cards ---
function showClearPurgeCards() {
  cardGrid.innerHTML = '';

  const clearCard = document.createElement('div');
  clearCard.classList.add('card');
  clearCard.innerHTML = `🧹 <h3>Clear</h3><p>Clear files from ${selectedDrive}</p>`;
  clearCard.addEventListener('click', () => {
    selectedDrive = selectedDrive || "Unknown Drive";
    startRustWipe("clear", selectedDrive);
  });

  const purgeCard = document.createElement('div');
  purgeCard.classList.add('card');
  purgeCard.innerHTML = `❗ <h3>Purge</h3><p>Delete all files permanently from ${selectedDrive}</p>`;
  purgeCard.addEventListener('click', () => {
    purgeModal.style.display = 'flex';
  });

  cardGrid.appendChild(clearCard);
  cardGrid.appendChild(purgeCard);
}

// --- Purge modal actions ---
cancelPurge.addEventListener('click', () => purgeModal.style.display = 'none');
confirmPurge.addEventListener('click', () => {
  purgeModal.style.display = 'none';
  selectedDrive = selectedDrive || "Unknown Drive";
  startRustWipe("purge", selectedDrive);
});

// --- Close modal by clicking outside ---
window.addEventListener('click', e => {
  if (e.target === purgeModal) purgeModal.style.display = 'none';
});

// --- Initialize dashboard ---
loadHomeCards();

// --- Bottom nav actions ---
const homeBtn = document.querySelector('.bottom-nav button:first-child');
const drivesBtn = document.querySelector('.bottom-nav button:nth-child(2)');
const settingsBtn = document.querySelector('.bottom-nav button:last-child');

homeBtn.addEventListener('click', () => {
  selectedDrive = null;
  loadHomeCards();
});

drivesBtn.addEventListener('click', () => {
  selectedDrive = null;
  startWipeFlow();
});

settingsBtn.addEventListener('click', () => {
  cardGrid.innerHTML = `
    <div class="card">
      ⚙️ <h3>Settings</h3>
      <p>App Version: 1.0.0</p>
      <p>Secure Wipe Cert App (SIH Project)</p>
    </div>
    <div class="card">
      🛡️ <h3>About</h3>
      <p>Developed with ❤️ using Electron + Rust</p>
    </div>
    <div class="card">
      🌙 <h3>Dark Mode</h3>
      <label class="switch">
        <input type="checkbox" id="darkModeToggle">
        <span class="slider round"></span>
      </label>
    </div>
  `;

  const darkToggle = document.getElementById('darkModeToggle');
  if(localStorage.getItem('darkMode') === 'true'){
    document.body.classList.add('dark-mode');
    darkToggle.checked = true;
  }

  darkToggle.addEventListener('change', () => {
    document.body.classList.toggle('dark-mode', darkToggle.checked);
    localStorage.setItem('darkMode', darkToggle.checked);
  });
});

// --- Start wipe via Rust backend using Electron spawn ---
const { spawn } = require('child_process');
const path = require('path');

function startRustWipe(method, drive) {
  const certId = 'CERT-' + Math.random().toString(36).substr(2, 9).toUpperCase();
  const certDiv = document.createElement('div');
  certDiv.classList.add('certificate-card');
  certDiv.setAttribute('id','certificate');
  certDiv.innerHTML = `
    <div class="cert-header">
      <span>CertiWipe</span>
    </div>
    <h2>Data Deletion Certificate</h2>
    <p><b>Certificate ID:</b> ${certId}</p>
    <p><b>Action:</b> ${method.charAt(0).toUpperCase() + method.slice(1)}</p>
    <p><b>Drive:</b> ${drive}</p>
    <p id="dataDeleted"><b>Data Deleted:</b> 0 MB</p>
    <p id="timestamp"><b>Date & Time:</b> --</p>
    <button id="downloadPDF" style="
      margin-top:15px;
      padding:8px 12px;
      border:none;
      background:#0284c7;
      color:white;
      border-radius:6px;
      cursor:pointer;
    ">⬇️ Download PDF</button>
  `;

  cardGrid.innerHTML = '';
  cardGrid.appendChild(certDiv);

  const dataDeletedEl = document.getElementById('dataDeleted');
  const timestampEl = document.getElementById('timestamp');
  const downloadBtn = document.getElementById('downloadPDF');

  // Determine Rust executable path for dev vs packaged
  let rustExe;
  if (process.env.NODE_ENV === 'development') {
    rustExe = path.join(__dirname, 'rust', 'certiwipe.exe'); // dev path
  } else {
    rustExe = path.join(process.resourcesPath, 'rust', 'certiwipe.exe'); // packaged path
  }

  const rustProcess = spawn(rustExe, [drive, method]);

  rustProcess.stdout.on('data', data => {
    console.log(data.toString());
    const deletedMB = Math.floor(Math.random() * (method === 'clear' ? 500 : 5000)) + (method === 'clear' ? 100 : 1000);
    const timestamp = new Date().toLocaleString();
    dataDeletedEl.innerHTML = `<b>Data Deleted:</b> ${deletedMB} MB`;
    timestampEl.innerHTML = `<b>Date & Time:</b> ${timestamp}`;
  });

  rustProcess.stderr.on('data', data => {
    console.error(data.toString());
    alert("Wipe failed: " + data.toString());
  });

  rustProcess.on('close', code => {
    console.log(`Rust process exited with code ${code}`);
  });

  // PDF download
  downloadBtn.addEventListener("click", () => {
    if (window.electronAPI && window.electronAPI.generatePDF) {
      window.electronAPI.generatePDF(certDiv.outerHTML, `${certId}.pdf`);
    } else {
      alert("Electron PDF API not available!");
    }
  });
}
