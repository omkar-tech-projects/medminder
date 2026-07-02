const { withAndroidManifest } = require('@expo/config-plugins');

/**
 * Sets android:forceDarkAllowed="false" on the <application> element so Android's
 * automatic Force Dark mode cannot invert background colours and make typed text
 * invisible (dark text on a darkened background). The app handles its own dark mode
 * via useColorScheme() + the theme store.
 */
module.exports = function withForceDarkDisabled(config) {
  return withAndroidManifest(config, (cfg) => {
    const app = cfg.modResults.manifest.application;
    if (Array.isArray(app)) {
      for (const a of app) {
        if (a.$) a.$['android:forceDarkAllowed'] = 'false';
      }
    } else if (app && app.$) {
      app.$['android:forceDarkAllowed'] = 'false';
    }
    return cfg;
  });
};
