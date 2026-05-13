import { Router } from "express";
import { db, usersTable, giftsTable, giftItemsTable } from "@workspace/db";
import { eq, sql, desc } from "drizzle-orm";

const router = Router();

router.get("/wallet", async (req, res) => {
  try {
    const uid = req.currentUserId;
    const rows = await db.execute(sql`SELECT balance FROM users WHERE id = ${uid}`);
    const balance = Number((rows.rows[0] as any)?.balance ?? 0);
    const address = `PULSE-${uid.toString().padStart(6, "0")}`;
    res.json({ balance, address });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

router.post("/wallet/earn", async (req, res) => {
  try {
    const uid = req.currentUserId;
    const { amount } = req.body;
    if (typeof amount !== "number" || amount <= 0 || amount > 1000) {
      return res.status(400).json({ error: "Некорректная сумма" });
    }
    await db.execute(sql`UPDATE users SET balance = balance + ${amount} WHERE id = ${uid}`);
    await db.execute(sql`INSERT INTO spark_activity (user_id, type, amount, description) VALUES (${uid}, 'earned', ${amount}, 'Заработано') ON CONFLICT DO NOTHING`).catch(() => {});
    const rows = await db.execute(sql`SELECT balance FROM users WHERE id = ${uid}`);
    const balance = Number((rows.rows[0] as any)?.balance ?? 0);
    res.json({ success: true, balance });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

router.post("/wallet/send", async (req, res) => {
  try {
    const uid = req.currentUserId;
    const { address, amount } = req.body;
    if (!address || typeof amount !== "number" || amount <= 0) {
      return res.status(400).json({ error: "Укажите адрес и сумму" });
    }
    const trimmed = String(address).trim().toUpperCase();
    if (!trimmed.startsWith("PULSE-")) {
      return res.status(400).json({ error: "Неверный формат. Адрес должен начинаться с PULSE-" });
    }
    const targetId = parseInt(trimmed.replace("PULSE-", ""), 10);
    if (isNaN(targetId) || targetId <= 0) {
      return res.status(400).json({ error: "Неверный адрес кошелька" });
    }
    if (targetId === uid) {
      return res.status(400).json({ error: "Нельзя отправить самому себе" });
    }

    const target = await db.query.usersTable.findFirst({ where: eq(usersTable.id, targetId) });
    if (!target) {
      return res.status(404).json({ error: "Пользователь с таким адресом не найден" });
    }

    const senderRows = await db.execute(sql`SELECT balance FROM users WHERE id = ${uid}`);
    const senderBalance = Number((senderRows.rows[0] as any)?.balance ?? 0);
    if (senderBalance < amount) {
      return res.status(400).json({ error: `Недостаточно Spark. Ваш баланс: ${senderBalance}` });
    }

    await db.execute(sql`UPDATE users SET balance = balance - ${amount} WHERE id = ${uid}`);
    await db.execute(sql`UPDATE users SET balance = balance + ${amount} WHERE id = ${targetId}`);

    // Log activity
    await db.execute(sql`INSERT INTO spark_activity (user_id, type, amount, description) VALUES (${uid}, 'sent', ${-amount}, ${'Отправлено: ' + target.displayName})`).catch(() => {});
    await db.execute(sql`INSERT INTO spark_activity (user_id, type, amount, description) VALUES (${targetId}, 'received', ${amount}, ${'Получено от пользователя'})`).catch(() => {});

    const updatedRows = await db.execute(sql`SELECT balance FROM users WHERE id = ${uid}`);
    const newBalance = Number((updatedRows.rows[0] as any)?.balance ?? 0);

    res.json({ success: true, balance: newBalance, recipient: target.displayName, amount });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

router.post("/wallet/daily-bonus", async (req, res) => {
  try {
    const uid = req.currentUserId;
    const today = new Date().toISOString().slice(0, 10);
    const claimed = await db.execute(
      sql`SELECT 1 FROM user_daily_bonus WHERE user_id = ${uid} AND bonus_date = ${today} LIMIT 1`
    );
    if ((claimed.rows as any[]).length > 0) {
      return res.status(409).json({ error: "Бонус уже получен сегодня. Возвращайся завтра!" });
    }
    const primeRow = await db.execute(sql`SELECT has_prime, prime_tier, prime_expires_at FROM users WHERE id = ${uid}`);
    const row0 = primeRow.rows[0] as any;
    const hasPrime = (row0?.has_prime === true || row0?.has_prime === "t") && row0?.prime_expires_at && new Date(row0.prime_expires_at) > new Date();
    const primeTier = row0?.prime_tier ?? null;
    const BONUS = hasPrime ? (primeTier === "prime_plus" ? 50 : 25) : 10;
    await db.execute(sql`INSERT INTO user_daily_bonus (user_id, bonus_date) VALUES (${uid}, ${today}) ON CONFLICT DO NOTHING`);
    await db.execute(sql`UPDATE users SET balance = balance + ${BONUS} WHERE id = ${uid}`);

    // Log spark activity
    await db.execute(sql`INSERT INTO spark_activity (user_id, type, amount, description) VALUES (${uid}, 'daily_bonus', ${BONUS}, 'Ежедневный бонус') `).catch(() => {});

    const rows = await db.execute(sql`SELECT balance FROM users WHERE id = ${uid}`);
    const balance = Number((rows.rows[0] as any)?.balance ?? 0);
    res.json({ success: true, balance, bonus: BONUS, isPrime: hasPrime });
  } catch (err: any) {
    if (String(err?.message).includes("user_daily_bonus")) {
      return res.status(500).json({ error: "Таблица бонусов не создана. Свяжитесь с администратором." });
    }
    req.log.error(err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

router.post("/wallet/buy", async (req, res) => {
  try {
    const uid = req.currentUserId;
    const { amount, packageLabel, priceLabel } = req.body;
    if (!amount || typeof amount !== "number" || amount <= 0 || !packageLabel || !priceLabel) {
      return res.status(400).json({ error: "Некорректные данные" });
    }
    await db.execute(sql`UPDATE users SET balance = balance + ${amount} WHERE id = ${uid}`);
    await db.execute(sql`INSERT INTO spark_activity (user_id, type, amount, description) VALUES (${uid}, 'purchase', ${amount}, ${'Пополнение: ' + packageLabel})`).catch(() => {});
    const rows = await db.execute(sql`SELECT balance FROM users WHERE id = ${uid}`);
    const balance = Number((rows.rows[0] as any)?.balance ?? 0);
    await db.execute(
      sql`INSERT INTO topup_requests (user_id, amount, package_label, price_label, status) VALUES (${uid}, ${amount}, ${packageLabel}, ${priceLabel}, 'completed')`
    ).catch(() => {});
    res.json({ success: true, balance, amount });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

// Monthly epic gift for Prime+ users
router.post("/wallet/monthly-gift", async (req, res) => {
  try {
    const uid = req.currentUserId;
    const primeRow = await db.execute(sql`SELECT has_prime, prime_tier, prime_expires_at, last_monthly_gift_at FROM users WHERE id = ${uid}`);
    const user = primeRow.rows[0] as any;

    if (!user) return res.status(404).json({ error: "Пользователь не найден" });

    const hasPrime = (user.has_prime === true || user.has_prime === "t") && user.prime_expires_at && new Date(user.prime_expires_at) > new Date();
    const isPrimePlus = hasPrime && user.prime_tier === "prime_plus";

    if (!isPrimePlus) return res.status(403).json({ error: "Ежемесячный подарок доступен только для Prime+" });

    // Check 30-day cooldown
    if (user.last_monthly_gift_at) {
      const lastGift = new Date(user.last_monthly_gift_at);
      const daysSinceLast = (Date.now() - lastGift.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceLast < 30) {
        const daysLeft = Math.ceil(30 - daysSinceLast);
        return res.status(409).json({ error: `Следующий подарок через ${daysLeft} дн.`, daysLeft });
      }
    }

    // Find an epic gift item to award
    let epicGiftItem: any = null;
    try {
      const epicItems = await db.execute(sql`SELECT * FROM gift_items WHERE rarity = 'epic' ORDER BY RANDOM() LIMIT 1`);
      epicGiftItem = epicItems.rows[0] as any;
    } catch {}

    if (!epicGiftItem) {
      // Fallback: award spark instead
      const sparkReward = 200;
      await db.execute(sql`UPDATE users SET balance = balance + ${sparkReward}, last_monthly_gift_at = NOW() WHERE id = ${uid}`);
      await db.execute(sql`INSERT INTO spark_activity (user_id, type, amount, description) VALUES (${uid}, 'monthly_gift', ${sparkReward}, 'Ежемесячный подарок Prime+')`).catch(() => {});
      const rows = await db.execute(sql`SELECT balance FROM users WHERE id = ${uid}`);
      return res.json({ success: true, type: "spark", amount: sparkReward, balance: Number((rows.rows[0] as any)?.balance ?? 0) });
    }

    // Award the gift to self
    await db.execute(sql`
      INSERT INTO gifts (gift_item_id, sender_id, receiver_id, message)
      VALUES (${epicGiftItem.id}, ${uid}, ${uid}, 'Ежемесячный подарок Prime+ 🎁')
    `).catch(() => {});

    await db.execute(sql`UPDATE users SET last_monthly_gift_at = NOW() WHERE id = ${uid}`);
    await db.execute(sql`INSERT INTO spark_activity (user_id, type, amount, description) VALUES (${uid}, 'monthly_gift', 0, ${'Ежемесячный эпический подарок: ' + epicGiftItem.name})`).catch(() => {});

    res.json({ success: true, type: "gift", gift: epicGiftItem });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

// Monthly gift status
router.get("/wallet/monthly-gift/status", async (req, res) => {
  try {
    const uid = req.currentUserId;
    const row = await db.execute(sql`SELECT last_monthly_gift_at, has_prime, prime_tier, prime_expires_at FROM users WHERE id = ${uid}`);
    const user = row.rows[0] as any;

    const hasPrime = (user?.has_prime === true || user?.has_prime === "t") && user?.prime_expires_at && new Date(user.prime_expires_at) > new Date();
    const isPrimePlus = hasPrime && user?.prime_tier === "prime_plus";

    if (!isPrimePlus) return res.json({ available: false, reason: "not_prime_plus" });

    const lastGiftAt = user?.last_monthly_gift_at ? new Date(user.last_monthly_gift_at) : null;
    const daysSinceLast = lastGiftAt ? (Date.now() - lastGiftAt.getTime()) / (1000 * 60 * 60 * 24) : 999;
    const available = daysSinceLast >= 30;
    const daysLeft = available ? 0 : Math.ceil(30 - daysSinceLast);

    res.json({ available, daysLeft, lastGiftAt: lastGiftAt?.toISOString() ?? null });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

// Spark activity log (detailed stats for Prime+)
router.get("/wallet/activity", async (req, res) => {
  try {
    const uid = req.currentUserId;
    const limit = Math.min(Number(req.query.limit ?? 50), 200);

    const rows = await db.execute(sql`
      SELECT * FROM spark_activity
      WHERE user_id = ${uid}
      ORDER BY created_at DESC
      LIMIT ${limit}
    `);

    const summary = await db.execute(sql`
      SELECT
        COALESCE(SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END), 0) as total_earned,
        COALESCE(SUM(CASE WHEN amount < 0 THEN ABS(amount) ELSE 0 END), 0) as total_spent,
        COUNT(*) as total_transactions
      FROM spark_activity
      WHERE user_id = ${uid}
    `);

    res.json({
      activities: rows.rows,
      summary: summary.rows[0] ?? { total_earned: 0, total_spent: 0, total_transactions: 0 },
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

router.get("/stats/me", async (req, res) => {
  try {
    const uid = req.currentUserId;
    const [msgs, calls, giftsS, giftsR, contacts] = await Promise.all([
      db.execute(sql`SELECT COUNT(*) as cnt FROM messages WHERE sender_id = ${uid}`),
      db.execute(sql`SELECT COUNT(*) as cnt FROM calls WHERE caller_id = ${uid}`),
      db.execute(sql`SELECT COUNT(*) as cnt FROM gifts WHERE sender_id = ${uid}`).catch(() => ({ rows: [{ cnt: 0 }] })),
      db.execute(sql`SELECT COUNT(*) as cnt FROM gifts WHERE receiver_id = ${uid}`).catch(() => ({ rows: [{ cnt: 0 }] })),
      db.execute(sql`SELECT COUNT(*) as cnt FROM contacts WHERE user_id = ${uid}`).catch(() => ({ rows: [{ cnt: 0 }] })),
    ]);

    const popularityRow = await db.execute(sql`SELECT balance FROM users WHERE id = ${uid}`);
    const balance = Number((popularityRow.rows[0] as any)?.balance ?? 0);

    res.json({
      messagesSent: Number((msgs.rows[0] as any)?.cnt ?? 0),
      callsMade: Number((calls.rows[0] as any)?.cnt ?? 0),
      giftsSent: Number((giftsS.rows[0] as any)?.cnt ?? 0),
      giftsReceived: Number((giftsR.rows[0] as any)?.cnt ?? 0),
      contactsCount: Number((contacts.rows[0] as any)?.cnt ?? 0),
      popularity: Math.min(balance, 10000),
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

export default router;
