import { Router } from "express";
import {
  subscribeToChatEvents, unsubscribeFromChatEvents,
  subscribeToUserEvents, unsubscribeFromUserEvents,
  getUserConnectionCount,
  setTyping, stopTyping, broadcastToUser,
} from "../lib/sse";
import { db, usersTable } from "@workspace/db";
import { sql, eq } from "drizzle-orm";

const router = Router();

router.get("/chats/:chatId/events", async (req, res) => {
  const chatId = Number(req.params.chatId);
  const uid = req.currentUserId;
  if (!chatId) return res.status(400).end();

  const member = await db.execute(
    sql`SELECT 1 FROM chat_members WHERE chat_id = ${chatId} AND user_id = ${uid} LIMIT 1`
  );
  if (!member.rows.length) return res.status(403).end();

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  res.write(": connected\n\n");

  const keepAlive = setInterval(() => {
    try { res.write(": ping\n\n"); } catch { clearInterval(keepAlive); }
  }, 8000);

  subscribeToChatEvents(chatId, res);

  req.on("close", () => {
    clearInterval(keepAlive);
    unsubscribeFromChatEvents(chatId, res);
  });
});

router.post("/chats/:chatId/typing", async (req, res) => {
  const chatId = Number(req.params.chatId);
  const uid = req.currentUserId;
  if (!chatId) return res.status(400).end();

  try {
    const userRow = await db.execute(sql`SELECT display_name FROM users WHERE id = ${uid} LIMIT 1`);
    const displayName = (userRow.rows[0] as any)?.display_name || "User";
    setTyping(chatId, uid, displayName);
    res.json({ ok: true });
  } catch {
    res.json({ ok: false });
  }
});

router.post("/chats/:chatId/typing/stop", async (req, res) => {
  const chatId = Number(req.params.chatId);
  const uid = req.currentUserId;
  if (!chatId) return res.status(400).end();

  try {
    const userRow = await db.execute(sql`SELECT display_name FROM users WHERE id = ${uid} LIMIT 1`);
    const displayName = (userRow.rows[0] as any)?.display_name || "User";
    stopTyping(chatId, uid, displayName);
    res.json({ ok: true });
  } catch {
    res.json({ ok: false });
  }
});

// P2P WebRTC signaling for data channels (direct chat messaging)
router.post("/chats/:chatId/p2p-signal", async (req, res) => {
  const chatId = Number(req.params.chatId);
  const uid = req.currentUserId;
  const { type, payload } = req.body;
  if (!type || payload === undefined) return res.status(400).json({ error: "Missing type or payload" });

  try {
    const member = await db.execute(
      sql`SELECT user_id FROM chat_members WHERE chat_id = ${chatId} AND user_id != ${uid} LIMIT 1`
    );
    const targetId = (member.rows[0] as any)?.user_id;
    if (targetId) {
      broadcastToUser(Number(targetId), "p2p-signal", { chatId, type, payload, fromUserId: uid });
    }
    res.json({ ok: true });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/users/me/events", async (req, res) => {
  const uid = req.currentUserId;

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  res.write(": connected\n\n");

  const keepAlive = setInterval(() => {
    try { res.write(": ping\n\n"); } catch { clearInterval(keepAlive); }
  }, 8000);

  subscribeToUserEvents(uid, res);

  // Mark user online
  try {
    await db.update(usersTable).set({ status: "online" }).where(eq(usersTable.id, uid));
  } catch {}

  req.on("close", async () => {
    clearInterval(keepAlive);
    unsubscribeFromUserEvents(uid, res);

    // Only go offline if this was the last connection
    if (getUserConnectionCount(uid) === 0) {
      try {
        await db.update(usersTable)
          .set({ status: "offline", lastSeen: new Date().toISOString() })
          .where(eq(usersTable.id, uid));
      } catch {}
    }
  });
});

export default router;
