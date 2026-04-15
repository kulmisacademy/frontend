const { z } = require("zod");
const storeModel = require("../models/store.model");
const {
  getEffectivePlanRow,
  planRowToLimits,
  effectiveAiDailyUsed,
} = require("../lib/store-effective-plan");

const outputSchema = z.object({
  title: z.string().min(1).max(300),
  description: z.string().max(8000),
  features: z.array(z.string().max(200)).min(1).max(8),
});

function extractJsonObject(text) {
  const t = String(text || "").trim();
  const fenced = /^```(?:json)?\s*([\s\S]*?)```$/m.exec(t);
  const inner = fenced ? fenced[1].trim() : t;
  const start = inner.indexOf("{");
  const end = inner.lastIndexOf("}");
  if (start >= 0 && end > start) {
    return inner.slice(start, end + 1);
  }
  return inner;
}

/** OpenAI vision accepts only png, jpeg, gif, webp — sniff bytes so mislabeled uploads still work */
function resolveVisionMime(buffer, reportedMime, originalname = "") {
  const lower = (reportedMime || "").toLowerCase();
  const ext = (originalname && originalname.includes("."))
    ? originalname.slice(originalname.lastIndexOf(".")).toLowerCase()
    : "";

  if (lower === "image/jpg" || lower === "image/pjpeg") return "image/jpeg";

  if (!buffer || buffer.length < 12) return null;

  const headUtf8 = buffer.slice(0, 256).toString("utf8").trimStart();
  if (/^<\?xml|^<svg/i.test(headUtf8)) {
    return "unsupported-svg";
  }

  const b = buffer;
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (
    b[0] === 0x89 &&
    b[1] === 0x50 &&
    b[2] === 0x4e &&
    b[3] === 0x47
  ) {
    return "image/png";
  }
  if (b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x38) {
    return "image/gif";
  }
  if (
    b[0] === 0x52 &&
    b[1] === 0x49 &&
    b[2] === 0x46 &&
    b[3] === 0x46 &&
    b.length >= 12 &&
    b[8] === 0x57 &&
    b[9] === 0x45 &&
    b[10] === 0x42 &&
    b[11] === 0x50
  ) {
    return "image/webp";
  }

  // ISO BMFF (common for HEIC/HEIF/AVIF)
  if (
    b[4] === 0x66 &&
    b[5] === 0x74 &&
    b[6] === 0x79 &&
    b[7] === 0x70 &&
    b.length >= 12
  ) {
    const brand = b.slice(8, 12).toString("ascii");
    if (/heic|heix|hevc|heim|heis|mif1|msf1/i.test(brand)) {
      return "unsupported-heic";
    }
    if (/avif|avis/i.test(brand)) {
      return "unsupported-avif";
    }
  }

  if (/\.(jpe?g)$/i.test(ext) && b[0] === 0xff && b[1] === 0xd8) {
    return "image/jpeg";
  }
  if (/\.png$/i.test(ext) && b[0] === 0x89) return "image/png";
  if (/\.webp$/i.test(ext)) return "image/webp";

  const allowed = ["image/png", "image/jpeg", "image/gif", "image/webp"];
  if (allowed.includes(lower)) return lower;

  return null;
}

/**
 * POST /api/ai/generate-product
 * multipart field: image (single file)
 */
async function generateProduct(req, res) {
  try {
    const file = req.file;
    if (!file || !file.buffer) {
      return res.status(400).json({ error: "Image is required (field name: image)" });
    }

    const store = await storeModel.findByUserId(req.user.id);
    if (!store) {
      return res.status(403).json({ error: "Vendor store required for AI generation" });
    }
    const planRow = await getEffectivePlanRow(store);
    const limits = planRowToLimits(planRow);
    if (limits.maxAiDaily != null) {
      const usedToday = effectiveAiDailyUsed(store);
      if (usedToday >= limits.maxAiDaily) {
        return res.status(403).json({
          error:
            "You have reached your daily AI limit for your plan. Try again tomorrow (UTC) or upgrade.",
          code: "PLAN_LIMIT_AI_DAILY",
        });
      }
    } else if (
      limits.maxAiGenerations !== Infinity &&
      limits.maxAiGenerations != null &&
      (store.ai_generations_used ?? 0) >= limits.maxAiGenerations
    ) {
      return res.status(403).json({
        error:
          "You have reached your AI usage limit for your plan. Upgrade to continue.",
        code: "PLAN_LIMIT_AI",
      });
    }

    const apiKey = (process.env.OPENAI_API_KEY || "").trim();
    if (!apiKey) {
      return res.status(503).json({
        error: "AI is not configured",
        hint: "Set OPENAI_API_KEY in backend/.env.local and restart the API.",
      });
    }

    const resolved = resolveVisionMime(
      file.buffer,
      file.mimetype,
      file.originalname || ""
    );

    if (resolved === "unsupported-heic") {
      return res.status(400).json({
        error:
          "HEIC/HEIF photos are not supported by the AI step. Export the photo as JPEG or PNG (Photos app: Share → Save as JPEG), then upload again.",
      });
    }
    if (resolved === "unsupported-avif") {
      return res.status(400).json({
        error:
          "AVIF images are not supported for AI. Please save as JPEG, PNG, GIF, or WebP and try again.",
      });
    }
    if (resolved === "unsupported-svg") {
      return res.status(400).json({
        error:
          "SVG files are not supported for AI. Export or save as PNG or JPEG and upload again.",
      });
    }

    if (!resolved) {
      return res.status(400).json({
        error:
          "Could not detect a supported image. Use PNG, JPEG, GIF, or WebP (iPhone: turn off “Most Compatible” or export a copy as JPEG).",
      });
    }

    const base64 = file.buffer.toString("base64");
    const dataUrl = `data:${resolved};base64,${base64}`;

    const rawLang = String(req.body?.language || "en")
      .trim()
      .toLowerCase();
    const langSomali =
      rawLang === "so" || rawLang === "somali" || rawLang === "som";

    const model = process.env.OPENAI_VISION_MODEL || "gpt-4o-mini";

    const systemEn =
      "You are an expert eCommerce copywriter. Reply with JSON only. Keys must be exactly: title, description, features (array of strings).";
    const systemSo =
      "Waxaad tahay qoraa khibrad leh oo eCommerce ah. Jawaab JSON oo keliya. Furayaasha waa: title, description, features (taxane string).";

    const userPromptEn = `Analyze this product photo for an online marketplace listing.

Rules:
- If you clearly recognize a specific real product (brand + model or distinctive retail item), use accurate, factual information.
- If the product is generic or unclear, write clean, realistic, professional copy that fits what you see—do not invent false brand names.
- Language: English only for all string values.

Return one JSON object:
- "title": short buyer-friendly name (max ~80 characters)
- "description": 2-4 plain-text sentences
- "features": array of 3-5 short benefit strings`;

    const userPromptSo = `Falanqee sawirka alaabta ee suuqa internetka.

Xeerarka:
- Haddii aad si cad u aqoonsato alaab dhab ah (sumad + qaab ama alaab caan ah), isticmaal macluumaad sax ah.
- Haddii ay tahay alaab caadi ah ama aan la hubin, qor qoraal nadiif ah oo macquul ah oo ku habboon waxa aad aragto—ha abuurin magacyo been abuur ah.
- Luqadda: Somali (qoraalka Latin) oo keliya dhammaan qiimayaasha string.

Soo celi hal JSON:
- "title": magac gaaban oo macaamiisha u fiican (~80 xaraf)
- "description": 2-4 weedho oo faahfaahin ah
- "features": taxane 3-5 faa'iido oo gaaban`;

    const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        max_tokens: 1100,
        temperature: 0.35,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: langSomali ? systemSo : systemEn,
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: langSomali ? userPromptSo : userPromptEn,
              },
              {
                type: "image_url",
                image_url: { url: dataUrl, detail: "low" },
              },
            ],
          },
        ],
      }),
    });

    const rawText = await openaiRes.text();
    let rawJson = null;
    try {
      rawJson = rawText ? JSON.parse(rawText) : null;
    } catch {
      return res.status(502).json({
        error: "Invalid response from AI provider",
        hint: rawText?.slice(0, 200),
      });
    }

    if (!openaiRes.ok) {
      const msg =
        rawJson?.error?.message ||
        rawJson?.error ||
        `OpenAI request failed (${openaiRes.status})`;
      return res.status(502).json({
        error: typeof msg === "string" ? msg : "OpenAI request failed",
      });
    }

    const content = rawJson?.choices?.[0]?.message?.content;
    if (!content || typeof content !== "string") {
      return res.status(502).json({ error: "Empty AI response" });
    }

    let parsed;
    try {
      parsed = JSON.parse(extractJsonObject(content));
    } catch (e) {
      console.error("[ai] JSON parse", e, content?.slice(0, 500));
      return res.status(502).json({ error: "Could not parse AI output" });
    }

    const validated = outputSchema.safeParse(parsed);
    if (!validated.success) {
      return res.status(502).json({
        error: "AI output did not match expected format",
        details: validated.error.flatten(),
      });
    }

    const { title, description, features } = validated.data;

    if (limits.maxAiDaily != null) {
      await storeModel.incrementAiGenerationsDaily(store.id, 1);
    } else {
      await storeModel.incrementAiGenerations(store.id, 1);
    }

    res.json({
      title: title.trim(),
      description: description.trim(),
      features: features.map((f) => f.trim()).filter(Boolean).slice(0, 8),
      language: langSomali ? "so" : "en",
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "AI generation failed" });
  }
}

module.exports = { generateProduct };
