// 🔹 Function to log successful requests
function logRequest(ip, method, path, status) {

    // Print log in consistent format
    console.log(`[LOG] ${ip} ${method} ${path} ${status}`);
}


// 🔹 Function to log blocked requests
function logBlocked(ip, method, path, reason) {

    // Print blocked log with reason
    console.log(`[BLOCKED] ${ip} ${method} ${path} ${reason}`);
}


// Export both functions so proxy.js can use them
module.exports = {
    logRequest,
    logBlocked
};