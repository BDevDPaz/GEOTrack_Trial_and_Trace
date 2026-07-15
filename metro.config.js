const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

/**
 * REGLA DE EXCLUSIÓN
 *
 * En Termux/Android es común alcanzar el límite de file watchers.
 * El error ENOSPC no significa falta de espacio en disco, sino límite de
 * archivos/carpetas observadas por el sistema mediante watchers/inotify.
 *
 * Expo/Metro puede llegar a ese límite al vigilar rutas dentro de node_modules.
 * La solución ideal suele ser aumentar el límite del sistema o usar Watchman,
 * pero en Termux normalmente conviene reducir lo que Metro intenta observar.
 *
 * Importante:
 * - No excluimos todo node_modules.
 * - Solo bloqueamos carpetas nativas/pesadas o de testing/docs/examples.
 * - Evitamos usar metro-config/src/defaults/exclusionList porque tu versión
 *   de metro-config no exporta ese subpath.
 */
config.resolver.blockList =
  /.*?:(?:.*?:android|ios|example|examples|docs|__tests__|test|tests[/\\].*|(?:(?:@testing-library|@sinclair|jest|jest-expo)[/\\].*)).*/;

/**
 * Necesario para expo-sqlite en web.
 *
 * Tu error anterior venía de:
 * node_modules/expo-sqlite/web/worker.ts
 * import wasmModule from './wa-sqlite/wa-sqlite.wasm'
 *
 * Expo SQLite web necesita que Metro soporte archivos .wasm.
 */
if (!config.resolver.assetExts.includes("wasm")) {
  config.resolver.assetExts.push("wasm");
}

/**
 * Headers requeridos para SharedArrayBuffer en web.
 *
 * Esto no afecta el APK Android nativo, pero ayuda cuando Metro prepara web.
 */
const originalEnhanceMiddleware = config.server?.enhanceMiddleware;

config.server = {
  ...config.server,
  enhanceMiddleware: (middleware, server) => {
    const enhancedMiddleware = originalEnhanceMiddleware
      ? originalEnhanceMiddleware(middleware, server)
      : middleware;

    return (req, res, next) => {
      res.setHeader("Cross-Origin-Embedder-Policy", "credentialless");
      res.setHeader("Cross-Origin-Opener-Policy", "same-origin");

      return enhancedMiddleware(req, res, next);
    };
  },
};

module.exports = config;
