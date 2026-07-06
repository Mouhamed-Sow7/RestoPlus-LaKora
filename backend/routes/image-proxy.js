// ═══════════════════════════════════════════════════════════════════════════
// IMAGE PROXY — Résoudre les problèmes CORS et CSP
// Sert les images externes via le backend RestoPlus (fetch natif Node 18+)
// ═════════════════════════════════════════════════════════════════════════

const express = require("express");
const router = express.Router();

// Cache simple en mémoire
const imageCache = new Map();
const CACHE_TTL = 3600000; // 1 heure en ms

/**
 * GET /api/proxy-image
 * Query params:
 *  - url: URL externe de l'image (requise)
 *  - w: largeur (optionnel, défaut 400)
 *  - q: qualité (optionnel, défaut 80)
 *
 * Exemple:
 *  /api/proxy-image?url=https://images.unsplash.com/photo-123&w=800&q=90
 */
router.get("/proxy-image", async (req, res) => {
  try {
    const { url, w = 400, q = 80 } = req.query;

    if (!url) {
      return res.status(400).json({ error: "Missing 'url' parameter" });
    }

    // Validation : URL doit être d'un domaine approuvé
    const allowedDomains = [
      "images.unsplash.com",
      "source.unsplash.com",
      "picsum.photos",
      "via.placeholder.com",
      "api.qrserver.com",
    ];

    let urlObj;
    try {
      urlObj = new URL(url);
    } catch {
      return res.status(400).json({ error: "Invalid URL format" });
    }

    if (!allowedDomains.some((d) => urlObj.hostname.includes(d))) {
      return res.status(403).json({
        error: "Domain not allowed",
        allowed: allowedDomains,
      });
    }

    // Vérifier le cache
    const cacheKey = `${url}_${w}_${q}`;
    const cachedData = imageCache.get(cacheKey);
    if (
      cachedData &&
      Date.now() - cachedData.timestamp < CACHE_TTL
    ) {
      res.set("Content-Type", cachedData.contentType);
      res.set("Cache-Control", "public, max-age=86400");
      res.set("X-Cache", "HIT");
      return res.send(cachedData.buffer);
    }

    // Optim Unsplash : ajouter les params
    let finalUrl = url;
    if (url.includes("unsplash.com")) {
      const separator = url.includes("?") ? "&" : "?";
      finalUrl = `${url}${separator}w=${w}&q=${q}&fit=crop`;
    }

    // Fetch l'image avec timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    let response;
    try {
      response = await fetch(finalUrl, {
        signal: controller.signal,
        headers: {
          "User-Agent": "RestoPlus/1.0 (+https://restoplus.sn)",
        },
      });
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      console.warn(
        `[IMAGE-PROXY] Failed to fetch ${finalUrl}: ${response.status}`,
      );
      return res.status(response.status).json({
        error: "Failed to fetch image from external source",
        status: response.status,
      });
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const contentType = response.headers.get("content-type") || "image/jpeg";

    // Cacher l'image
    imageCache.set(cacheKey, {
      buffer,
      contentType,
      timestamp: Date.now(),
    });

    // Nettoyer le cache si trop gros (> 100 entrées)
    if (imageCache.size > 100) {
      const firstKey = imageCache.keys().next().value;
      imageCache.delete(firstKey);
    }

    // Répondre avec les headers appropriés
    res.set("Content-Type", contentType);
    res.set("Cache-Control", "public, max-age=86400");
    res.set("Access-Control-Allow-Origin", "*");
    res.set("X-Cache", "MISS");
    res.send(buffer);
  } catch (error) {
    console.error("[IMAGE-PROXY] Error:", error.message);

    // Répondre avec erreur
    res.status(500).json({
      error: "Failed to proxy image",
      details:
        process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

module.exports = router;
