/**
 * Pulse Bot API — Telegram-compatible HTTP API for bots
 * Base URL: /bot/:token/METHOD
 */
import { Router } from "express";
import { db, messagesTable, chatMembersTable } from "@workspace/db";
import { sql, eq, and, gt } from "drizzle-orm";
import { broadcastToChat } from "../lib/sse";

export const botApiRouter = Router();

async function resolveBot(token: string): Promise<{ botUserId: number } | null> {
  const rows = await db.execute(sql`SELECT bot_user_id FROM bot_tokens WHERE token = ${token}`);
  if ((rows.rows as any[]).length === 0) return null;
  return { botUserId: (rows.rows[0] as any).bot_user_id };
}

function ok(data: any) {
  return { ok: true, result: data };
}

function err(description: string, error_code = 400) {
  return { ok: false, error_code, description };
}

async function buildTgMessage(msg: any, bot_user_id: number) {
  const sender = await db.execute(sql`SELECT id, username, display_name FROM users WHERE id = ${msg.sender_id}`);
  const s = (sender.rows[0] as any) || {};
  const chat = await db.execute(sql`SELECT id, type, name FROM chats WHERE id = ${msg.chat_id}`);
  const c = (chat.rows[0] as any) || {};
  return {
    message_id: msg.id,
    from: {
      id: s.id,
      is_bot: false,
      first_name: s.display_name || s.username,
      username: s.username,
    },
    chat: {
      id: c.id,
      type: c.type === "direct" ? "private" : c.type,
      title: c.name,
    },
    date: Math.floor(new Date(msg.created_at).getTime() / 1000),
    text: msg.text,
  };
}

/** GET /bot/:token/getMe */
botApiRouter.get("/:token/getMe", async (req, res) => {
  const bot = await resolveBot(req.params.token);
  if (!bot) return res.status(401).json(err("Unauthorized", 401));
  const rows = await db.execute(sql`SELECT id, username, display_name FROM users WHERE id = ${bot.botUserId}`);
  const u = rows.rows[0] as any;
  if (!u) return res.status(404).json(err("Bot not found", 404));
  res.json(ok({
    id: u.id,
    is_bot: true,
    first_name: u.display_name,
    username: u.username,
    can_join_groups: true,
    can_read_all_group_messages: false,
    supports_inline_queries: false,
  }));
});

/** GET /bot/:token/getUpdates?offset=&limit=&timeout= */
botApiRouter.get("/:token/getUpdates", async (req, res) => {
  const bot = await resolveBot(req.params.token);
  if (!bot) return res.status(401).json(err("Unauthorized", 401));

  const offset = Number(req.query.offset ?? 0);
  const limit = Math.min(Number(req.query.limit ?? 100), 100);
  const timeout = Math.min(Number(req.query.timeout ?? 0), 30);

  const fetchUpdates = async () => {
    const whereClause = offset > 0
      ? sql`bot_user_id = ${bot.botUserId} AND update_id >= ${offset} AND fetched_at IS NULL`
      : sql`bot_user_id = ${bot.botUserId} AND fetched_at IS NULL`;

    const rows = await db.execute(sql`
      SELECT id, update_id, payload FROM bot_updates
      WHERE ${whereClause}
      ORDER BY update_id ASC
      LIMIT ${limit}
    `);
    return rows.rows as any[];
  };

  let updates = await fetchUpdates();

  if (updates.length === 0 && timeout > 0) {
    await new Promise<void>(resolve => setTimeout(resolve, timeout * 1000));
    updates = await fetchUpdates();
  }

  if (updates.length > 0) {
    const maxId = updates[updates.length - 1].update_id;
    await db.execute(sql`
      UPDATE bot_updates SET fetched_at = NOW()
      WHERE bot_user_id = ${bot.botUserId} AND update_id <= ${maxId}
    `);
  }

  const result = updates.map((u: any) => ({
    update_id: Number(u.update_id),
    ...u.payload,
  }));

  res.json(ok(result));
});

/** POST /bot/:token/sendMessage */
botApiRouter.post("/:token/sendMessage", async (req, res) => {
  const bot = await resolveBot(req.params.token);
  if (!bot) return res.status(401).json(err("Unauthorized", 401));

  const chatId = Number(req.body.chat_id);
  const text = String(req.body.text ?? "").trim();
  const replyToId = req.body.reply_to_message_id ? Number(req.body.reply_to_message_id) : undefined;

  if (!chatId || !text) return res.json(err("chat_id and text are required"));
  if (text.length > 4096) return res.json(err("Message text is too long (max 4096 chars)"));

  const member = await db.execute(sql`SELECT id FROM chat_members WHERE chat_id = ${chatId} AND user_id = ${bot.botUserId}`);
  if ((member.rows as any[]).length === 0) {
    return res.json(err("Bot is not a member of this chat", 403));
  }

  const [msg] = await db.insert(messagesTable).values({
    chatId,
    senderId: bot.botUserId,
    text,
    type: "text",
    replyToId,
  }).returning();

  broadcastToChat(chatId, "new-message", { messageId: msg.id, chatId });

  const tgMsg = await buildTgMessage({ ...msg, sender_id: msg.senderId }, bot.botUserId);
  res.json(ok(tgMsg));
});

/** POST /bot/:token/sendPhoto */
botApiRouter.post("/:token/sendPhoto", async (req, res) => {
  const bot = await resolveBot(req.params.token);
  if (!bot) return res.status(401).json(err("Unauthorized", 401));

  const chatId = Number(req.body.chat_id);
  const photo = String(req.body.photo ?? "").trim();
  const caption = req.body.caption ? String(req.body.caption).trim() : undefined;

  if (!chatId || !photo) return res.json(err("chat_id and photo (URL) are required"));

  const member = await db.execute(sql`SELECT id FROM chat_members WHERE chat_id = ${chatId} AND user_id = ${bot.botUserId}`);
  if ((member.rows as any[]).length === 0) {
    return res.json(err("Bot is not a member of this chat", 403));
  }

  const [msg] = await db.insert(messagesTable).values({
    chatId,
    senderId: bot.botUserId,
    text: caption,
    type: "image",
    mediaUrl: photo,
  }).returning();

  broadcastToChat(chatId, "new-message", { messageId: msg.id, chatId });
  const tgMsg = await buildTgMessage({ ...msg, sender_id: msg.senderId }, bot.botUserId);
  res.json(ok(tgMsg));
});

/** POST /bot/:token/setWebhook */
botApiRouter.post("/:token/setWebhook", async (req, res) => {
  const bot = await resolveBot(req.params.token);
  if (!bot) return res.status(401).json(err("Unauthorized", 401));

  const url = String(req.body.url ?? "").trim();
  const secretToken = req.body.secret_token ? String(req.body.secret_token) : null;

  if (!url) {
    await db.execute(sql`DELETE FROM bot_webhooks WHERE bot_user_id = ${bot.botUserId}`);
    return res.json(ok(true));
  }

  try { new URL(url); } catch {
    return res.json(err("Invalid webhook URL"));
  }

  await db.execute(sql`
    INSERT INTO bot_webhooks (bot_user_id, url, secret_token)
    VALUES (${bot.botUserId}, ${url}, ${secretToken})
    ON CONFLICT (bot_user_id) DO UPDATE SET url = ${url}, secret_token = ${secretToken}
  `);
  res.json(ok(true));
});

/** POST /bot/:token/deleteWebhook */
botApiRouter.post("/:token/deleteWebhook", async (req, res) => {
  const bot = await resolveBot(req.params.token);
  if (!bot) return res.status(401).json(err("Unauthorized", 401));
  await db.execute(sql`DELETE FROM bot_webhooks WHERE bot_user_id = ${bot.botUserId}`);
  res.json(ok(true));
});

/** GET /bot/:token/getWebhookInfo */
botApiRouter.get("/:token/getWebhookInfo", async (req, res) => {
  const bot = await resolveBot(req.params.token);
  if (!bot) return res.status(401).json(err("Unauthorized", 401));

  const rows = await db.execute(sql`SELECT url, last_error, last_error_at FROM bot_webhooks WHERE bot_user_id = ${bot.botUserId}`);
  const wh = rows.rows[0] as any;

  const pendingRows = await db.execute(sql`SELECT COUNT(*) as c FROM bot_updates WHERE bot_user_id = ${bot.botUserId} AND fetched_at IS NULL`);
  const pending = Number((pendingRows.rows[0] as any)?.c ?? 0);

  res.json(ok({
    url: wh?.url || "",
    has_custom_certificate: false,
    pending_update_count: pending,
    last_error_message: wh?.last_error || undefined,
    last_error_date: wh?.last_error_at ? Math.floor(new Date(wh.last_error_at).getTime() / 1000) : undefined,
  }));
});

/** GET /bot/:token/getChat */
botApiRouter.get("/:token/getChat", async (req, res) => {
  const bot = await resolveBot(req.params.token);
  if (!bot) return res.status(401).json(err("Unauthorized", 401));

  const chatId = Number(req.query.chat_id);
  if (!chatId) return res.json(err("chat_id is required"));

  const member = await db.execute(sql`SELECT id FROM chat_members WHERE chat_id = ${chatId} AND user_id = ${bot.botUserId}`);
  if ((member.rows as any[]).length === 0) return res.json(err("Bot is not a member of this chat", 403));

  const rows = await db.execute(sql`SELECT id, type, name, description FROM chats WHERE id = ${chatId}`);
  const c = rows.rows[0] as any;
  if (!c) return res.json(err("Chat not found", 404));

  res.json(ok({
    id: c.id,
    type: c.type === "direct" ? "private" : c.type,
    title: c.name,
    description: c.description,
  }));
});

/** POST /bot/:token/leaveChat */
botApiRouter.post("/:token/leaveChat", async (req, res) => {
  const bot = await resolveBot(req.params.token);
  if (!bot) return res.status(401).json(err("Unauthorized", 401));

  const chatId = Number(req.body.chat_id);
  if (!chatId) return res.json(err("chat_id is required"));

  await db.execute(sql`DELETE FROM chat_members WHERE chat_id = ${chatId} AND user_id = ${bot.botUserId}`);
  res.json(ok(true));
});

export default botApiRouter;
