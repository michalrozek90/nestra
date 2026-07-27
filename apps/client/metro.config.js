const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

const tauriSourceIgnore = /[/\\]apps[/\\]desktop[/\\]src-tauri[/\\].*/;
const existingBlockList = config.resolver.blockList;

config.resolver.blockList = existingBlockList
  ? Array.isArray(existingBlockList)
    ? [...existingBlockList, tauriSourceIgnore]
    : [existingBlockList, tauriSourceIgnore]
  : [tauriSourceIgnore];

module.exports = config;
