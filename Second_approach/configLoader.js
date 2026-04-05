// Import built-in 'fs' module to read files from disk
const fs = require('fs');

// Import 'path' module to safely handle file paths
const path = require('path');

// Import node-watch to watch files for changes
const watch = require('node-watch');


// Create a variable to store config in memory
// This prevents re-reading the file on every request
let config = null;


// Create absolute path to config.json
// __dirname = current folder (proxy-project)
const configPath = path.join(__dirname, 'config.json');


// 🔹 Function to load config from file
function loadConfig() {
    try {
        // Read file content as string
        const fileData = fs.readFileSync(configPath, 'utf-8');

        // Convert JSON string into JavaScript object
        config = JSON.parse(fileData);

        // Log success message with timestamp
        console.log(`[Config] Config loaded at ${new Date().toISOString()}`);
    } catch (err) {
        // If error occurs (invalid JSON, file missing)
        console.error('[Config] Failed to load config:', err.message);
    }
}


// 🔹 Function to get current config (used by other files)
function getConfig() {
    return config; // Return in-memory config object
}


// 🔹 Function to start watching config.json for changes
function startWatcher() {
    // Start watching the config file
    watch(configPath, (eventType, filename) => {
        // eventType can be 'update' or 'remove'

        // Only reload if file was updated
        if (eventType === 'update') {
            // Reload config from file
            loadConfig();

            // Print reload message with timestamp
            console.log(`[Config] Config reloaded at ${new Date().toISOString()}`);
        }
    });
}


// 🔹 Load config immediately when this file is first required
// So config is available at startup
loadConfig();


// Export functions so other files can use them
module.exports = {
    getConfig,      // Function to access config anytime
    startWatcher    // Function to start file watching
};