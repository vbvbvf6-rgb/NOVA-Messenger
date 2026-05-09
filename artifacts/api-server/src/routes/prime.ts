import { Router } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

const router = Router();

const PLANS: Record<string, { spark: number; months: number }> = {
  monthly:  { spark: 299,  months: 1 },
  halfyear: { spark: 1494, months: 6 },
  yearly:   { spark: 2388, months: 12 },
};

router.post("/prime/subscribe", async (req, res) => {
  try {
    const uid = req.currentUserId;
    const { planId } = req.body;
    const plan = PLANS[planId];
    if (!plan) {
      return res.status(400).json({ error: "Неверный план подписки" });
    }

    const rows = await db.execute(sql`SELECT balance, has_prime, prime_expires_at FROM users WHERE id = ${uid}`);
    const user = rows.rows[0] as any;
    if (!user) return res.status(404).json({ error: "Пользователь не найден" });

    const balance = Number(user.balance ?? 0);
    if (balance < plan.spark) {
      return res.status(400).json({
        error: `Недостаточно Spark. Нужно ${plan.spark} ⚡, у вас ${balance} ⚡`,
        required: plan.spark,
        balance,
      });
    }

    const now = new Date();
    const currentExpiry = user.prime_expires_at ? new Date(user.prime_expires_at) : now;
    const base = currentExpiry > now ? currentExpiry : now;
    const newExpiry = new Date(base);
    newExpiry.setMonth(newExpiry.getMonth() + plan.months);

    await db.execute(
      sql`UPDATE users
          SET balance = balance - ${plan.spark},
              has_prime = true,
              prime_expires_at = ${newExpiry.toISOString()}
          WHERE id = ${uid}`
    );

    const SIGNUP_BONUS = 50;
    const isFirstTime = !user.has_prime || user.has_prime === "f" || user.has_prime === false;
    if (isFirstTime) {
      await db.execute(sql`UPDATE users SET balance = balance + ${SIGNUP_BONUS} WHERE id = ${uid}`);
    }

    const updated = await db.execute(sql`SELECT balance FROM users WHERE id = ${uid}`);
    const newBalance = Number((updated.rows[0] as any)?.balance ?? 0);

    res.json({
      success: true,
      balance: newBalance,
      primeExpiresAt: newExpiry.toISOString(),
      bonusAwarded: isFirstTime ? SIGNUP_BONUS : 0,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

router.get("/prime/status", async (req, res) => {
  try {
    const uid = req.currentUserId;
    const rows = await db.execute(sql`SELECT has_prime, prime_expires_at FROM users WHERE id = ${uid}`);
    const user = rows.rows[0] as any;
    if (!user) return res.status(404).json({ error: "Пользователь не найден" });

    const hasPrime = user.has_prime === true || user.has_prime === "t";
    const expiresAt = user.prime_expires_at ?? null;
    const isActive = hasPrime && expiresAt && new Date(expiresAt) > new Date();

    if (hasPrime && expiresAt && !isActive) {
      await db.execute(sql`UPDATE users SET has_prime = false WHERE id = ${uid}`);
    }

    res.json({ hasPrime: isActive, primeExpiresAt: expiresAt });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

export default router;
