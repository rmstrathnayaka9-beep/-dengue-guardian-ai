
import express from "express";
import { GoogleGenAI } from "@google/genai";

const app = express();
const PORT = process.env.PORT || 10000;

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY
});

app.use(express.json({ limit: "8mb" }));
app.use(express.static("public"));

app.get("/api/health", (req, res) => {
  res.json({ status: "Dengue Guardian AI online" });
});

app.post("/api/analyze", async (req, res) => {
  try {
    const { image, mimeType } = req.body;

    if (!image || !mimeType) {
      return res.status(400).json({
        error: "Image is required"
      });
    }

    if (!["image/jpeg", "image/png", "image/webp"].includes(mimeType)) {
      return res.status(400).json({
        error: "Unsupported image format"
      });
    }

    if (typeof image !== "string" || image.length > 7_000_000) {
      return res.status(400).json({
        error: "Image is too large"
      });
    }

    const result = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: [
        {
          inlineData: {
            mimeType,
            data: image
          }
        },
        {
          text: `Analyze this photograph for a school dengue prevention
project.

Choose exactly one classification:
WATER_WITH_LARVAE
WATER_NO_LARVAE
OTHER

Only report larvae if there is visible evidence.
Do not assume that all standing water contains larvae.
If the image is unclear, choose OTHER.

Return JSON only:
{
  "classification": "OTHER",
  "explanation": "Short explanation"
}

Do not claim that the water is medically confirmed safe.`
        }
      ],
      config: {
        responseMimeType: "application/json",
        temperature: 0.1
      }
    });

    const answer = JSON.parse(result.text);

    const allowed = [
      "WATER_WITH_LARVAE",
      "WATER_NO_LARVAE",
      "OTHER"
    ];

    if (!allowed.includes(answer.classification)) {
      throw new Error("Invalid AI classification");
    }

    res.json(answer);

  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "AI analysis failed. Please try again."
    });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log("Dengue Guardian AI running on port " + PORT);
});
