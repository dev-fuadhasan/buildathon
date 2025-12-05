import express from "express";
import Groq from "groq-sdk";

const router = express.Router();

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

router.post("/ask", async (req, res) => {
  try {
    const { userMessage, medicalProfile } = req.body;

    const systemPrompt = `
You are MomsCare, an AI assistant helping pregnant mothers. 
Use medical profile when available:
${JSON.stringify(medicalProfile)}
Always respond safely, clearly, and with empathy.
Never provide harmful suggestions.
    `;

    const completion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage }
      ],
      model: "openai/gpt-oss-20b"
    });

    res.json({
      reply: completion.choices[0]?.message?.content || ""
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

