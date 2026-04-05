const config = require("../config/config.json");

module.exports = async (req, res) => {
  try {
    const backendURL = config.server.backend_url;

    console.log("➡️ Forwarding to:", backendURL + req.url);

    const options = {
      method: req.method,
      headers: {
        "content-type": "application/json"
      }
    };

    // Attach body only when needed
    if (["POST", "PUT", "PATCH"].includes(req.method)) {
      options.body = JSON.stringify(req.body);
    }

    const response = await fetch(backendURL + req.url, options);

    const data = await response.text();

    res.status(response.status).send(data);

  } catch (error) {
    console.error("❌ Proxy Error:", error.message);
    res.status(500).send("Proxy Server Error");
  }
};