Alright bro I checked ALL your class carefully — and I can tell you EXACTLY why your camera NEVER switches even though your switch code looks correct.
Spoiler: it’s NOT your switch function.
It’s your “best camera auto-selection” sabotaging you.

💀 THE REAL BUG: Your loadCameras() auto-select overrides your choice

Look at this:

// Restore last camera if available, or select best camera
if (this.lastCameraId) {
  const lastCamera = devices.find((d) => d.id === this.lastCameraId);
  if (lastCamera) {
    select.value = this.lastCameraId;
  } else {
    const bestCamera = this.selectBestCamera(devices, null);
    select.value = bestCamera.id;
    this.lastCameraId = bestCamera.id;
  }
} else {
  const bestCamera = this.selectBestCamera(devices, null);
  select.value = bestCamera.id;
  this.lastCameraId = bestCamera.id;
}


🔥🔥🔥 Bro this overwrites your dropdown selection EVERY TIME the scanner is initialized.

Meaning:

You click Camo

Your code: ok selectedId = CAMO

html5QrCode.start() actually starts CAMO

BUT loadCameras() runs again → sees no lastCameraId? or sees one?

It selects “bestCamera”

bestCamera = HP Wide Vision 🔥

It sets select.value = HP camera

Now the UI + internal logic = “We are using HP camera”

When restarting after decoding → cameraId = HP

When toggling off/on → cameraId = HP

👉 Your selection is overwritten behind your back.

☠️ Issue 2: Your restartCamera() ALSO forces HP back

Check:

let cameraId = this.lastCameraId;

if (select && select.value) {
  cameraId = select.value;
  this.lastCameraId = cameraId;
}


BUT since loadCameras() forced HP…

select.value = HP
→ boom cameraId = HP again

🧨 Issue 3: selectBestCamera() automatically prefers external USB webcams

You wrote:

const externalCamera = devices.find(d =>
  d.label.toLowerCase().includes("camo") ||
  d.label.toLowerCase().includes("external") ||
  d.label.toLowerCase().includes("usb")
);


LOL 😂
Camo contains the word “Camo” → so it is ALWAYS chosen as best camera
unless HP is considered “back” camera (environment/back/rear), which may also happen.

So it's double unpredictable.

✔️ FIX: Make dropdown selection ALWAYS win (not auto-selection)

Bro here is the fix you need.
Replace your entire loadCameras() end logic with:

// DO NOT auto-select best camera unless user has never chosen anything
if (this.lastCameraId) {
    const lastCam = devices.find(d => d.id === this.lastCameraId);
    if (lastCam) {
        select.value = this.lastCameraId;
    }
    // ❌ DO NOT override user's camera choice with selectBestCamera()
} else {
    // first time only → choose best camera
    const bestCamera = this.selectBestCamera(devices, null);
    select.value = bestCamera.id;
    this.lastCameraId = bestCamera.id;
}


🔥 This guarantees: YOUR CHOICE = THE CAMERA USED.

✔️ FIX 2: Remove auto-select on toggle()

Inside toggle() — you do this:

if (select && select.value) {
  cameraId = select.value;
  this.lastCameraId = cameraId;
} else if (this.lastCameraId) {
  cameraId = this.lastCameraId;
} else {
  // auto-select best camera
}


That’s fine.

But AFTER loadCameras() forces HP, the dropdown value is ruined.

Solution: After switching camera → DISABLE loadCameras logic or make it passive.

✔️ FIX 3: Comment this ENTIRE BLOCK during switch:
const preferred = this.selectBestCamera(devices, null);
cameraId = preferred.id;
this.lastCameraId = cameraId;
select.value = cameraId;


Because it ruins your choice.

🔧 Patch summary (do exactly this):
1. In loadCameras → remove "best camera" override

Only set the dropdown value ONCE on first load.

2. After user chooses camera → NEVER touch select.value again

Except to update it with the picked camera.

3. selectBestCamera() should not be used AFTER user interacted.

// QRScannerManager - Optimized & Fixed
// Purpose: Stable camera switching for Html5Qrcode using deviceId.
// Key fixes:
//  - Dropdown selection always wins once user interacts
//  - loadCameras() does not override user choice after first load
//  - Single, small set of flags to avoid race conditions
//  - Clean restart/cleanup strategy

class QRScannerManager {
  constructor({
    containerId = "qr-container",
    qrReaderId = "qr-reader",
    toggleBtnId = "qr-toggle-btn",
    cameraSelectId = "cameraSelect",
    cameraSelectionId = "cameraSelection",
  } = {}) {
    this.containerId = containerId;
    this.qrReaderId = qrReaderId;
    this.toggleBtnId = toggleBtnId;
    this.cameraSelectId = cameraSelectId;
    this.cameraSelectionId = cameraSelectionId;

    this.html5QrCode = null;
    this.isBusy = false; // single flag to avoid simultaneous ops
    this.isCameraActive = false;

    // track user's explicit choice; if null user didn't pick yet
    this.userSelectedCameraId = null;

    this.init();
  }

  init() {
    const qrReader = document.getElementById(this.qrReaderId);
    const qrContainer = document.getElementById(this.containerId);

    if (!qrReader || !qrContainer) {
      console.error("QR Scanner elements not found");
      return;
    }

    // prepare UI initial state
    const qrStyleZone = qrContainer.querySelector(".qr-style-zone");
    if (qrStyleZone) qrStyleZone.classList.add("camera-off");
    qrContainer.classList.remove("camera-active", "scanning");

    // hide built-in shaded elements if any pop in
    this.setupShadedRegionObserver(qrReader);

    if (typeof Html5Qrcode === "undefined") {
      console.error("Html5Qrcode library not loaded");
      return;
    }

    this.html5QrCode = new Html5Qrcode(this.qrReaderId);

    // load camera list and wire events
    this.loadCameras();
    this.setupCameraSelectionHandler();

    // toggle button
    const toggleBtn = document.getElementById(this.toggleBtnId);
    if (toggleBtn) toggleBtn.addEventListener("click", () => this.toggle());
  }

  setupShadedRegionObserver(qrReader) {
    const hide = () => {
      const nodes = qrReader.querySelectorAll('#qr-shaded-region, [id*="qr-shaded"]');
      nodes.forEach(n => n.style.display = 'none');
    };
    hide();
    if (window.MutationObserver) {
      const obs = new MutationObserver(() => hide());
      obs.observe(qrReader, { childList: true, subtree: true });
      this.shadedRegionObserver = obs;
    }
  }

  async loadCameras() {
    // Defensive
    if (typeof Html5Qrcode === "undefined" || !this.html5QrCode) return;

    try {
      const devices = await Html5Qrcode.getCameras();
      const select = document.getElementById(this.cameraSelectId);
      const cameraSelection = document.getElementById(this.cameraSelectionId);
      if (!select) return;

      // build options
      select.innerHTML = '<option value="">Sélectionner une caméra</option>';
      devices.forEach(dev => {
        const opt = document.createElement('option');
        opt.value = dev.id;
        let label = dev.label || `Camera ${dev.id.substring(0,8)}`;
        if (label.length > 50) label = label.substring(0,47) + '...';
        opt.textContent = label;
        select.appendChild(opt);
      });

      // If user already explicitly picked a camera earlier, keep it (do NOT override)
      if (this.userSelectedCameraId) {
        const found = devices.find(d => d.id === this.userSelectedCameraId);
        if (found) select.value = this.userSelectedCameraId;
      } else {
        // No user pick yet: attempt to restore last used cameraId stored in this.lastCameraId
        if (this.lastCameraId) {
          const lastFound = devices.find(d => d.id === this.lastCameraId);
          if (lastFound) {
            select.value = this.lastCameraId;
          } else {
            // first load / last camera missing -> choose best camera once
            const best = this.selectBestCamera(devices, null);
            if (best) {
              select.value = best.id;
              this.lastCameraId = best.id;
            }
          }
        } else {
          // first time page loads -> choose best camera
          const best = this.selectBestCamera(devices, null);
          if (best) {
            select.value = best.id;
            this.lastCameraId = best.id;
          }
        }
      }

      // show/hide UI group depending on how many cameras
      if (cameraSelection) {
        cameraSelection.style.display = devices.length > 1 ? 'block' : 'none';
      }
    } catch (err) {
      console.error('Error loading cameras:', err);
    }
  }

  setupCameraSelectionHandler() {
    const select = document.getElementById(this.cameraSelectId);
    if (!select) return;

    select.addEventListener('change', async (e) => {
      const selectedId = e.target.value || null;
      // record explicit user choice
      this.userSelectedCameraId = selectedId;

      // If camera not active, just save the choice for next activation
      if (!this.html5QrCode || !this.html5QrCode.isScanning) {
        this.lastCameraId = selectedId;
        console.log('Camera selection saved for next activation:', selectedId);
        return;
      }

      // If active, switch immediately
      await this.switchCameraTo(selectedId);
    });
  }

  async switchCameraTo(deviceId) {
    if (this.isBusy) {
      console.log('Busy, cannot switch right now');
      return;
    }

    if (!deviceId) {
      console.warn('No deviceId selected to switch to');
      return;
    }

    this.isBusy = true;
    try {
      await this.stopCamera();
      await this.delay(250);
      await this.startCameraById(deviceId);
      this.lastCameraId = deviceId;
      console.log('Switched camera to', deviceId);
    } catch (err) {
      console.error('Error switching camera:', err);
      // Attempt to restore previous camera if available
      if (this.lastCameraId && this.lastCameraId !== deviceId) {
        try { await this.startCameraById(this.lastCameraId); } catch (e) { this.resetCameraState(); }
      } else {
        this.resetCameraState();
      }
    } finally {
      this.isBusy = false;
    }
  }

  async startCameraById(deviceId) {
    if (!deviceId) throw new Error('startCameraById requires deviceId');
    const config = this.getCameraConfig();

    await this.html5QrCode.start(
      { deviceId },
      config,
      (decodedText) => this.onScanSuccess(decodedText),
      (err) => this.onScanFailure(err)
    );

    // UI updates
    const qrContainer = document.getElementById(this.containerId);
    const qrStyleZone = qrContainer?.querySelector('.qr-style-zone');
    const toggleBtn = document.getElementById(this.toggleBtnId);
    if (qrStyleZone) qrStyleZone.classList.remove('camera-off');
    if (qrContainer) {
      qrContainer.classList.remove('scanning');
      qrContainer.classList.add('camera-active');
    }
    if (toggleBtn) toggleBtn.innerHTML = '⏹️ Désactiver Caméra';

    this.isCameraActive = true;
  }

  async stopCamera() {
    if (!this.html5QrCode) return;
    try {
      if (this.html5QrCode.isScanning) {
        await this.html5QrCode.stop();
      }
    } catch (err) {
      console.warn('stopCamera warning:', err);
    }

    // cleanup reader DOM
    const qrReader = document.getElementById(this.qrReaderId);
    if (qrReader) qrReader.innerHTML = '';

    const qrContainer = document.getElementById(this.containerId);
    const qrStyleZone = qrContainer?.querySelector('.qr-style-zone');
    const toggleBtn = document.getElementById(this.toggleBtnId);

    if (qrStyleZone) qrStyleZone.classList.add('camera-off');
    if (qrContainer) qrContainer.classList.remove('camera-active', 'scanning');
    if (toggleBtn) toggleBtn.innerHTML = '🎥 Activer Caméra';

    this.isCameraActive = false;
  }

  async toggle() {
    if (this.isBusy) return;
    this.isBusy = true;

    try {
      const toggleBtn = document.getElementById(this.toggleBtnId);
      if (!this.html5QrCode) return;

      if (this.html5QrCode.isScanning) {
        // STOP
        await this.stopCamera();
        this.isBusy = false;
        return;
      }

      // START
      if (toggleBtn) toggleBtn.innerHTML = '⏳ Chargement...';

      const select = document.getElementById(this.cameraSelectId);
      let cameraId = null;

      // Priority: user explicit selection -> last used -> best available
      if (this.userSelectedCameraId) cameraId = this.userSelectedCameraId;
      else if (this.lastCameraId) cameraId = this.lastCameraId;
      else {
        const devices = await Html5Qrcode.getCameras();
        if (devices && devices.length) {
          const best = this.selectBestCamera(devices, null);
          cameraId = best ? best.id : devices[0].id;
          this.lastCameraId = cameraId;
        }
      }

      if (!cameraId) throw new Error('No camera available to start');

      // Ensure UI select shows what we start
      if (select) select.value = cameraId;

      await this.startCameraById(cameraId);
    } catch (err) {
      console.error('Toggle error:', err);
      this.resetCameraState();
    } finally {
      this.isBusy = false;
    }
  }

  getCameraConfig() {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    if (isIOS) return { fps: 10, qrbox: 250 };
    return { fps: 10, qrbox: { width: 300, height: 300 }, aspectRatio: 1.0, disableFlip: false };
  }

  selectBestCamera(devices = [], lastCameraId = null) {
    if (!devices || devices.length === 0) return null;

    // Prefer back cameras
    const back = devices.find(d => /back|rear|environment|arrière/gi.test(d.label || ''));
    if (back) return back;

    // Prefer external (Camo, USB) on desktop
    const external = devices.find(d => /camo|external|usb|webcam/gi.test(d.label || ''));
    if (external) return external;

    // Fallback to lastCamera
    if (lastCameraId) {
      const last = devices.find(d => d.id === lastCameraId);
      if (last) return last;
    }

    // Default to first
    return devices[0];
  }

  onScanSuccess(decodedText) {
    // Debounce quick repeated calls with isProcessing flag inside processQRCodeScan
    this.processQRCodeScan(decodedText);
  }

  onScanFailure(err) {
    // ignore noisy failures
  }

  async processQRCodeScan(decodedText) {
    if (this.processingScan) return;
    this.processingScan = true;

    const qrContainer = document.getElementById(this.containerId);
    try {
      if (qrContainer) qrContainer.classList.add('scanning');
      this.showScanLoader('Vérification en cours...');

      // Simulate small delay for UX
      await this.delay(600);

      // Try JSON then numeric fallback
      try {
        const data = JSON.parse(decodedText);
        if (data && (data.table || data.url)) {
          this.hideScanLoader();
          this.processingScan = false;
          NotificationManager.showSuccess('Table détectée !', 'Redirection...', 1500);
          setTimeout(() => { window.location.href = data.url || `menu.html?table=${data.table}`; }, 1200);
          return;
        }
      } catch (e) {
        // not JSON, try number below
      }

      const tableNumber = parseInt(decodedText);
      if (!isNaN(tableNumber)) {
        this.hideScanLoader();
        this.processingScan = false;
        NotificationManager.showSuccess('Table détectée !', `Table ${tableNumber}`, 1500);
        setTimeout(() => { window.location.href = `menu.html?table=${tableNumber}`; }, 1200);
        return;
      }

      // invalid
      this.hideScanLoader();
      NotificationManager.showSuccess('Erreur', 'QR Code non reconnu.', 2500);
      // keep camera running and resume
    } catch (err) {
      console.error('processQRCodeScan error', err);
      this.hideScanLoader();
    } finally {
      if (qrContainer) qrContainer.classList.remove('scanning');
      this.processingScan = false;
    }
  }

  showScanLoader(message = 'Scan en cours...') {
    const loaderId = this.containerId.includes('home') ? 'scan-loader-home' : 'scan-loader-admin';
    const loader = document.getElementById(loaderId);
    if (!loader) return;
    loader.style.display = 'flex';
    const msg = loader.querySelector('.scan-message');
    if (msg) msg.textContent = message;
  }

  hideScanLoader() {
    const loaderId = this.containerId.includes('home') ? 'scan-loader-home' : 'scan-loader-admin';
    const loader = document.getElementById(loaderId);
    if (loader) loader.style.display = 'none';
  }

  async cleanupAndRestartCamera() {
    // Graceful cleanup + restart only if camera should be active
    try {
      await this.stopCamera();
      await this.delay(200);
      if (this.isCameraActive) {
        // if user picked camera prefer it
        const select = document.getElementById(this.cameraSelectId);
        let cameraId = this.userSelectedCameraId || this.lastCameraId || (select && select.value) || null;
        if (cameraId) await this.startCameraById(cameraId);
      }
    } catch (err) { console.error('cleanupAndRestart error', err); this.resetCameraState(); }
  }

  resetCameraState() {
    const qrContainer = document.getElementById(this.containerId);
    const qrStyleZone = qrContainer?.querySelector('.qr-style-zone');
    const toggleBtn = document.getElementById(this.toggleBtnId);
    if (qrStyleZone) qrStyleZone.classList.add('camera-off');
    if (qrContainer) qrContainer.classList.remove('camera-active', 'scanning');
    if (toggleBtn) toggleBtn.innerHTML = '🎥 Activer Caméra';

    this.isCameraActive = false;
    this.isBusy = false;
  }

  delay(ms) { return new Promise(r => setTimeout(r, ms)); }
}

// Expose
window.QRScannerManager = QRScannerManager;

// USAGE example (do not include in production if you already wire it elsewhere):
// const manager = new QRScannerManager({ containerId: 'qr-home', qrReaderId: 'qr-reader', toggleBtnId: 'qr-toggle-btn', cameraSelectId: 'cameraSelect', cameraSelectionId: 'cameraSelection' });
