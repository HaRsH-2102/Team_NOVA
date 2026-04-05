const express = require('express');
const app = express();

// Middleware to parse JSON bodies
app.use(express.json());

// Routes
app.post('/login', (req, res) => {
    res.json({ message: 'Login Successful' });
});

app.get('/balance', (req, res) => {
    res.json({ balance: 5000 });
});

app.post('/transfer', (req, res) => {
    res.json({ message: 'Transfer Successful' });
});

const PORT = 8080;
app.listen(PORT, () => {
    console.log(`Backend Banking API running on port ${PORT}`);
});
