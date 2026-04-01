const path = require('path');

module.exports = {
  packagerConfig: {
    asar: true,
  },
  rebuildConfig: {},
  makers: [
    {
      name: '@electron-forge/maker-squirrel',
      config: {},
    },
    {
      name: '@electron-forge/maker-zip',
      platforms: ['darwin'],
    },
    {
      name: '@electron-forge/maker-deb',
    },
    {
      name: '@electron-forge/maker-rpm',
    },
  ],
  plugins: [
    {
      name: '@electron-forge/plugin-webpack',
      config: {
        mainConfig: path.join(__dirname, 'webpack.main.config.js'),
        renderer: {
          config: path.join(__dirname, 'webpack.renderer.config.js'),
          entryPoints: [
            {
              html: path.join(__dirname, 'src/index.html'),
              js: path.join(__dirname, 'src/main.tsx'),
              name: 'main_window',
              preload: {
                js: path.join(__dirname, 'src/preload.ts'),
              },
            },
          ],
        },
      },
    },
  ],
};
