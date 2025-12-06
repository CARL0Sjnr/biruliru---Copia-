// server.js (COMMONJS CORRIGIDO)

const express = require("express");
const fetch = require("node-fetch");
const cors = require("cors");

const app = express();
app.use(cors());

app.get("/api/search", async (req, res) => {
  const { url } = req.query;
  
  if (!url) {
    return res.status(400).json({ error: "URL parameter is required" });
  }

  try {
    // Usa o node-fetch para fazer a requisição proxy
    const response = await fetch(url);
    
    if (!response.ok) {
        const errorText = await response.text();
        console.warn(`Reddit retornou status ${response.status}: ${errorText.substring(0, 100)}...`);
        return res.status(response.status).json({ error: "Erro na API externa", status: response.status });
    }

    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error("Erro no servidor:", err);
    res.status(500).json({ error: "Erro interno no proxy ao processar a resposta" });
  }
});

// Exporta o app (Express) usando CommonJS
module.exports = app;