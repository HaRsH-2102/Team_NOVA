// Import express module to create server easily
const express = require('express');

// Create an Express app instance
const app = express();

// Middleware to parse JSON body from requests
// This allows us to read req.body
app.use(express.json());


// 🔹 Middleware to log every request
app.use((req, res, next) => {
    // Print method and path
    console.log(`[BACKEND] ${req.method} ${req.url}`);
    
    // Move to next middleware/route
    next();
});


// 🔹 GET /getAllUsers route
app.get('/getAllUsers', (req, res) => {
    // Create fake users array
    const users = [
        { id: 1, name: "Harshal" },
        { id: 2, name: "Rahul" },
        { id: 3, name: "Sneha" }
    ];

    // Send response as JSON
    res.json(users);
});


// 🔹 POST /login route
app.post('/login', (req, res) => {
    // Extract username and password from request body
    const { username, password } = req.body;

    // Simple check (mock authentication)
    if (username === "admin" && password === "1234") {
        // Success response
        res.json({ success: true, message: "Login successful" });
    } else {
        // Failure response
        res.status(401).json({ success: false, message: "Invalid credentials" });
    }
});


// 🔹 Catch-all route (for undefined routes)
app.use((req, res) => {
    // Return 404 for unknown routes
    res.status(404).json({ message: "Route not found" });
});


// 🔹 Start server on port 8080
app.listen(8080, () => {
    console.log("Mock Backend running on http://localhost:8080");
});


app.get('/ping', (req, res) => {
    res.json({ pong: true });
});

app.get('/slow', async (req, res) => {
    setTimeout(() => {
        res.json({ slow: true });
    }, 2000);
});