import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from "react";
import { Call } from "@workspace/api-client-react";
import { getSavedAccounts, SavedAccount, MAX_ACCOUNTS } from "@/lib/accounts";

const ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  { urls: "stun:stun.relay.metered.ca:80" },
  {
    urls: "turn:global.relay.metered.ca:80",
    username: "openrelayproject",
    credential: "openrelayproject",
  },
  {
    urls: "turn:global.relay.metered.ca:443",
    username: "openrelayproject",
    credential: "openrelayproject",
  },
  {
    urls: "turns:global.relay.metered.ca:443",
    username: "openrelayproject",
    credential: "openrelayproject",
  },
];

// Creates a silent audio stream as a fallback when getUserMedia is unavailable
function createSilentStream(): MediaStream {
  try {
    const ac = new AudioContext();
    const dest = ac.createMediaStreamDestination();
    return dest.stream;
  } catch {
    return new MediaStream();
  }
}

interface AppState {
  currentUserId: number;
  selectedChatId: number | null;
  setSelectedChatId: (id: number | null) => void;
  activeCall: Call | null;
  setActiveCall: (call: Call | null) => void;
  isDark: boolean;
  toggleTheme: () => void;
  logout: () => void;
  typingByChat: Record<number, string[]>;
  typingTypeByChat: Record<number, string>;
  setTypingForChat: (chatId: number, names: string[], typingType?: string) => void;
  savedAccounts: SavedAccount[];
  switchAccount: (userId: number) => void;
  removeAccount: (userId: number) => void;
  openAddAccount: () => void;
  canAddAccount: boolean;
  startCall: (calleeId: number, chatId: number | null, type: "audio" | "video") => Promise<void>;
  acceptCall: () => Promise<void>;
  declineCall: () => Promise<void>;
  hangUp: () => Promise<void>;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
}

const AppContext = createContext<AppState | undefined>(undefined);

interface AppProviderProps {
  children: ReactNode;
  onLogout: () => void;
  onSwitchAccount: (userId: number) => void;
  onRemoveAccount: (userId: number) => void;
  onOpenAddAccount: () => void;
}

export function AppProvider({ children, onLogout, onSwitchAccount, onRemoveAccount, onOpenAddAccount }: AppProviderProps) {
  const [selectedChatId, setSelectedChatId] = useState<number | null>(null);
  const [activeCall, setActiveCall] = useState<Call | null>(null);
  const [typingByChat, setTypingByChat] = useState<Record<number, string[]>>({});
  const [typingTypeByChat, setTypingTypeByChat] = useState<Record<number, string>>({});
  const [savedAccounts, setSavedAccounts] = useState<SavedAccount[]>(() => getSavedAccounts());
  const [isDark, setIsDark] = useState(() => {
    const stored = localStorage.getItem("pulse-theme");
    return stored !== "light";
  });
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);

  const currentUserId = Number(sessionStorage.getItem("pulse-user-id") || "1");
  const currentUserIdRef = useRef(currentUserId);
  currentUserIdRef.current = currentUserId;

  const peerRef = useRef<RTCPeerConnection | null>(null);
  const activeCallRef = useRef<Call | null>(null);
  activeCallRef.current = activeCall;
  const pendingSignalsRef = useRef<{ type: string; payload: any }[]>([]);
  const localStreamRef = useRef<MediaStream | null>(null);
  const ringTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingIceCandidatesRef = useRef<RTCIceCandidateInit[]>([]);

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add("dark");
      document.documentElement.classList.remove("light");
    } else {
      document.documentElement.classList.remove("dark");
      document.documentElement.classList.add("light");
    }
    localStorage.setItem("pulse-theme", isDark ? "dark" : "light");
  }, [isDark]);

  const toggleTheme = () => setIsDark(prev => !prev);
  const logout = () => { onLogout(); };

  const getUserHeaders = useCallback((): Record<string, string> => {
    const token = sessionStorage.getItem("pulse-token");
    return { "Content-Type": "application/json", ...(token ? { "Authorization": `Bearer ${token}` } : {}) };
  }, []);

  const cleanupCall = useCallback(() => {
    if (ringTimeoutRef.current) {
      clearTimeout(ringTimeoutRef.current);
      ringTimeoutRef.current = null;
    }
    if (peerRef.current) {
      peerRef.current.close();
      peerRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => t.stop());
      localStreamRef.current = null;
    }
    setLocalStream(null);
    setRemoteStream(null);
    setActiveCall(null);
    pendingSignalsRef.current = [];
    pendingIceCandidatesRef.current = [];
  }, []);

  const flushPendingIce = useCallback(async (pc: RTCPeerConnection) => {
    const candidates = pendingIceCandidatesRef.current.splice(0);
    for (const c of candidates) {
      try { await pc.addIceCandidate(new RTCIceCandidate(c)); } catch {}
    }
  }, []);

  const applySignal = useCallback(async (pc: RTCPeerConnection, signal: { type: string; payload: any }) => {
    try {
      const callId = activeCallRef.current?.id;
      if (!callId) return;
      if (signal.type === "offer") {
        if (pc.signalingState !== "stable") return;
        await pc.setRemoteDescription(new RTCSessionDescription(signal.payload));
        await flushPendingIce(pc);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        await fetch(`/api/calls/${callId}/signal`, {
          method: "POST",
          headers: getUserHeaders(),
          body: JSON.stringify({ type: "answer", payload: answer }),
        });
      } else if (signal.type === "answer") {
        if (pc.signalingState === "have-local-offer") {
          await pc.setRemoteDescription(new RTCSessionDescription(signal.payload));
          await flushPendingIce(pc);
        }
      } else if (signal.type === "ice") {
        if (pc.remoteDescription) {
          await pc.addIceCandidate(new RTCIceCandidate(signal.payload));
        } else {
          pendingIceCandidatesRef.current.push(signal.payload);
        }
      }
    } catch (err) {
      console.warn("applySignal error:", err);
    }
  }, [getUserHeaders, flushPendingIce]);

  const createPeer = useCallback((callId: number): RTCPeerConnection => {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        fetch(`/api/calls/${callId}/signal`, {
          method: "POST",
          headers: getUserHeaders(),
          body: JSON.stringify({ type: "ice", payload: e.candidate }),
        }).catch(() => {});
      }
    };

    pc.ontrack = (e) => {
      if (e.streams?.[0]) setRemoteStream(e.streams[0]);
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "disconnected" || pc.connectionState === "failed") {
        cleanupCall();
      }
    };

    return pc;
  }, [getUserHeaders, cleanupCall]);

  const startCall = useCallback(async (calleeId: number, chatId: number | null, type: "audio" | "video") => {
    try {
      let stream: MediaStream;
      try {
        if (navigator.mediaDevices?.getUserMedia) {
          stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: type === "video" });
        } else {
          stream = createSilentStream();
        }
      } catch (mediaErr: any) {
        if (type === "video" && (mediaErr.name === "NotFoundError" || mediaErr.name === "DevicesNotFoundError")) {
          try {
            stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
          } catch {
            stream = createSilentStream();
          }
        } else {
          // Permission denied or any other error — proceed with silent stream so UI still works
          stream = createSilentStream();
        }
      }
      localStreamRef.current = stream;
      setLocalStream(stream);

      const res = await fetch("/api/calls", {
        method: "POST",
        headers: getUserHeaders(),
        body: JSON.stringify({ calleeId, ...(chatId != null ? { chatId } : {}), type }),
      });
      if (!res.ok) throw new Error("Failed to create call");
      const call: Call = await res.json();

      activeCallRef.current = call;
      setActiveCall(call);

      const pc = createPeer(call.id);
      peerRef.current = pc;
      stream.getTracks().forEach(track => pc.addTrack(track, stream));

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      await fetch(`/api/calls/${call.id}/signal`, {
        method: "POST",
        headers: getUserHeaders(),
        body: JSON.stringify({ type: "offer", payload: offer }),
      });

      ringTimeoutRef.current = setTimeout(async () => {
        if (activeCallRef.current?.id === call.id && activeCallRef.current?.status === "ringing") {
          try {
            await fetch(`/api/calls/${call.id}`, {
              method: "PUT",
              headers: getUserHeaders(),
              body: JSON.stringify({ status: "missed" }),
            });
          } catch {}
          cleanupCall();
        }
      }, 60_000);
    } catch (err: any) {
      console.error("startCall error:", err);
      cleanupCall();
      throw err;
    }
  }, [getUserHeaders, createPeer, cleanupCall]);

  const acceptCall = useCallback(async () => {
    const call = activeCallRef.current;
    if (!call) return;
    if (ringTimeoutRef.current) {
      clearTimeout(ringTimeoutRef.current);
      ringTimeoutRef.current = null;
    }
    try {
      let stream: MediaStream;
      try {
        stream = navigator.mediaDevices?.getUserMedia
          ? await navigator.mediaDevices.getUserMedia({ audio: true, video: call.type === "video" })
          : createSilentStream();
      } catch {
        stream = createSilentStream();
      }
      localStreamRef.current = stream;
      setLocalStream(stream);

      const pc = createPeer(call.id);
      peerRef.current = pc;
      stream.getTracks().forEach(track => pc.addTrack(track, stream));

      const pending = pendingSignalsRef.current.splice(0);
      for (const signal of pending) {
        await applySignal(pc, signal);
      }

      await fetch(`/api/calls/${call.id}`, {
        method: "PUT",
        headers: getUserHeaders(),
        body: JSON.stringify({ status: "active" }),
      });
      const updatedCall = { ...call, status: "active" as const };
      activeCallRef.current = updatedCall;
      setActiveCall(updatedCall);
    } catch (err) {
      console.error("acceptCall error:", err);
      cleanupCall();
    }
  }, [createPeer, applySignal, getUserHeaders, cleanupCall]);

  const declineCall = useCallback(async () => {
    const call = activeCallRef.current;
    if (!call) return;
    try {
      await fetch(`/api/calls/${call.id}`, {
        method: "PUT",
        headers: getUserHeaders(),
        body: JSON.stringify({ status: "declined" }),
      });
    } catch {}
    cleanupCall();
  }, [getUserHeaders, cleanupCall]);

  const hangUp = useCallback(async () => {
    const call = activeCallRef.current;
    if (!call) return;
    try {
      await fetch(`/api/calls/${call.id}`, {
        method: "PUT",
        headers: getUserHeaders(),
        body: JSON.stringify({ status: "ended" }),
      });
    } catch {}
    cleanupCall();
  }, [getUserHeaders, cleanupCall]);

  useEffect(() => {
    let es: EventSource | null = null;
    let retryTimeout: ReturnType<typeof setTimeout> | null = null;
    let dead = false;

    const connect = () => {
      if (dead) return;
      const uid = currentUserIdRef.current;
      const token = sessionStorage.getItem("pulse-token");
      const sseUrl = token
        ? `/api/users/me/events?_token=${encodeURIComponent(token)}`
        : `/api/users/me/events?_uid=${uid}`;
      es = new EventSource(sseUrl);

      es.addEventListener("incoming-call", (e: MessageEvent) => {
        try {
          const call = JSON.parse(e.data);
          setActiveCall(call);
        } catch {}
      });

      es.addEventListener("call-accepted", (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data);
          if (ringTimeoutRef.current) {
            clearTimeout(ringTimeoutRef.current);
            ringTimeoutRef.current = null;
          }
          setActiveCall(prev => prev ? { ...prev, status: "active", ...data } : null);
        } catch {}
      });

      es.addEventListener("call-declined", () => {
        cleanupCall();
      });

      es.addEventListener("call-ended", () => {
        cleanupCall();
      });

      es.addEventListener("new-message", (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data);
          window.dispatchEvent(new CustomEvent("pulse:new-message", { detail: data }));
          // Auto-deliver: tell the server the message reached this device
          // (even if the chat isn't open — upgrades ✓ sent → ✓✓ gray delivered)
          const token = sessionStorage.getItem("pulse-token");
          if (token && data.chatId) {
            fetch(`/api/chats/${data.chatId}/deliver`, {
              method: "POST",
              headers: { Authorization: `Bearer ${token}` },
            }).catch(() => {});
          }
        } catch {}
      });

      es.addEventListener("webrtc-signal", async (e: MessageEvent) => {
        try {
          const signal = JSON.parse(e.data);
          if (peerRef.current) {
            await applySignal(peerRef.current, signal);
          } else {
            pendingSignalsRef.current.push(signal);
          }
        } catch {}
      });

      es.addEventListener("p2p-signal", (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data);
          window.dispatchEvent(new CustomEvent("pulse:p2p-signal", { detail: data }));
        } catch {}
      });

      es.onerror = () => {
        es?.close();
        es = null;
        if (!dead) retryTimeout = setTimeout(connect, 3000);
      };
    };

    connect();

    return () => {
      dead = true;
      if (retryTimeout) clearTimeout(retryTimeout);
      es?.close();
    };
  }, [currentUserId, applySignal, cleanupCall]);

  const setTypingForChat = useCallback((chatId: number, names: string[], typingType?: string) => {
    setTypingByChat(prev => {
      const current = prev[chatId] || [];
      if (JSON.stringify(current) === JSON.stringify(names)) return prev;
      if (names.length === 0) {
        const next = { ...prev };
        delete next[chatId];
        return next;
      }
      return { ...prev, [chatId]: names };
    });
    setTypingTypeByChat(prev => {
      if (!typingType || names.length === 0) {
        const next = { ...prev };
        delete next[chatId];
        return next;
      }
      return { ...prev, [chatId]: typingType };
    });
  }, []);

  const switchAccount = useCallback((userId: number) => {
    setSavedAccounts(getSavedAccounts());
    onSwitchAccount(userId);
  }, [onSwitchAccount]);

  const removeAccount = useCallback((userId: number) => {
    onRemoveAccount(userId);
    setSavedAccounts(getSavedAccounts());
  }, [onRemoveAccount]);

  const openAddAccount = useCallback(() => {
    onOpenAddAccount();
  }, [onOpenAddAccount]);

  const canAddAccount = savedAccounts.length < MAX_ACCOUNTS;

  const state: AppState = {
    currentUserId,
    selectedChatId,
    setSelectedChatId,
    activeCall,
    setActiveCall,
    isDark,
    toggleTheme,
    logout,
    typingByChat,
    typingTypeByChat,
    setTypingForChat,
    savedAccounts,
    switchAccount,
    removeAccount,
    openAddAccount,
    canAddAccount,
    startCall,
    acceptCall,
    declineCall,
    hangUp,
    localStream,
    remoteStream,
  };

  return <AppContext.Provider value={state}>{children}</AppContext.Provider>;
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error("useAppContext must be used within an AppProvider");
  }
  return context;
}
