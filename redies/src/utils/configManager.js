let config = {};

function setConfig(newConfig) {
  config = newConfig;
}

function getConfig() {
  return config;
}

module.exports = { setConfig, getConfig };