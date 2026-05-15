import { createServer } from "node:http";
import app from "./app";
import { logger } from "./lib/logger";
import { initSocketIO } from "./lib/socket";
import { runSeed } from "./seed";
import { db, messagesTable } from "@workspace/db";
import { sql, and, eq, lte } from "drizzle-orm";
import { broadcastToChat } from "./lib/sse";
import { runWeeklyScan } from "./routes/admin";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const httpServer = createServer(app);
initSocketIO(httpServer);

runSeed().catch((err) => logger.error({ err }, "Seed failed"));

httpServer.listen(port, () => {
  logger.info({ port }, "Server listening");
});

setInterval(async () => {
  try {
    const rows = await db.execute(sql`SELECT * FROM scheduled_messages WHERE scheduled_at <= NOW()`);
    for (const msg of rows.rows as any[]) {
      const [inserted] = await db.insert(messagesTable).values({
        chatId: msg.chat_id,
        senderId: msg.sender_id,
        text: msg.text,
        type: "text",
      }).returning();
      broadcastToChat(msg.chat_id, "new-message", { messageId: inserted.id, chatId: msg.chat_id });
      await db.execute(sql`DELETE FROM scheduled_messages WHERE id = ${msg.id}`);
    }
  } catch (err) {
    logger.warn({ err }, "Scheduled messages processor error");
  }
}, 30_000);

setInterval(async () => {
  try {
    const chats = await db.execute(sql`SELECT id, auto_delete_timer FROM chats WHERE auto_delete_timer IS NOT NULL AND auto_delete_timer > 0`);
    for (const chat of chats.rows as any[]) {
      const cutoff = new Date(Date.now() - Number(chat.auto_delete_timer) * 1000);
      const deleted = await db.delete(messagesTable).where(
        and(eq(messagesTable.chatId, Number(chat.id)), lte(messagesTable.createdAt, cutoff))
      ).returning({ id: messagesTable.id });
      for (const { id } of deleted) {
        broadcastToChat(Number(chat.id), "message-deleted", { messageId: id, chatId: Number(chat.id) });
      }
    }
  } catch (err) {
    logger.warn({ err }, "Auto-delete cleanup error");
  }
}, 10_000);

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

async function maybeRunWeeklyScan() {
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS moderation_scan_runs (
        id SERIAL PRIMARY KEY,
        started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        finished_at TIMESTAMP WITH TIME ZONE,
        posts_scanned INTEGER NOT NULL DEFAULT 0,
        posts_flagged INTEGER NOT NULL DEFAULT 0,
        triggered_by TEXT NOT NULL DEFAULT 'scheduler',
        status TEXT NOT NULL DEFAULT 'running'
      )
    `);
    await db.execute(sql`ALTER TABLE posts ADD COLUMN IF NOT EXISTS moderation_status TEXT`);
    await db.execute(sql`ALTER TABLE posts ADD COLUMN IF NOT EXISTS moderation_reason TEXT`);
    await db.execute(sql`ALTER TABLE posts ADD COLUMN IF NOT EXISTS moderation_confidence INTEGER`);
    await db.execute(sql`ALTER TABLE posts ADD COLUMN IF NOT EXISTS moderation_categories TEXT`);
    await db.execute(sql`ALTER TABLE posts ADD COLUMN IF NOT EXISTS moderation_scanned_at TIMESTAMP WITH TIME ZONE`);

    const lastRun = await db.execute(sql`
      SELECT started_at FROM moderation_scan_runs
      WHERE status = 'completed' AND triggered_by = 'scheduler'
      ORDER BY started_at DESC LIMIT 1
    `);

    const lastRunAt = (lastRun.rows[0] as any)?.started_at;
    const now = Date.now();
    const shouldRun = !lastRunAt || (now - new Date(lastRunAt).getTime()) >= WEEK_MS;

    if (!shouldRun) return;

    const [runResult] = (await db.execute(sql`
      INSERT INTO moderation_scan_runs (triggered_by, status)
      VALUES ('scheduler', 'running')
      RETURNING id
    `)).rows as any[];

    logger.info({ runId: runResult.id }, "Weekly AI moderation scan starting");
    setImmediate(() => runWeeklyScan(runResult.id, "scheduler"));
  } catch (err) {
    logger.warn({ err }, "Weekly moderation scheduler error");
  }
}

setTimeout(() => maybeRunWeeklyScan(), 60_000);
setInterval(() => maybeRunWeeklyScan(), 60 * 60 * 1000);
