const { getDefaultConfig } = require('expo/metro-config');
const config = getDefaultConfig(__dirname);

/**
 * REGLA DE EXCLUSIÓN
 * Evitamos vigilar carpetas de testing muy pesadas usando una sola Expresión Regular.
 * Esto ayuda a aliviar el límite de archivos en Termux sin romper importaciones.
 */
config.resolver.blockList = /node_modules\/(?:@testing-library|@sinclair|jest|jest-expo)\/.*/;

/**
 * Necesario para expo-sqlite en web.
 *
 * Tu error anterior venía de:
 * node_modules/expo-sqlite/web/worker.ts
 * import wasmModule from './wa-sqlite/wa-sqlite.wasm'
 *
 * Expo documenta que para usar expo-sqlite en web se debe configurar
 * Metro para soportar archivos .wasm.
 */
if (!config.resolver.assetExts.includes('wasm')) {
  config.resolver.assetExts.push('wasm');
}

/**
 * Headers requeridos para SharedArrayBuffer en web.
 *
 * Expo SQLite web requiere headers COEP/COOP cuando se usa en entorno web.
 * Esto no afecta el APK Android nativo, pero evita problemas cuando Metro
 * intenta preparar/bundlear web.
 */
const originalEnhanceMiddleware = config.server?.enhanceMiddleware;

config.server = {
  ...config.server,
  enhanceMiddleware: (middleware, server) => {
    const enhancedMiddleware = originalEnhanceMiddleware
      ? originalEnhanceMiddleware(middleware, server)
      : middleware;

    return (req, res, next) => {
      res.setHeader('Cross-Origin-Embedder-Policy', 'credentialless');
      res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');

      return enhancedMiddleware(req, res, next);
    };
  },
};

module.exports = config;

