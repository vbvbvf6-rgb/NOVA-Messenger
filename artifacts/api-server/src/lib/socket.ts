import { Server as SocketIOServer } from "socket.io";
import type { Server as HttpServer } from "node:http";
import jwt from "jsonwebtoken";
import { JWT_SECRET } from "../app";

let io: SocketIOServer | null = null;

interface BufferedSignal {
  signal: unknown;
  fromUserId: number;
  ts: number;
}

const signalBuffer = new Map<number, BufferedSignal[]>();
const SIGNAL_TTL = 60_000;

export function initSocketIO(server: HttpServer): SocketIOServer {
  io = new SocketIOServer(server, {
    cors: { origin: true, credentials: true },
    path: "/socket.io",
    transports: ["websocket", "polling"],
  });

  io.use((socket, next) => {
    const token =
      (socket.handshake.auth?.token as string | undefined) ||
      (socket.handshake.query?.token as string | undefined);
    if (!token) return next(new Error("Unauthorized"));
    try {
      const payload = jwt.verify(token, JWT_SECRET) as { userId: number; pending2fa?: boolean };
      if (!payload.pending2fa && Number.isFinite(payload.userId) && payload.userId > 0) {
        socket.data.userId = payload.userId;
        return next();
      }
      next(new Error("Unauthorized"));
    } catch {
      next(new Error("Unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    const userId = socket.data.userId as number;

    socket.on("join-call", ({ callId }: { callId: number }) => {
      if (!callId) return;
      socket.join(`call:${callId}`);
      socket.data.callId = callId;

      const buf = signalBuffer.get(callId);
      if (buf && buf.length > 0) {
        const now = Date.now();
        const toSend = buf.filter((e) => now - e.ts < SIGNAL_TTL && e.fromUserId !== userId);
        for (const entry of toSend) {
          socket.emit("webrtc-signal", { signal: entry.signal, fromUserId: entry.fromUserId });
        }
        signalBuffer.set(
          callId,
          buf.filter((e) => e.fromUserId === userId && now - e.ts < SIGNAL_TTL),
        );
      }
    });

    socket.on("webrtc-signal", ({ callId, signal }: { callId: number; signal: unknown }) => {
      if (!callId || signal === undefined) return;
      const room = `call:${callId}`;
      const roomSockets = io?.sockets.adapter.rooms.get(room);
      const othersConnected = roomSockets && roomSockets.size > 1;

      if (othersConnected) {
        socket.to(room).emit("webrtc-signal", { signal, fromUserId: userId });
      } else {
        if (!signalBuffer.has(callId)) signalBuffer.set(callId, []);
        const buf = signalBuffer.get(callId)!;
        buf.push({ signal, fromUserId: userId, ts: Date.now() });
        if (buf.length > 50) buf.splice(0, buf.length - 50);
      }
    });

    socket.on("leave-call", ({ callId }: { callId: number }) => {
      if (!callId) return;
      socket.leave(`call:${callId}`);
      if (socket.data.callId === callId) socket.data.callId = undefined;
    });

    socket.on("disconnect", () => {
      const callId = socket.data.callId as number | undefined;
      if (!callId) return;
      setTimeout(() => {
        const room = io?.sockets.adapter.rooms.get(`call:${callId}`);
        if (!room || room.size === 0) {
          signalBuffer.delete(callId);
        }
      }, 10_000);
    });
  });

  return io;
}

export function getIO(): SocketIOServer | null {
  return io;
}
