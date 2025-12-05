import express from "express";
import fetch from "node-fetch";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.static("public")); // index.html, script.js, style.css

app.get("/api/search", async (req, res) => {
  const { url } = req.query;
  
  if (!url) {
    return res.status(400).json({ error: "URL parameter is required" });
  }

  try {
    const response = await fetch(url);
    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error("Erro no servidor:", err);
    res.status(500).json({ error: "Erro ao buscar dados do Reddit" });
  }
});

app.listen(3000, () => console.log("Servidor rodando em http://localhost:3000"));