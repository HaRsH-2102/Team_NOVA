// Import config loader
const { getConfig, startWatcher } = require('../configLoader');

// Start watcher
startWatcher();

// Print config every 5 seconds
setInterval(() => {
    console.log("Current Config:", getConfig());
}, 5000);