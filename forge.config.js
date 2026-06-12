const path = require('path');
const webpack = require('webpack');

function buildPreload() {
  return new Promise((resolve, reject) => {
    const preloadConfig = require('./webpack.preload.config.js');
    webpack(preloadConfig, (err, stats) => {
      if (err) { reject(err); return; }
      if (stats.hasErrors()) {
        console.error(stats.toString());
        reject(new Error('Preload build failed'));
        return;
      }
      console.log('[Preload] ✓ Built to .webpack/main/preload.js');
      resolve();
    });
  });
}

module.exports = {
  packagerConfig: { asar: true },
  rebuildConfig: {},
  makers: [
    { name: '@electron-forge/maker-squirrel', config: {} },
    { name: '@electron-forge/maker-zip', platforms: ['darwin'] },
    { name: '@electron-forge/maker-deb' },
    { name: '@electron-forge/maker-rpm' },
  ],
  plugins: [
    {
      name: '@electron-forge/plugin-webpack',
      config: {
        mainConfig: './webpack.main.config.js',
        devContentSecurityPolicy: `default-src 'self' 'unsafe-inline' data: http://localhost:9000; script-src 'self' 'unsafe-eval' 'unsafe-inline' data: http://localhost:9000 ws://localhost:9000; style-src 'self' 'unsafe-inline' http://localhost:9000; font-src 'self' data: http://localhost:9000`,
        renderer: {
          config: './webpack.renderer.config.js',
          entryPoints: [
            {
              html: './src/index.html',
              js: './src/main.tsx',
              name: 'main_window',
              preload: {
                js: './src/preload.ts',
              },
            },
          ],
        },
      },
    },
  ],
};