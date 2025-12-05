// server.js (CORRIGIDO)

import express from "express";
import fetch from "node-fetch";
import cors from "cors";

const app = express();
app.use(cors());

// 🛑 LINHA REMOVIDA: app.use(express.static("public")); 
// O Vercel já lida com o frontend estático

app.get("/api/search", async (req, res) => {
  const { url } = req.query;
  
  if (!url) {
    return res.status(400).json({ error: "URL parameter is required" });
  }

  try {
    // Usa o node-fetch para fazer a requisição proxy
    const response = await fetch(url);
    
    // Se a API do Reddit retornar um erro (e não JSON válido), o Vercel não pode processar.
    if (!response.ok) {
        // Tenta ler o erro como texto, se possível, ou retorna o status
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

// 🛑 LINHA REMOVIDA: app.listen(3000, ...); 
// O Vercel usa funções serverless e não precisa dessa porta

// Exporta o app (Express) para o Vercel
export default app;