import { Router } from "express";
import { db, callsTable, usersTable } from "@workspace/db";
import { eq, or, desc } from "drizzle-orm";
import { InitiateCallBody, UpdateCallStatusBody } from "@workspace/api-zod";
import { broadcastToUser } from "../lib/sse";

const router = Router();

// ── ICE server config (served from backend so TURN creds stay server-side) ──
router.get("/calls/ice-servers", (_req, res) => {
  const servers: RTCIceServer[] = [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
    { urls: "stun:stun3.l.google.com:19302" },
    { urls: "stun:stun4.l.google.com:19302" },
    { urls: "stun:stun.cloudflare.com:3478" },
    { urls: "stun:global.stun.twilio.com:3478" },
    { urls: "stun:openrelay.metered.ca:80" },
  ];

  // Custom TURN from env (set in Render dashboard, never baked into frontend bundle)
  const turnUrl  = process.env.TURN_URL;
  const turnUser = process.env.TURN_USER;
  const turnCred = process.env.TURN_CRED;
  if (turnUrl && turnUser && turnCred) {
    servers.push({ urls: turnUrl, username: turnUser, credential: turnCred });
    const tlsUrl = turnUrl.replace(/^turn:/, "turns:") + (turnUrl.includes("?") ? "" : "?transport=tcp");
    servers.push({ urls: tlsUrl, username: turnUser, credential: turnCred });
  }

  // OpenRelay public TURN as fallback
  const openRelayUser = "openrelayproject";
  const openRelayCred = "openrelayproject";
  servers.push(
    { urls: "turn:openrelay.metered.ca:80",                    username: openRelayUser, credential: openRelayCred },
    { urls: "turn:openrelay.metered.ca:443",                   username: openRelayUser, credential: openRelayCred },
    { urls: "turn:openrelay.metered.ca:443?transport=tcp",     username: openRelayUser, credential: openRelayCred },
    { urls: "turns:openrelay.metered.ca:443?transport=tcp",    username: openRelayUser, credential: openRelayCred },
  );

  res.json({ iceServers: servers });
});

async function buildCall(call: typeof callsTable.$inferSelect) {
  const caller = call.callerId ? await db.query.usersTable.findFirst({ where: eq(usersTable.id, call.callerId) }) : null;
  const callee = call.calleeId ? await db.query.usersTable.findFirst({ where: eq(usersTable.id, call.calleeId) }) : null;
  return { ...call, caller, callee };
}

router.get("/calls", async (req, res) => {
  try {
    const uid = req.currentUserId;
    const calls = await db.select().from(callsTable)
      .where(or(eq(callsTable.callerId, uid), eq(callsTable.calleeId, uid)))
      .orderBy(desc(callsTable.createdAt))
      .limit(50);
    const built = await Promise.all(calls.map(buildCall));
    res.json(built);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/calls", async (req, res) => {
  try {
    const uid = req.currentUserId;
    const body = InitiateCallBody.parse(req.body);

    const callee = body.calleeId != null
      ? await db.query.usersTable.findFirst({ where: eq(usersTable.id, body.calleeId) })
      : undefined;

    const [call] = await db.insert(callsTable).values({
      callerId: uid,
      calleeId: body.calleeId,
      chatId: body.chatId,
      type: body.type,
      status: "ringing",
    }).returning();
    const built = await buildCall(call);

    if (callee?.isBot) {
      const [declined] = await db.update(callsTable)
        .set({ status: "declined", endedAt: new Date() })
        .where(eq(callsTable.id, call.id))
        .returning();
      const declinedBuilt = await buildCall(declined);
      broadcastToUser(uid, "call-declined", declinedBuilt);
      return res.status(201).json(declinedBuilt);
    }

    if (built.calleeId) {
      broadcastToUser(built.calleeId, "incoming-call", built);
    }
    res.status(201).json(built);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/calls/:callId", async (req, res) => {
  try {
    const callId = Number(req.params.callId);
    const uid = req.currentUserId;
    const call = await db.query.callsTable.findFirst({ where: eq(callsTable.id, callId) });
    if (!call) return res.status(404).json({ error: "Call not found" });
    // Only the caller or callee may fetch call details
    if (call.callerId !== uid && call.calleeId !== uid) {
      return res.status(403).json({ error: "Доступ запрещён" });
    }
    const built = await buildCall(call);
    res.json(built);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/calls/:callId", async (req, res) => {
  try {
    const callId = Number(req.params.callId);
    const uid = req.currentUserId;
    const body = UpdateCallStatusBody.parse(req.body);
    const updateData: Record<string, unknown> = { status: body.status };
    if (body.status === "active") updateData.startedAt = new Date();
    if (body.status === "ended" || body.status === "declined") {
      updateData.endedAt = new Date();
      const call = await db.query.callsTable.findFirst({ where: eq(callsTable.id, callId) });
      if (call?.startedAt) {
        const dur = Math.floor((Date.now() - new Date(call.startedAt).getTime()) / 1000);
        updateData.durationSeconds = dur;
      }
    }
    const [updated] = await db.update(callsTable).set(updateData).where(eq(callsTable.id, callId)).returning();
    const built = await buildCall(updated);

    if (body.status === "active" && built.callerId) {
      broadcastToUser(built.callerId, "call-accepted", built);
    } else if (body.status === "declined" && built.callerId) {
      broadcastToUser(built.callerId, "call-declined", built);
    } else if (body.status === "ended") {
      const targetId = built.callerId === uid ? built.calleeId : built.callerId;
      if (targetId) broadcastToUser(targetId, "call-ended", built);
    } else if (body.status === "missed") {
      if (built.calleeId) broadcastToUser(built.calleeId, "call-ended", built);
    }

    res.json(built);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/calls/:callId/signal", async (req, res) => {
  try {
    const callId = Number(req.params.callId);
    const uid = req.currentUserId;
    const { type, payload } = req.body;
    if (!type || payload === undefined) return res.status(400).json({ error: "Missing type or payload" });

    const call = await db.query.callsTable.findFirst({ where: eq(callsTable.id, callId) });
    if (!call) return res.status(404).json({ error: "Call not found" });

    // Ensure the sender is actually a participant in this call
    if (call.callerId !== uid && call.calleeId !== uid) {
      return res.status(403).json({ error: "Доступ запрещён" });
    }

    const targetId = call.callerId === uid ? call.calleeId : call.callerId;
    if (targetId) {
      broadcastToUser(targetId, "webrtc-signal", { type, payload, callId });
    }

    res.json({ ok: true });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Invite a user to an existing call (group call)
router.post("/calls/:callId/invite", async (req, res) => {
  try {
    const callId = Number(req.params.callId);
    const uid = req.currentUserId;
    const { inviteeId } = req.body;
    if (!inviteeId) return res.status(400).json({ error: "Missing inviteeId" });

    const originalCall = await db.query.callsTable.findFirst({ where: eq(callsTable.id, callId) });
    if (!originalCall) return res.status(404).json({ error: "Call not found" });

    const invitee = await db.query.usersTable.findFirst({ where: eq(usersTable.id, Number(inviteeId)) });
    if (!invitee) return res.status(404).json({ error: "User not found" });

    // Create a new call record for the invite
    const [newCall] = await db.insert(callsTable).values({
      callerId: uid,
      calleeId: Number(inviteeId),
      type: originalCall.type,
      status: "ringing",
    }).returning();

    const built = await buildCall(newCall);

    if (invitee.isBot) {
      const [declined] = await db.update(callsTable)
        .set({ status: "declined", endedAt: new Date() })
        .where(eq(callsTable.id, newCall.id))
        .returning();
      return res.status(201).json({ ...await buildCall(declined), groupRoomId: callId });
    }

    // Send incoming-call with groupRoomId so invitee knows which room to join
    broadcastToUser(Number(inviteeId), "incoming-call", { ...built, groupRoomId: callId });

    res.status(201).json({ ...built, groupRoomId: callId });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
