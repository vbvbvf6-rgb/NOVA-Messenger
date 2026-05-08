import { Router } from "express";
import { db, usersTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { createHash } from "node:crypto";

const router = Router();

const hash = (pass: string) => createHash("sha256").update(pass).digest("hex");

router.post("/auth/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: "Укажите никнейм и пароль" });
    }
    const rows = await db.execute(
      sql`SELECT id, username, display_name, avatar_color, avatar_url, bio, status, status_text, is_verified, is_bot, created_at, balance, password_hash FROM users WHERE username = ${String(username)}`
    );
    const user = rows.rows[0] as any;
    if (!user) {
      return res.status(401).json({ error: "Неверный никнейм или пароль" });
    }
    if (!user.password_hash || user.password_hash !== hash(String(password))) {
      return res.status(401).json({ error: "Неверный никнейм или пароль" });
    }
    res.json({
      userId: user.id,
      user: {
        id: user.id,
        username: user.username,
        displayName: user.display_name,
        avatarColor: user.avatar_color,
        avatarUrl: user.avatar_url,
        bio: user.bio,
        status: user.status,
        statusText: user.status_text,
        isVerified: user.is_verified,
        balance: Number(user.balance ?? 0),
        createdAt: user.created_at,
      },
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

router.post("/auth/register", async (req, res) => {
  try {
    const { username, displayName, password } = req.body;
    if (!username || !displayName || !password) {
      return res.status(400).json({ error: "Заполните все поля" });
    }
    if (String(username).length < 3) {
      return res.status(400).json({ error: "Никнейм должен быть не менее 3 символов" });
    }
    if (String(password).length < 6) {
      return res.status(400).json({ error: "Пароль должен быть не менее 6 символов" });
    }

    const existing = await db.execute(
      sql`SELECT id FROM users WHERE username = ${String(username)}`
    );
    if ((existing.rows as any[]).length > 0) {
      return res.status(409).json({ error: "Этот никнейм уже занят" });
    }

    const COLORS = ["#3B82F6","#EC4899","#10B981","#F59E0B","#8B5CF6","#06B6D4","#EF4444","#F97316"];
    const color = COLORS[Math.floor(Math.random() * COLORS.length)];

    const result = await db.execute(
      sql`INSERT INTO users (username, display_name, avatar_color, status, password_hash, balance)
          VALUES (${String(username)}, ${String(displayName)}, ${color}, 'online', ${hash(String(password))}, 0)
          RETURNING id, username, display_name, avatar_color, status, created_at, balance`
    );
    const newUser = result.rows[0] as any;

    try {
      await db.execute(
        sql`INSERT INTO chat_members (chat_id, user_id, role, last_read_at) VALUES (2, ${newUser.id}, 'member', NOW()) ON CONFLICT DO NOTHING`
      );
    } catch {
    }

    res.status(201).json({
      userId: newUser.id,
      user: {
        id: newUser.id,
        username: newUser.username,
        displayName: newUser.display_name,
        avatarColor: newUser.avatar_color,
        status: newUser.status,
        balance: Number(newUser.balance ?? 0),
        createdAt: newUser.created_at,
      },
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

router.post("/auth/change-password", async (req, res) => {
  try {
    const uid = req.currentUserId;
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: "Укажите текущий и новый пароль" });
    }
    if (String(newPassword).length < 6) {
      return res.status(400).json({ error: "Новый пароль должен быть не менее 6 символов" });
    }
    const rows = await db.execute(sql`SELECT password_hash FROM users WHERE id = ${uid}`);
    const user = rows.rows[0] as any;
    if (!user || user.password_hash !== hash(String(currentPassword))) {
      return res.status(401).json({ error: "Неверный текущий пароль" });
    }
    await db.execute(sql`UPDATE users SET password_hash = ${hash(String(newPassword))} WHERE id = ${uid}`);
    res.json({ success: true, message: "Пароль успешно изменён" });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

export default router;
