const { withProjectBuildGradle } = require('expo/config-plugins');

const KSP_VERSION = '2.0.21-1.0.28';
const MARKER = '// ksp-version-fix (plugins/withKspVersion.js)';

const withKspVersion = (config) => {
  return withProjectBuildGradle(config, (mod) => {
    if (mod.modResults.language !== 'groovy') {
      throw new Error('withKspVersion: expected groovy build.gradle');
    }

    let contents = mod.modResults.contents;
    if (contents.includes(MARKER)) {
      return mod;
    }

    const block = `\n${MARKER}\next {\n  kspVersion = "${KSP_VERSION}"\n}\n`;
    mod.modResults.contents = contents.trimEnd() + block;
    return mod;
  });
};

module.exports = withKspVersion;
