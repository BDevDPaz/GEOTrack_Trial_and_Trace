const { getDefaultConfig } = require('expo/metro-config');

module.exports = (() => {
  const config = getDefaultConfig(__dirname);

//  config.watcher = {
//    usePolling: true,
//    interval: 200,
//    throttle: 100,
  };

  config.resolver.blockList = [
    /.*\/\.idea\/.*/,
    /.*\/__tests__\/.*/,
    /.*\/docs\/.*/,
    /.*\/coverage\/.*/,
  ];

  return config;
})();
