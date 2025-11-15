import express from "express";
import multer from "multer";
import fetch from "node-fetch";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

const OPENAI_KEY = process.env.OPENAI_API_KEY;
const DEEPL_KEY = process.env.DEEPL_AUTH_KEY;

app.use(express.static("public"));

// Vision + Translate endpoint
app.post("/api/analyze", upload.single("photo"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No photo uploaded." });

    const mime = req.file.mimetype;
    const base64 = req.file.buffer.toString("base64");
    const dataUri = `data:${mime};base64,${base64}`;

    // 1) Vision
    const aiResp = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o-mini-vision",
        input: [
          {
            role: "user",
            content: [
              { type: "input_text", text: "Geef JSON: [{label, description}] van belangrijke objecten." },
              { type: "input_image", image_url: dataUri }
            ]
          }
        ],
        temperature: 0
      })
    });

    const aiJson = await aiResp.json();
    let raw = "";
    try { raw = aiJson.output.map(o => o.content).join(" "); }
    catch { raw = JSON.stringify(aiJson); }

    let labels = [];
    try {
      const m = raw.match(/\[[\s\S]*\]/);
      labels = JSON.parse(m[0]);
    } catch {
      labels = [{ label: "onbekend", description: "Kon niet worden herkend" }];
    }

    // 2) Vertalen naar Spaans
    const toTranslate = labels.map(l => l.label).join("\n");

    const body = new URLSearchParams();
    body.append("text", toTranslate);
    body.append("target_lang", "ES");

    const deeplResp = await fetch("https://api-free.deepl.com/v2/translate", {
      method: "POST",
      headers: {
        "Authorization": `DeepL-Auth-Key ${DEEPL_KEY}`,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body
    });

    const deeplJson = await deeplResp.json();
    const translations = deeplJson.translations.map(t => t.text);

    const out = labels.map((l, i) => ({
      ...l,
      translation: translations[i] || translations[0]
    }));

    return res.json({ ok: true, labels: out });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log(`🚀 Website: http://localhost:${PORT}`)
);
