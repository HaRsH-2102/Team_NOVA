const express = require("express");

const app = express();

// Middleware to read JSON data
app.use(express.json());

// Test API 1
app.get("/getAllUsers", (req, res) => {
  res.json({
    users: ["Aniket", "Rahul", "Amit"],
    message: "Users fetched successfully"
  });
});

// Test API 2 (Sensitive endpoint)
app.post("/login", (req, res) => {
  const { username, password } = req.body;

  res.json({
    message: "Login successful",
    user: username
  });
});

// Start server
app.listen(8080, () => {
  console.log("✅ Backend server running on http://localhost:8080");
});