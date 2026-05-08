import { Router } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

const router = Router();

const BOT_USERNAME = "deepseek_ai";

router.post("/ai/chat", async (req, res) => {
  try {
    const apiKey = process.env["OPENROUTER_API_KEY"];

    if (!apiKey) {
      return res.status(503).json({ error: "AI недоступен. Администратор должен добавить OPENROUTER_API_KEY." });
    }

    const { message, history } = req.body;
    if (!message) {
      return res.status(400).json({ error: "Сообщение обязательно" });
    }

    const messages = [
      {
        role: "system",
        content: "Ты — дружелюбный и умный ИИ-помощник в мессенджере Pulse. Отвечай кратко, по существу и преимущественно на русском языке, если пользователь пишет по-русски. Ты умеешь помогать с любыми вопросами."
      },
      ...(Array.isArray(history) ? history.slice(-10) : []),
      { role: "user", content: message }
    ];

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
        "HTTP-Referer": "https://pulse-messenger.replit.app",
        "X-Title": "Pulse Messenger"
      },
      body: JSON.stringify({
        model: "google/gemini-flash-1.5",
        messages,
        max_tokens: 800,
        temperature: 0.7,
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      req.log.error({ status: response.status, errText }, "OpenRouter API error");
      return res.status(502).json({ error: "Ошибка AI сервиса. Попробуйте позже." });
    }

    const data = await response.json() as any;
    const reply = data.choices?.[0]?.message?.content || "Не удалось получить ответ.";

    res.json({ reply });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

router.get("/ai/bot-user", async (req, res) => {
  try {
    const rows = await db.execute(
      sql`SELECT id, username, display_name, avatar_color, is_bot, is_verified FROM users WHERE username = ${BOT_USERNAME}`
    );
    const bot = rows.rows[0] as any;
    if (!bot) return res.status(404).json({ error: "Бот не найден" });
    res.json({
      id: bot.id,
      username: bot.username,
      displayName: bot.display_name,
      avatarColor: bot.avatar_color,
      isBot: bot.is_bot,
      isVerified: bot.is_verified,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

export default router;
