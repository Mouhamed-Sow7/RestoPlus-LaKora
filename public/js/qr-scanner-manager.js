// QRScannerManager - Optimized & Fixed
// Purpose: Stable camera switching for Html5Qrcode using deviceId.
// Key fixes:
//  - Dropdown selection always wins once user interacts
//  - loadCameras() does not override user choice after first load
//  - Single, small set of flags to avoid race conditions
//  - Clean restart/cleanup strategy

class QRScannerManager {
  constructor(containerId, qrReaderId, toggleBtnId, cameraSelectId, cameraSelectionId) {
    this.containerId = containerId;
    this.qrReaderId = qrReaderId;
    this.toggleBtnId = toggleBtnId;
    this.cameraSelectId = cameraSelectId;
    this.cameraSelectionId = cameraSelectionId;

    this.html5QrCode = null;
    this.isBusy = false; // single flag to avoid simultaneous ops
    this.isCameraActive = false;
    this.processingScan = false;

    // track user's explicit choice; if null user didn't pick yet
    this.userSelectedCameraId = null;
    this.lastCameraId = null;

    this.init();
  }

  init() {
    const qrReader = document.getElementById(this.qrReaderId);
    const qrContainer = document.getElementById(this.containerId);

    if (!qrReader || !qrContainer) {
      return;
    }

    // prepare UI initial state
    const qrStyleZone = qrContainer.querySelector(".qr-style-zone");
    if (qrStyleZone) qrStyleZone.classList.add("camera-off");
    qrContainer.classList.remove("camera-active", "scanning");

    // hide built-in shaded elements if any pop in
    this.setupShadedRegionObserver(qrReader);

    if (typeof Html5Qrcode === "undefined") {
      return;
    }

    this.html5QrCode = new Html5Qrcode(this.qrReaderId);

    // load camera list and wire events
    this.loadCameras();
    this.setupCameraSelectionHandler();
  }

  setupShadedRegionObserver(qrReader) {
    const hide = () => {
      const nodes = qrReader.querySelectorAll('#qr-shaded-region, [id*="qr-shaded"]');
      nodes.forEach(n => {
        n.style.display = 'none';
        n.style.visibility = 'hidden';
        n.style.opacity = '0';
        n.style.pointerEvents = 'none';
      });
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
        return;
      }

      // If active, switch immediately
      await this.switchCameraTo(selectedId);
    });
  }

  async switchCameraTo(deviceId) {
    if (this.isBusy) {
      return;
    }

    if (!deviceId) {
      return;
    }

    this.isBusy = true;
    try {
      await this.stopCamera();
      await this.delay(250);
      await this.startCameraById(deviceId);
      this.lastCameraId = deviceId;
    } catch (err) {
      // Attempt to restore previous camera if available
      if (this.lastCameraId && this.lastCameraId !== deviceId) {
        try { 
          await this.startCameraById(this.lastCameraId); 
        } catch (e) { 
          this.resetCameraState(); 
        }
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
      NotificationManager.showSuccess("Erreur", "Impossible d'activer la caméra", 3000);
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
    // Debounce quick repeated calls with processingScan flag inside processQRCodeScan
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

      // Try JSON - distinguish between table QR and order QR
      try {
        const data = JSON.parse(decodedText);
        
        // Check for order QR code first (has orderId but no url)
        if (data && (data.orderId || data.qrTicket)) {
          // This is an order QR code - should be handled by admin page
          // On home page, show error
          this.hideScanLoader();
          this.processingScan = false;
          NotificationManager.showSuccess('Erreur', 'Ce QR code est un ticket de commande. Veuillez le scanner depuis la page admin.', 3000);
          return;
        }
        
        // Check for table QR code (has both table and url)
        if (data && data.table && data.url) {
          // This is a table QR code - redirect to menu
          this.hideScanLoader();
          this.processingScan = false;
          NotificationManager.showSuccess('Table détectée !', 'Redirection...', 1500);
          setTimeout(() => { 
            window.location.href = data.url || `menu.html?table=${data.table}`; 
          }, 1200);
          return;
        }
      } catch (e) {
        // not JSON, try number below
      }

      // Try as direct table number
      const tableNumber = parseInt(decodedText);
      if (!isNaN(tableNumber)) {
        this.hideScanLoader();
        this.processingScan = false;
        NotificationManager.showSuccess('Table détectée !', `Table ${tableNumber}`, 1500);
        setTimeout(() => { 
          window.location.href = `menu.html?table=${tableNumber}`; 
        }, 1200);
        return;
      }
      
      // Try as direct order ID (ORD-xxx format)
      if (decodedText && decodedText.startsWith("ORD-")) {
        this.hideScanLoader();
        this.processingScan = false;
        NotificationManager.showSuccess('Erreur', 'Ce QR code est un ticket de commande. Veuillez le scanner depuis la page admin.', 3000);
        return;
      }

      // invalid
      this.hideScanLoader();
      NotificationManager.showSuccess('Erreur', 'QR Code non reconnu.', 2500);
      // keep camera running and resume
    } catch (err) {
      this.hideScanLoader();
    } finally {
      if (qrContainer) qrContainer.classList.remove('scanning');
      this.processingScan = false;
    }
  }

  handleQRScan(decodedText) {
    // Check if we're on admin page - if so, let admin.js handle it
    if (window.location.pathname.includes("admin.html")) {
      // Admin page should have overridden this method
      // If not overridden, call admin's handleQRScan directly
      if (window.adminManager && typeof window.adminManager.handleQRScan === "function") {
        window.adminManager.handleQRScan(decodedText);
        return;
      }
      // Fallback: clear loading state
      setTimeout(() => {
        this.hideScanLoader();
        this.processingScan = false;
      }, 1000);
      return;
    }

    // Home page handling - processQRCodeScan already handles this
    this.processQRCodeScan(decodedText);
  }

  showScanLoader(message = 'Scan en cours...') {
    const loaderId = this.containerId.includes('home') ? 'scan-loader-home' : 'scan-loader-admin';
    const loader = document.getElementById(loaderId);
    if (!loader) return;
    loader.style.display = 'flex';
    const msg = loader.querySelector('.scan-message');
    if (msg) msg.textContent = message;
    // Ensure spinner exists
    let spinner = loader.querySelector('.scan-spinner');
    if (!spinner) {
      spinner = document.createElement('div');
      spinner.className = 'scan-spinner';
      loader.insertBefore(spinner, loader.firstChild);
    }
  }

  hideScanLoader() {
    const loaderId = this.containerId.includes('home') ? 'scan-loader-home' : 'scan-loader-admin';
    const loader = document.getElementById(loaderId);
    if (loader) loader.style.display = 'none';
    
    const qrContainer = document.getElementById(this.containerId);
    if (qrContainer) {
      qrContainer.classList.remove('scanning');
    }
  }

  async delayedCleanup(delay = 1000) {
    await new Promise((resolve) => setTimeout(resolve, delay));
    await this.cleanupAndRestartCamera();
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
    } catch (err) {
      this.resetCameraState(); 
    }
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

  delay(ms) { 
    return new Promise(r => setTimeout(r, ms)); 
  }
}

// Expose
window.QRScannerManager = QRScannerManager;
