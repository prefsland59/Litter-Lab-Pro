// Custom Metro config for Litter Lab Pro web support
// Required for expo-sqlite web (wa-sqlite.wasm)
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add .wasm to asset extensions so Metro can bundle wa-sqlite.wasm
config.resolver.assetExts.push('wasm');

// Ensure .wasm is not treated as a source file
if (!config.resolver.sourceExts) {
  config.resolver.sourceExts = [];
}

module.exports = config;
