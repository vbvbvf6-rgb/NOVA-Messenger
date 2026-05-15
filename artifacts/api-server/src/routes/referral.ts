import { Router } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

const router = Router();

router.get("/referral/my-code", async (req, res) => {
  try {
    const uid = req.currentUserId;
    const rows = await db.execute(sql`SELECT referral_code FROM users WHERE id = ${uid}`);
    const user = rows.rows[0] as any;
    if (!user) return res.status(404).json({ error: "Пользователь не найден" });

    let code = user.referral_code;
    if (!code) {
      code = generateCode();
      await db.execute(sql`UPDATE users SET referral_code = ${code} WHERE id = ${uid}`);
    }

    const stats = await db.execute(sql`
      SELECT COUNT(*)::int AS invited FROM users WHERE referred_by = ${code}
    `);
    const invited = Number((stats.rows[0] as any)?.invited || 0);

    res.json({ code, invited, link: `https://${process.env.REPLIT_DEV_DOMAIN || "pulse-messenger.replit.app"}/register?ref=${code}` });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

router.get("/referral/leaderboard", async (req, res) => {
  try {
    const rows = await db.execute(sql`
      SELECT
        u.id,
        u.username,
        u.display_name,
        u.avatar_color,
        u.avatar_url,
        u.is_verified,
        u.has_prime,
        u.prime_tier,
        COUNT(r.id)::int AS invited_count
      FROM users u
      LEFT JOIN users r ON r.referred_by = u.referral_code
      WHERE u.is_bot = false AND u.referral_code IS NOT NULL
      GROUP BY u.id, u.username, u.display_name, u.avatar_color, u.avatar_url, u.is_verified, u.has_prime, u.prime_tier
      HAVING COUNT(r.id) > 0
      ORDER BY invited_count DESC
      LIMIT 50
    `);
    res.json(rows.rows);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

export { generateCode };
export default router;
