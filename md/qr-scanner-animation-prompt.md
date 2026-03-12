# Complete Prompt for QR Scanner Animation System

Create a complete QR code scanner interface with animated overlay and loading states. Here are the exact specifications:

## HTML STRUCTURE

```html
<div class="qr-scanner-container">
  <div class="qr-style-zone">
    <div class="scan-overlay">
      <div class="scan-frame">
        <div class="corner corner-top-left"></div>
        <div class="corner corner-top-right"></div>
        <div class="corner corner-bottom-left"></div>
        <div class="corner corner-bottom-right"></div>
        <div class="scan-line"></div>
      </div>
    </div>
    <div class="camera-off-content">
      <div class="camera-icon"></div>
      <div class="camera-instruction">Cliquez sur 'Activer Caméra' pour commencer</div>
    </div>
  </div>
  <div id="qr-reader" class="qr-camera-zone"></div>
</div>
```

## CONTAINER STYLES

- `.qr-scanner-container`: position relative, width 300px, height 300px, margin 0 auto, border-radius 16px, overflow hidden, display grid, place-items center
- `.qr-style-zone`: position absolute, inset 0, width 100%, height 100%, z-index 10, border-radius 16px, transition all 0.3s ease
- `.qr-camera-zone`: position absolute, inset 0, width 100%, height 100%, z-index 5, border-radius 16px, overflow hidden, opacity 0, pointer-events none (by default)

## CAMERA OFF STATE

- `.qr-style-zone.camera-off`: background rgba(102, 126, 234, 0.1), border 2px solid rgba(255, 255, 255, 0.2), box-shadow with inset, backdrop-filter blur(10px), display flex, align-items center, justify-content center
- `.camera-off-content`: text-align center, z-index 12, display block
- `.camera-icon`: width 80px, height 80px, background-image (camera icon), margin 0 auto 20px, filter drop-shadow
- `.camera-instruction`: color rgba(255, 255, 255, 0.9), font-size 14px, font-weight 500, background rgba(0, 0, 0, 0.3), padding 8px 16px, border-radius 20px, backdrop-filter blur(5px)

## CAMERA ACTIVE STATE

- `.qr-scanner-container.camera-active .qr-camera-zone`: opacity 1, pointer-events auto
- `.qr-scanner-container.camera-active .camera-off-content`: display none !important
- `.qr-style-zone:not(.camera-off)`: background transparent, border none, box-shadow none, pointer-events none

## SCAN OVERLAY (Visible when camera active, hidden when scanning)

- `.scan-overlay`: position absolute, top 0, left 0, width 100%, height 100%, pointer-events none, z-index 15, opacity 0 !important (default), transition opacity 0.3s ease
- `.qr-scanner-container.camera-active:not(.scanning) .scan-overlay`: opacity 1 !important
- `.qr-scanner-container.scanning .scan-overlay`: opacity 0 !important
- `.qr-style-zone.camera-off .scan-overlay`: opacity 0 !important

## SCAN FRAME

- `.scan-frame`: position absolute, top 50%, left 50%, transform translate(-50%, -50%), width 76%, height 76%, border-radius 8px, overflow hidden

## L-SHAPED CORNERS (Green #22c55e)

- `.corner`: position absolute, width 20px, height 20px, border 3px solid #22c55e, border-radius 2px
- `.corner-top-left`: top 0, left 0, no right/bottom borders, border-top-left-radius 8px
- `.corner-top-right`: top 0, right 0, no left/bottom borders, border-top-right-radius 8px
- `.corner-bottom-left`: bottom 0, left 0, no right/top borders, border-bottom-left-radius 8px
- `.corner-bottom-right`: bottom 0, right 0, no left/top borders, border-bottom-right-radius 8px

## ANIMATED SCAN LINE

- `.scan-line`: position absolute, top 0, left 0, width 100%, height 3px
- Background: linear-gradient(90deg, transparent 0%, #22c55e 20%, #4ade80 50%, #22c55e 80%, transparent 100%)
- Border-radius: 2px
- Box-shadow: 0 0 10px rgba(34, 197, 94, 0.8)
- Animation: scan-line-move 2s infinite linear

## SCAN LINE KEYFRAMES

```css
@keyframes scan-line-move {
  0% { top: 0; opacity: 0.9; }
  50% { opacity: 1; }
  100% { top: calc(100% - 3px); opacity: 0.9; }
}
```

## LOADING SPINNER (Shown during scanning)

- `.scan-loader`: position absolute, top 0, left 0, width 100%, height 100%, background rgba(0, 0, 0, 0.9), display flex, flex-direction column, align-items center, justify-content center, z-index 20, border-radius 16px
- `.scan-loader::before`: content "", width 50px, height 50px, border 3px solid rgba(34, 197, 94, 0.3), border-top 3px solid #22c55e, border-radius 50%, animation modern-spin 1s linear infinite, margin-bottom 15px, flex-shrink 0, display block
- `.scan-loader::after`: content "Scan en cours...", color #22c55e, font-size 16px, font-weight 600, text-align center, text-shadow 0 0 10px rgba(34, 197, 94, 0.5), white-space nowrap

## ALTERNATIVE LOADER WITH CUSTOM MESSAGE (for JavaScript injection)

- `.scan-loader .scan-spinner`: width 40px, height 40px, border 3px solid rgba(34, 197, 94, 0.3), border-top 3px solid #22c55e, border-radius 50%, animation modern-spin 1s linear infinite, margin-bottom 12px, flex-shrink 0, display block
- `.scan-loader .scan-message`: font-size 14px, font-weight 600, color #22c55e, white-space nowrap, max-width 180px, overflow hidden, text-overflow ellipsis, text-shadow 0 0 10px rgba(34, 197, 94, 0.5)

## SPINNER KEYFRAMES

```css
@keyframes modern-spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
```

## RESPONSIVE DESIGN

- **@media (max-width: 768px)**: container 260px × 260px, scan-frame 70% × 70%, corners 20px, loader::before 45px, loader::after font-size 14px
- **@media (max-width: 480px)**: container 280px × 280px, scan-frame 65% × 65%, corners 18px, loader::before 40px, loader::after font-size 13px

## BEHAVIOR

- Overlay visible only when camera is active AND not scanning
- Overlay hidden when scanning (showing loader instead)
- Loader appears with dark background (rgba(0, 0, 0, 0.9)) during scanning
- Scan line continuously moves top to bottom with opacity pulse
- Spinner rotates continuously at 1s per rotation
- All animations use green color scheme (#22c55e primary, #4ade80 highlight)

---

## JAVASCRIPT LOGIC & STATE MANAGEMENT

### AppState Object

```javascript
const AppState = {
  html5QrCode: null,           // Html5Qrcode instance
  isCameraActive: false,        // Camera on/off state
  isToggling: false,           // Prevents multiple simultaneous toggles
  isProcessingScan: false,     // Prevents multiple simultaneous scans
  // ... other app state
};
```

### Initialization

```javascript
static initialize() {
  const qrReader = document.getElementById("qr-reader");
  const qrContainer = document.querySelector(".qr-scanner-container");
  const qrStyleZone = document.querySelector(".qr-style-zone");

  if (!qrReader || !qrContainer || !qrStyleZone) return;

  // Initialize to OFF state
  qrStyleZone.classList.add("camera-off");
  qrContainer.classList.remove("camera-active", "scanning");

  // Initialize Html5Qrcode
  AppState.html5QrCode = new Html5Qrcode("qr-reader");
}
```

### Toggle Camera Function

```javascript
static async toggle() {
  const qrReader = document.getElementById("qr-reader");
  const qrContainer = document.querySelector(".qr-scanner-container");
  const qrStyleZone = document.querySelector(".qr-style-zone");
  const toggleBtn = document.getElementById("toggleCamBtn");

  // Prevent multiple simultaneous toggles
  if (!AppState.html5QrCode || AppState.isToggling) return;
  AppState.isToggling = true;

  try {
    if (AppState.html5QrCode.isScanning) {
      // DEACTIVATE CAMERA
      
      // Wait if scan is processing
      if (AppState.isProcessingScan) {
        await new Promise((resolve) => {
          const checkScanComplete = () => {
            if (!AppState.isProcessingScan) {
              resolve();
            } else {
              setTimeout(checkScanComplete, 100);
            }
          };
          checkScanComplete();
        });
      }

      await AppState.html5QrCode.stop();

      // Reset to OFF state
      qrStyleZone.classList.add("camera-off");
      qrContainer.classList.remove("camera-active", "scanning");
      toggleBtn.innerHTML = "🎥 Activer Caméra";
      AppState.isCameraActive = false;
      
    } else {
      // ACTIVATE CAMERA
      
      toggleBtn.innerHTML = "⏳ Chargement...";

      // Set minimum container size (iOS: 360px, others: 340px)
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      if (qrReader) {
        const min = isIOS ? 360 : 340;
        const currentW = qrReader.clientWidth || 0;
        const currentH = qrReader.clientHeight || 0;
        if (currentW < min) qrReader.style.width = min + "px";
        if (currentH < min) qrReader.style.height = min + "px";
      }

      // Get camera configuration
      const config = this.getCameraConfig();

      // Try simple start first (facingMode: "environment")
      let started = false;
      try {
        await AppState.html5QrCode.start(
          { facingMode: "environment" },
          config,
          this.onScanSuccess.bind(this),
          this.onScanFailure.bind(this)
        );
        started = true;
      } catch (simpleErr) {
        // Fallback to deviceId selection
        const devices = await Html5Qrcode.getCameras();
        if (devices && devices.length) {
          const preferred = this.selectBestCamera(devices, qrReader.dataset.lastCamera);
          await AppState.html5QrCode.start(
            { deviceId: preferred.id },
            config,
            this.onScanSuccess.bind(this),
            this.onScanFailure.bind(this)
          );
          qrReader.dataset.lastCamera = preferred.id;
          started = true;
        }
      }

      if (!started) {
        UIComponents.showPopup("Impossible d'activer la caméra", "error");
        toggleBtn.innerHTML = "🎥 Activer Caméra";
        AppState.isCameraActive = false;
        return;
      }

      // Activate ON state
      qrStyleZone.classList.remove("camera-off");
      qrContainer.classList.remove("scanning");
      qrContainer.classList.add("camera-active");
      toggleBtn.innerHTML = "⏹️ Désactiver Caméra";
      AppState.isCameraActive = true;
    }
  } catch (error) {
    console.error("Error toggling camera:", error);
    UIComponents.showPopup("Erreur lors de l'activation de la caméra", "error");
    this.resetCameraState();
  } finally {
    AppState.isToggling = false;
  }
}
```

### Camera Configuration (Size Management)

```javascript
static getCameraConfig() {
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

  if (isIOS) {
    // iOS: Simple configuration for better compatibility
    return {
      fps: 10,
      qrbox: 250,  // Square size in pixels
    };
  }

  // Other platforms: Full configuration
  return {
    fps: 10,
    qrbox: { width: 300, height: 300 },  // Square box dimensions
    aspectRatio: 1.0,
    disableFlip: false,
  };
}
```

### Camera Selection Logic

```javascript
static selectBestCamera(devices, lastCameraId) {
  // 1. Prefer back camera on mobile
  const backCamera = devices.find(
    (d) =>
      d.label.toLowerCase().includes("back") ||
      d.label.toLowerCase().includes("arrière") ||
      d.label.toLowerCase().includes("environment") ||
      d.label.toLowerCase().includes("rear") ||
      d.label.toLowerCase().includes("derrière")
  );
  if (backCamera) return backCamera;

  // 2. Prefer external cameras (CAMO, USB, etc.)
  const externalCamera = devices.find(
    (d) =>
      d.label.toLowerCase().includes("camo") ||
      d.label.toLowerCase().includes("external") ||
      d.label.toLowerCase().includes("usb") ||
      d.label.toLowerCase().includes("webcam")
  );
  if (externalCamera) return externalCamera;

  // 3. On mobile, avoid front camera
  const isMobile = window.innerWidth <= 768;
  if (isMobile) {
    const nonFrontCamera = devices.find(
      (d) =>
        !d.label.toLowerCase().includes("front") &&
        !d.label.toLowerCase().includes("avant") &&
        !d.label.toLowerCase().includes("user") &&
        !d.label.toLowerCase().includes("selfie")
    );
    if (nonFrontCamera) return nonFrontCamera;
  }

  // 4. Use last camera if available
  if (lastCameraId) {
    const lastCamera = devices.find((d) => d.id === lastCameraId);
    if (lastCamera) return lastCamera;
  }

  // 5. Default: first available camera
  return devices[0];
}
```

### Scan Success Handler (State Management)

```javascript
static async processQRCodeScan(decodedText) {
  // Prevent multiple simultaneous scans
  if (AppState.isProcessingScan) {
    console.log("⚠️ Scan déjà en cours, ignoré");
    return;
  }

  AppState.isProcessingScan = true;
  const qrContainer = document.querySelector(".qr-scanner-container");

  try {
    // STEP 1: Hide overlay, show loader
    if (qrContainer) {
      qrContainer.classList.add("scanning");  // Hides scan-overlay, shows loader
    }

    // STEP 2: Show loading spinner with message
    this.showScanLoader("Vérification en cours...");
    await new Promise((resolve) => setTimeout(resolve, 800));

    // STEP 3: Validate and process QR code
    let validationResult = this.validateQRCode(decodedText);
    if (!validationResult.valid) {
      this.showQRMessage(validationResult.error, "error");
      await this.delayedCleanup(1500);
      return;
    }

    // STEP 4: Process attendance
    this.showScanLoader("Agent trouvé, vérification du statut...");
    await this.processAgentAttendanceOptimized(validationResult.agentId);

  } catch (error) {
    console.error("❌ Erreur lors du traitement:", error);
    this.showQRMessage("Erreur - Problème de connexion", "error");
    await this.delayedCleanup(2000);
  } finally {
    AppState.isProcessingScan = false;
  }
}
```

### Show Scan Loader Function

```javascript
static showScanLoader(message = "Scan en cours...") {
  const qrContainer = document.querySelector(".qr-scanner-container");
  if (!qrContainer) return;

  // Remove existing loaders
  qrContainer.querySelectorAll(".scan-loader").forEach((el) => el.remove());

  // Create new loader with custom message
  const loaderElement = document.createElement("div");
  loaderElement.className = "scan-loader";
  loaderElement.innerHTML = `
    <div class="scan-spinner"></div>
    <div class="scan-message">${message}</div>
  `;

  qrContainer.appendChild(loaderElement);
}
```

### Reset Camera State Function

```javascript
static resetCameraState() {
  const qrContainer = document.querySelector(".qr-scanner-container");
  const qrStyleZone = document.querySelector(".qr-style-zone");
  const toggleBtn = document.getElementById("toggleCamBtn");

  AppState.isCameraActive = false;
  
  if (qrContainer && qrStyleZone) {
    // Return to OFF state
    qrStyleZone.classList.add("camera-off");
    qrContainer.classList.remove("camera-active", "scanning");
    
    // Remove all temporary loaders
    qrContainer.querySelectorAll(".scan-loader").forEach((el) => el.remove());
  }
  
  if (toggleBtn) toggleBtn.innerHTML = "🎥 Activer Caméra";
}
```

### Cleanup and Restart After Scan

```javascript
static async delayedCleanup(delay = 1000) {
  await new Promise((resolve) => setTimeout(resolve, delay));
  await this.cleanupAndRestartCamera();
}

static async cleanupAndRestartCamera() {
  const qrContainer = document.querySelector(".qr-scanner-container");
  const qrReader = document.getElementById("qr-reader");

  try {
    // Stop current camera
    if (AppState.html5QrCode && AppState.html5QrCode.isScanning) {
      await AppState.html5QrCode.stop();
    }

    // Clear qr-reader content
    qrReader.innerHTML = "";

    // Wait for DOM update
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Rebuild scan zone
    await this.rebuildScanZone();

    // Restart camera
    await this.restartCameraAfterRebuild();

    // Remove scanning class to show overlay again
    qrContainer.classList.remove("scanning");

    // Remove loader
    qrContainer.querySelectorAll(".scan-loader").forEach((el) => el.remove());

  } catch (error) {
    console.error("❌ Erreur lors de la reconstruction:", error);
    this.resetCameraState();
  }
}
```

### Global Toggle Function (HTML onclick)

```javascript
// Safe toggleCam function with fallback
window.toggleCam = function () {
  if (QRScannerManager && typeof QRScannerManager.toggle === "function") {
    return QRScannerManager.toggle();
  } else {
    console.warn("QRScannerManager not available yet");
    if (window.UIComponents && window.UIComponents.showPopup) {
      window.UIComponents.showPopup(
        "Caméra non disponible pour le moment",
        "warning"
      );
    }
  }
};
```

### Class Management Summary

**State Classes:**
- `.camera-off` on `.qr-style-zone`: Shows camera icon and instruction, hides overlay
- `.camera-active` on `.qr-scanner-container`: Shows camera feed, hides camera-off-content, shows scan-overlay
- `.scanning` on `.qr-scanner-container`: Hides scan-overlay, shows scan-loader

**Class Toggle Flow:**
1. **Initial State**: `qr-style-zone` has `camera-off`, `qr-scanner-container` has no `camera-active` or `scanning`
2. **Camera Activated**: Remove `camera-off`, add `camera-active`
3. **QR Code Scanned**: Add `scanning` (hides overlay, shows loader)
4. **Scan Complete**: Remove `scanning` (shows overlay again)
5. **Camera Deactivated**: Add `camera-off`, remove `camera-active` and `scanning`

### Size Management Summary

1. **Container Size**: Fixed 300px × 300px (CSS), responsive: 260px (768px), 280px (480px)
2. **Minimum Reader Size**: Dynamically set to 340px (360px on iOS) if smaller
3. **QR Box Size**: 
   - iOS: 250px square
   - Others: 300px × 300px square
4. **Scan Frame**: 76% of container (responsive: 70% at 768px, 65% at 480px)

### Key Behaviors

- **Toggle Protection**: `isToggling` flag prevents multiple simultaneous toggles
- **Scan Protection**: `isProcessingScan` flag prevents multiple simultaneous scans
- **State Persistence**: Last camera ID stored in `qrReader.dataset.lastCamera`
- **Error Handling**: All errors reset to OFF state via `resetCameraState()`
- **Loader Messages**: Dynamic messages during scan processing (e.g., "Vérification en cours...", "Agent trouvé...")
- **Automatic Restart**: After scan completion, camera automatically restarts for next scan

