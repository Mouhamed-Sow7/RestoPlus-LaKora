// QR Code Generation for RestoPlus (David Shim QRCode.js)

class QRGenerator {
  constructor() {
    this.init();
  }

  init() {
    console.log("QR Generator initialized (local version)");
  }

  static generateQRCode(element, data, options = {}) {
    const defaultOptions = {
      text: data,
      width: 200,
      height: 200,
      colorDark: "#000000",
      colorLight: "#FFFFFF",
      correctLevel: QRCode.CorrectLevel.H, // niveau de correction d'erreur
    };

    const finalOptions = { ...defaultOptions, ...options };

    // Supprime l'ancien contenu si présent
    element.innerHTML = "";

    // Génération du QR code
    try {
      new QRCode(element, finalOptions);
      return Promise.resolve();
    } catch (error) {
      return Promise.reject(error);
    }
  }

  // Optionnel : SVG non supporté nativement par cette version, on peut juste générer en Canvas/Div
  static generateQRCodeSVG(element, data, options = {}) {
    console.warn(
      "SVG QR generation not supported in local version, using canvas instead"
    );
    return QRGenerator.generateQRCode(element, data, options);
  }
}

// Export for global use
window.QRGenerator = QRGenerator;
