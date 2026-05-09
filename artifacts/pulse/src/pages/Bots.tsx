import React, { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bot, Plus, Trash2, RefreshCw, Copy, Check, ChevronRight,
  Code2, Webhook, Eye, EyeOff, Pencil, X, Terminal, ExternalLink,
  ChevronDown, ChevronUp, Zap, MessageSquare, Globe, Camera, MessageCircle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { useAppContext } from "@/contexts/AppContext";

function compressAvatar(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const size = 200;
      const canvas = document.createElement("canvas");
      canvas.width = size; canvas.height = size;
      const ctx = canvas.getContext("2d");
      if (!ctx) { reject(new Error("no ctx")); return; }
      const s = Math.min(img.width, img.height);
      const sx = (img.width - s) / 2, sy = (img.height - s) / 2;
      ctx.drawImage(img, sx, sy, s, s, 0, 0, size, size);
      resolve(canvas.toDataURL("image/jpeg", 0.82));
    };
    img.onerror = reject;
    img.src = url;
  });
}

function getUserIdHeader(): Record<string, string> {
  const token = localStorage.getItem("pulse-token");
  if (token) return { Authorization: `Bearer ${token}` };
  const uid = localStorage.getItem("pulse-user-id");
  return uid ? { "x-user-id": uid } : {};
}

interface BotRecord {
  id: number;
  bot_user_id: number;
  username: string;
  display_name: string;
  bio: string | null;
  avatar_color: string;
  avatar_url: string | null;
  token: string;
  webhook_url: string | null;
  created_at: string;
}

const PYTHON_EXAMPLE = (token: string, botName: string) => `# pip install pulse-bot
# (или скопируй pulse_bot.py ниже)

import pulse_bot

bot = pulse_bot.Bot("${token || 'ВАШ_ТОКЕН_БОТА'}")

@bot.message_handler()
def handle_message(message):
    chat_id = message["chat"]["id"]
    text = message.get("text", "")
    
    if text == "/start":
        bot.send_message(chat_id, 
            f"Привет! Я ${botName || 'PulseBot'} 🤖\\n"
            "Напиши мне что-нибудь, и я отвечу!")
    elif text == "/help":
        bot.send_message(chat_id,
            "Доступные команды:\\n"
            "/start — Начать\\n"
            "/help — Помощь")
    else:
        bot.send_message(chat_id, f"Ты написал: {text}")

bot.polling()
`;

const PULSE_BOT_PY = `"""
pulse_bot.py — Python SDK для Pulse Messenger Bot API
Совместим с Telegram Bot API (polling + webhook)

Использование:
    import pulse_bot
    bot = pulse_bot.Bot("TOKEN")

    @bot.message_handler()
    def on_message(msg):
        bot.send_message(msg["chat"]["id"], "Привет!")

    bot.polling()
"""

import time
import threading
import requests
from typing import Callable, Optional

BASE_URL = "https://YOUR_PULSE_DOMAIN/bot"


class Bot:
    def __init__(self, token: str, base_url: str = BASE_URL):
        self.token = token
        self.base_url = base_url.rstrip("/")
        self._handlers: list[Callable] = []
        self._offset = 0
        self._running = False

    def _url(self, method: str) -> str:
        return f"{self.base_url}/{self.token}/{method}"

    def _get(self, method: str, **params):
        r = requests.get(self._url(method), params=params, timeout=35)
        data = r.json()
        if not data.get("ok"):
            raise RuntimeError(data.get("description", "API error"))
        return data["result"]

    def _post(self, method: str, **kwargs):
        r = requests.post(self._url(method), json=kwargs, timeout=10)
        data = r.json()
        if not data.get("ok"):
            raise RuntimeError(data.get("description", "API error"))
        return data["result"]

    # ── Bot info ────────────────────────────────────────────────

    def get_me(self):
        """Возвращает информацию о боте."""
        return self._get("getMe")

    # ── Sending ──────────────────────────────────────────────────

    def send_message(self, chat_id: int, text: str,
                     reply_to_message_id: Optional[int] = None,
                     parse_mode: Optional[str] = None) -> dict:
        """Отправить текстовое сообщение."""
        kwargs = {"chat_id": chat_id, "text": text}
        if reply_to_message_id:
            kwargs["reply_to_message_id"] = reply_to_message_id
        if parse_mode:
            kwargs["parse_mode"] = parse_mode
        return self._post("sendMessage", **kwargs)

    def send_photo(self, chat_id: int, photo: str,
                   caption: Optional[str] = None) -> dict:
        """Отправить фото по URL."""
        kwargs = {"chat_id": chat_id, "photo": photo}
        if caption:
            kwargs["caption"] = caption
        return self._post("sendPhoto", **kwargs)

    # ── Chat info ────────────────────────────────────────────────

    def get_chat(self, chat_id: int) -> dict:
        """Получить информацию о чате."""
        return self._get("getChat", chat_id=chat_id)

    def leave_chat(self, chat_id: int) -> bool:
        """Покинуть чат."""
        return self._post("leaveChat", chat_id=chat_id)

    # ── Webhook ──────────────────────────────────────────────────

    def set_webhook(self, url: str, secret_token: Optional[str] = None):
        """Установить webhook URL."""
        kwargs = {"url": url}
        if secret_token:
            kwargs["secret_token"] = secret_token
        return self._post("setWebhook", **kwargs)

    def delete_webhook(self):
        """Удалить webhook."""
        return self._post("deleteWebhook")

    def get_webhook_info(self) -> dict:
        """Получить информацию о webhook."""
        return self._get("getWebhookInfo")

    # ── Updates / Polling ────────────────────────────────────────

    def get_updates(self, offset: int = 0, limit: int = 100,
                    timeout: int = 30) -> list:
        """Получить новые обновления (long polling)."""
        return self._get("getUpdates", offset=offset,
                         limit=limit, timeout=timeout)

    def message_handler(self, commands: Optional[list] = None):
        """Декоратор для обработки входящих сообщений."""
        def decorator(fn: Callable):
            self._handlers.append((commands, fn))
            return fn
        return decorator

    def _process_update(self, update: dict):
        message = update.get("message")
        if not message:
            return
        text = message.get("text", "")
        for commands, handler in self._handlers:
            if commands is None:
                handler(message)
                return
            for cmd in commands:
                if text.startswith(cmd):
                    handler(message)
                    return

    def polling(self, interval: float = 1.0, none_stop: bool = False):
        """Запустить long-polling (блокирует поток)."""
        self._running = True
        print(f"[pulse_bot] Polling started for @{self.get_me()['username']}")
        while self._running:
            try:
                updates = self.get_updates(
                    offset=self._offset, limit=100, timeout=30
                )
                for upd in updates:
                    self._offset = upd["update_id"] + 1
                    try:
                        self._process_update(upd)
                    except Exception as e:
                        print(f"[pulse_bot] Handler error: {e}")
            except KeyboardInterrupt:
                print("[pulse_bot] Stopped.")
                break
            except Exception as e:
                print(f"[pulse_bot] Polling error: {e}")
                if not none_stop:
                    time.sleep(interval)

    def stop_polling(self):
        self._running = False
`;

export default function Bots() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { setSelectedChatId } = useAppContext() as any;
  const [bots, setBots] = useState<BotRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newUsername, setNewUsername] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [selectedBot, setSelectedBot] = useState<BotRecord | null>(null);
  const [showToken, setShowToken] = useState<Record<number, boolean>>({});
  const [copied, setCopied] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"bots" | "sdk">("bots");
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [regenerating, setRegenerating] = useState<number | null>(null);
  const [editBot, setEditBot] = useState<BotRecord | null>(null);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [expandedExample, setExpandedExample] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState<number | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const avatarUploadBotRef = useRef<number | null>(null);

  const fetchBots = useCallback(async () => {
    try {
      const res = await fetch("/api/bots", { headers: getUserIdHeader() });
      if (res.ok) setBots(await res.json());
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { fetchBots(); }, [fetchBots]);

  const copyText = (text: string, key: string) => {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleCreate = async () => {
    if (!newName.trim() || !newUsername.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/bots", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getUserIdHeader() },
        body: JSON.stringify({ name: newName.trim(), username: newUsername.trim(), description: newDesc.trim() || undefined }),
      });
      const data = await res.json();
      if (res.ok) {
        toast({ title: `Бот @${data.username} создан!`, description: "Токен сгенерирован и готов к использованию" });
        setShowCreate(false);
        setNewName(""); setNewUsername(""); setNewDesc("");
        await fetchBots();
      } else {
        toast({ title: "Ошибка", description: data.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Ошибка сети", variant: "destructive" });
    }
    setCreating(false);
  };

  const handleDelete = async (bot: BotRecord) => {
    if (!window.confirm(`Удалить бота @${bot.username}? Это действие нельзя отменить.`)) return;
    setDeletingId(bot.bot_user_id);
    try {
      const res = await fetch(`/api/bots/${bot.bot_user_id}`, {
        method: "DELETE",
        headers: getUserIdHeader(),
      });
      if (res.ok || res.status === 204) {
        toast({ title: `Бот @${bot.username} удалён` });
        setBots(prev => prev.filter(b => b.bot_user_id !== bot.bot_user_id));
        if (selectedBot?.bot_user_id === bot.bot_user_id) setSelectedBot(null);
      } else {
        const d = await res.json();
        toast({ title: "Ошибка", description: d.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Ошибка сети", variant: "destructive" });
    }
    setDeletingId(null);
  };

  const handleRegenerate = async (bot: BotRecord) => {
    if (!window.confirm("Сгенерировать новый токен? Старый токен перестанет работать.")) return;
    setRegenerating(bot.bot_user_id);
    try {
      const res = await fetch(`/api/bots/${bot.bot_user_id}/token`, {
        method: "POST",
        headers: getUserIdHeader(),
      });
      if (res.ok) {
        const data = await res.json();
        setBots(prev => prev.map(b => b.bot_user_id === bot.bot_user_id ? { ...b, token: data.token } : b));
        if (selectedBot?.bot_user_id === bot.bot_user_id) setSelectedBot(prev => prev ? { ...prev, token: data.token } : null);
        toast({ title: "Токен обновлён", description: "Старый токен больше не действителен" });
      }
    } catch {
      toast({ title: "Ошибка сети", variant: "destructive" });
    }
    setRegenerating(null);
  };

  const handleEdit = async () => {
    if (!editBot || !editName.trim()) return;
    try {
      const res = await fetch(`/api/bots/${editBot.bot_user_id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...getUserIdHeader() },
        body: JSON.stringify({ name: editName.trim(), description: editDesc.trim() || "" }),
      });
      if (res.ok) {
        await fetchBots();
        toast({ title: "Бот обновлён" });
        setEditBot(null);
      }
    } catch {
      toast({ title: "Ошибка сети", variant: "destructive" });
    }
  };

  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const botId = avatarUploadBotRef.current;
    if (!file || !botId) return;
    setUploadingAvatar(botId);
    try {
      const compressed = await compressAvatar(file);
      const res = await fetch(`/api/bots/${botId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...getUserIdHeader() },
        body: JSON.stringify({ avatarUrl: compressed }),
      });
      if (res.ok) {
        setBots(prev => prev.map(b => b.bot_user_id === botId ? { ...b, avatar_url: compressed } : b));
        toast({ title: "Фото обновлено" });
      }
    } catch {
      toast({ title: "Ошибка загрузки фото", variant: "destructive" });
    }
    setUploadingAvatar(null);
    e.target.value = "";
  };

  const handleStartChat = async (bot: BotRecord) => {
    try {
      const res = await fetch("/api/chats/direct", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getUserIdHeader() },
        body: JSON.stringify({ userId: bot.bot_user_id }),
      });
      if (res.ok) {
        const chat = await res.json();
        setLocation("/");
        setTimeout(() => {
          if (setSelectedChatId) setSelectedChatId(chat.id);
          else window.dispatchEvent(new CustomEvent("open-chat", { detail: chat.id }));
        }, 80);
      }
    } catch {
      toast({ title: "Ошибка открытия чата", variant: "destructive" });
    }
  };

  const host = window.location.origin;
  const botSelected = selectedBot ? bots.find(b => b.bot_user_id === selectedBot.bot_user_id) || selectedBot : null;

  return (
    <div className="min-h-full bg-background">
      <input
        ref={avatarInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleAvatarFileChange}
      />

      {/* Hero Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-violet-900/40 via-indigo-900/30 to-background border-b border-border">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/4 w-72 h-72 bg-violet-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl" />
        </div>
        <div className="relative px-6 pt-8 pb-6 max-w-5xl mx-auto">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-[0_0_30px_rgba(139,92,246,0.4)]">
                <Bot size={28} className="text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-black text-foreground">Pulse BotFather</h1>
                <p className="text-sm text-muted-foreground mt-0.5">Платформа для разработчиков ботов</p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setActiveTab("bots")}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${activeTab === "bots" ? "bg-violet-500 text-white shadow-[0_0_15px_rgba(139,92,246,0.4)]" : "text-muted-foreground hover:text-foreground hover:bg-white/5"}`}
              >
                Мои боты
              </button>
              <button
                onClick={() => setActiveTab("sdk")}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${activeTab === "sdk" ? "bg-violet-500 text-white shadow-[0_0_15px_rgba(139,92,246,0.4)]" : "text-muted-foreground hover:text-foreground hover:bg-white/5"}`}
              >
                Python SDK
              </button>
            </div>
          </div>

          {/* Feature cards */}
          <div className="grid grid-cols-3 gap-3 mt-6">
            {[
              {
                icon: <MessageSquare size={20} />,
                label: "Сообщения",
                desc: "Получай и отправляй сообщения через простой API",
                color: "from-cyan-500/20 to-blue-500/10 border-cyan-500/20",
                iconColor: "text-cyan-400",
                glow: "rgba(6,182,212,0.15)",
              },
              {
                icon: <Webhook size={20} />,
                label: "Webhook",
                desc: "Реалтайм события — получай апдейты мгновенно",
                color: "from-violet-500/20 to-purple-500/10 border-violet-500/20",
                iconColor: "text-violet-400",
                glow: "rgba(139,92,246,0.15)",
              },
              {
                icon: <Globe size={20} />,
                label: "Long Polling",
                desc: "Классический polling API — совместим с Telegram SDK",
                color: "from-emerald-500/20 to-green-500/10 border-emerald-500/20",
                iconColor: "text-emerald-400",
                glow: "rgba(16,185,129,0.15)",
              },
            ].map(item => (
              <div
                key={item.label}
                className={`bg-gradient-to-br ${item.color} border rounded-2xl p-4`}
                style={{ boxShadow: `0 0 20px ${item.glow}` }}
              >
                <div className={`${item.iconColor} mb-3`}>{item.icon}</div>
                <p className="font-bold text-foreground text-sm mb-1">{item.label}</p>
                <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto p-6 space-y-5">
        <AnimatePresence mode="wait">
          {/* ── MY BOTS TAB ── */}
          {activeTab === "bots" && (
            <motion.div key="bots" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
              {/* Create Bot Button */}
              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                onClick={() => setShowCreate(true)}
                className="w-full flex items-center justify-between p-5 bg-gradient-to-r from-violet-500/10 to-indigo-500/10 border border-violet-500/30 rounded-2xl hover:from-violet-500/15 hover:to-indigo-500/15 transition-all shadow-[0_0_20px_rgba(139,92,246,0.08)]"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-[0_0_20px_rgba(139,92,246,0.3)]">
                    <Plus size={22} className="text-white" />
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-foreground text-base">Создать нового бота</p>
                    <p className="text-sm text-muted-foreground">Получить токен и начать разработку</p>
                  </div>
                </div>
                <ChevronRight size={20} className="text-muted-foreground" />
              </motion.button>

              {/* Bots list */}
              {loading ? (
                <div className="flex items-center justify-center py-16">
                  <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}>
                    <RefreshCw size={24} className="text-muted-foreground" />
                  </motion.div>
                </div>
              ) : bots.length === 0 ? (
                <div className="text-center py-16 bg-card border border-border rounded-2xl">
                  <div className="w-16 h-16 rounded-2xl bg-muted mx-auto flex items-center justify-center mb-4">
                    <Bot size={32} className="text-muted-foreground opacity-50" />
                  </div>
                  <p className="font-bold text-foreground text-lg">Ботов пока нет</p>
                  <p className="text-sm text-muted-foreground mt-2 max-w-xs mx-auto">Создай своего первого бота и начни автоматизировать чаты в Pulse</p>
                  <button
                    onClick={() => setShowCreate(true)}
                    className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 bg-violet-500 hover:bg-violet-400 text-white rounded-xl font-semibold text-sm transition-colors shadow-[0_0_20px_rgba(139,92,246,0.3)]"
                  >
                    <Plus size={16} /> Создать бота
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {bots.map(bot => (
                    <motion.div
                      key={bot.bot_user_id}
                      layout
                      className="bg-card rounded-2xl border border-border overflow-hidden"
                    >
                      <button
                        className="w-full flex items-center gap-4 p-5 hover:bg-secondary/40 transition-colors text-left"
                        onClick={() => setSelectedBot(prev => prev?.bot_user_id === bot.bot_user_id ? null : bot)}
                      >
                        <div
                          className="relative w-14 h-14 rounded-2xl flex items-center justify-center text-white font-black text-xl shrink-0 overflow-hidden group/av cursor-pointer"
                          style={{ background: bot.avatar_color }}
                          onClick={(e) => {
                            e.stopPropagation();
                            avatarUploadBotRef.current = bot.bot_user_id;
                            avatarInputRef.current?.click();
                          }}
                        >
                          {bot.avatar_url
                            ? <img src={bot.avatar_url} alt="" className="w-full h-full object-cover" />
                            : bot.display_name[0]?.toUpperCase()}
                          <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover/av:opacity-100 transition-opacity rounded-2xl">
                            {uploadingAvatar === bot.bot_user_id
                              ? <RefreshCw size={16} className="text-white animate-spin" />
                              : <Camera size={16} className="text-white" />}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <p className="font-bold text-foreground text-base truncate">{bot.display_name}</p>
                            <span className="text-[10px] font-bold bg-blue-500/15 text-blue-400 px-2 py-0.5 rounded-full shrink-0">BOT</span>
                          </div>
                          <p className="text-sm text-muted-foreground">@{bot.username}</p>
                          {bot.bio && <p className="text-xs text-muted-foreground mt-1 truncate">{bot.bio}</p>}
                        </div>
                        <div className="shrink-0 text-muted-foreground">
                          {selectedBot?.bot_user_id === bot.bot_user_id
                            ? <ChevronUp size={18} />
                            : <ChevronDown size={18} />}
                        </div>
                      </button>

                      <AnimatePresence>
                        {selectedBot?.bot_user_id === bot.bot_user_id && botSelected && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="px-5 pb-5 space-y-4 border-t border-border pt-4">
                              {/* Token */}
                              <div>
                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Токен API</p>
                                <div className="flex items-center gap-2 bg-muted/40 rounded-xl px-4 py-3">
                                  <code className="flex-1 text-sm text-foreground font-mono break-all select-all">
                                    {showToken[bot.bot_user_id] ? botSelected.token : "•".repeat(32)}
                                  </code>
                                  <div className="flex gap-1 shrink-0">
                                    <button onClick={() => setShowToken(p => ({ ...p, [bot.bot_user_id]: !p[bot.bot_user_id] }))} className="p-2 hover:bg-secondary rounded-lg transition-colors">
                                      {showToken[bot.bot_user_id] ? <EyeOff size={15} className="text-muted-foreground" /> : <Eye size={15} className="text-muted-foreground" />}
                                    </button>
                                    <button onClick={() => copyText(botSelected.token, `token-${bot.bot_user_id}`)} className="p-2 hover:bg-secondary rounded-lg transition-colors">
                                      {copied === `token-${bot.bot_user_id}` ? <Check size={15} className="text-green-400" /> : <Copy size={15} className="text-muted-foreground" />}
                                    </button>
                                  </div>
                                </div>
                              </div>

                              {/* API URL */}
                              <div>
                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Base URL</p>
                                <div className="flex items-center gap-2 bg-muted/40 rounded-xl px-4 py-3">
                                  <code className="flex-1 text-sm text-foreground font-mono truncate">{host}/bot/{botSelected.token.substring(0, 14)}...</code>
                                  <button onClick={() => copyText(`${host}/bot/${botSelected.token}`, `url-${bot.bot_user_id}`)} className="p-2 hover:bg-secondary rounded-lg transition-colors shrink-0">
                                    {copied === `url-${bot.bot_user_id}` ? <Check size={15} className="text-green-400" /> : <Copy size={15} className="text-muted-foreground" />}
                                  </button>
                                </div>
                              </div>

                              {/* Quick example */}
                              <div>
                                <div className="flex items-center justify-between mb-2">
                                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Python пример</p>
                                  <button onClick={() => setExpandedExample(p => !p)} className="text-xs text-primary hover:underline">
                                    {expandedExample ? "Скрыть" : "Показать"}
                                  </button>
                                </div>
                                {expandedExample && (
                                  <div className="relative bg-[#0d1117] rounded-xl p-4 overflow-auto max-h-64">
                                    <button
                                      onClick={() => copyText(PYTHON_EXAMPLE(botSelected.token, botSelected.display_name), `ex-${bot.bot_user_id}`)}
                                      className="absolute top-3 right-3 p-1.5 bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
                                    >
                                      {copied === `ex-${bot.bot_user_id}` ? <Check size={13} className="text-green-400" /> : <Copy size={13} className="text-white/60" />}
                                    </button>
                                    <pre className="text-xs text-green-300 font-mono whitespace-pre-wrap leading-relaxed">
                                      {PYTHON_EXAMPLE(botSelected.token, botSelected.display_name)}
                                    </pre>
                                  </div>
                                )}
                              </div>

                              {/* Actions */}
                              <div className="flex flex-wrap gap-2 pt-1">
                                <button
                                  onClick={() => handleStartChat(bot)}
                                  className="flex items-center gap-2 px-4 py-2.5 bg-primary/10 hover:bg-primary/15 border border-primary/20 rounded-xl text-sm font-medium text-primary transition-colors"
                                >
                                  <MessageCircle size={14} /> Написать
                                </button>
                                <button
                                  onClick={() => { setEditBot(bot); setEditName(bot.display_name); setEditDesc(bot.bio || ""); }}
                                  className="flex items-center gap-2 px-4 py-2.5 bg-secondary hover:bg-secondary/70 rounded-xl text-sm font-medium text-foreground transition-colors"
                                >
                                  <Pencil size={14} /> Изменить
                                </button>
                                <button
                                  onClick={() => handleRegenerate(bot)}
                                  disabled={regenerating === bot.bot_user_id}
                                  className="flex items-center gap-2 px-4 py-2.5 bg-amber-500/10 hover:bg-amber-500/15 border border-amber-500/20 rounded-xl text-sm font-medium text-amber-400 transition-colors disabled:opacity-50"
                                >
                                  <RefreshCw size={14} className={regenerating === bot.bot_user_id ? "animate-spin" : ""} />
                                  Новый токен
                                </button>
                                <button
                                  onClick={() => handleDelete(bot)}
                                  disabled={deletingId === bot.bot_user_id}
                                  className="flex items-center gap-2 px-4 py-2.5 bg-destructive/10 hover:bg-destructive/15 border border-destructive/20 rounded-xl text-sm font-medium text-destructive transition-colors disabled:opacity-50 ml-auto"
                                >
                                  <Trash2 size={14} /> Удалить
                                </button>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* ── PYTHON SDK TAB ── */}
          {activeTab === "sdk" && (
            <motion.div key="sdk" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-5">

              {/* SDK Banner */}
              <div className="bg-gradient-to-r from-violet-500/10 to-indigo-500/10 border border-violet-500/20 rounded-2xl p-5 flex items-center gap-5">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500/20 to-indigo-500/20 border border-violet-500/30 flex items-center justify-center shrink-0">
                  <Terminal size={26} className="text-violet-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-foreground text-lg">pulse_bot.py</span>
                    <span className="text-xs bg-violet-500/20 text-violet-300 px-2.5 py-0.5 rounded-full font-medium">Python SDK</span>
                  </div>
                  <p className="text-sm text-muted-foreground">Telegram-совместимый Python SDK для Pulse ботов. Поддерживает polling, webhook и все основные методы API.</p>
                </div>
                <button
                  onClick={() => {
                    const blob = new Blob([PULSE_BOT_PY.replace("https://YOUR_PULSE_DOMAIN", host)], { type: "text/plain" });
                    const a = document.createElement("a");
                    a.href = URL.createObjectURL(blob);
                    a.download = "pulse_bot.py";
                    a.click();
                    toast({ title: "Скачивание начато", description: "pulse_bot.py сохранён" });
                  }}
                  className="shrink-0 flex items-center gap-2 px-4 py-2.5 bg-violet-500 hover:bg-violet-400 text-white rounded-xl text-sm font-semibold transition-colors shadow-[0_0_15px_rgba(139,92,246,0.3)]"
                >
                  <ExternalLink size={14} /> Скачать SDK
                </button>
              </div>

              {/* Two-column layout */}
              <div className="grid grid-cols-2 gap-5">
                {/* Left: API Reference */}
                <div className="bg-card rounded-2xl border border-border p-5 space-y-1">
                  <div className="flex items-center gap-2 mb-4">
                    <Code2 size={16} className="text-primary" />
                    <p className="font-bold text-base text-foreground">API Методы</p>
                  </div>
                  {[
                    { method: "getMe", desc: "Информация о боте", type: "GET" },
                    { method: "getUpdates", desc: "Получить обновления (polling)", type: "GET" },
                    { method: "sendMessage", desc: "Отправить сообщение", type: "POST" },
                    { method: "sendPhoto", desc: "Отправить фото по URL", type: "POST" },
                    { method: "setWebhook", desc: "Установить webhook", type: "POST" },
                    { method: "deleteWebhook", desc: "Удалить webhook", type: "POST" },
                    { method: "getWebhookInfo", desc: "Статус webhook", type: "GET" },
                    { method: "getChat", desc: "Информация о чате", type: "GET" },
                    { method: "leaveChat", desc: "Покинуть чат", type: "POST" },
                  ].map(m => (
                    <div key={m.method} className="flex items-center gap-3 py-2 border-b border-border/60 last:border-0">
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded shrink-0 ${m.type === "GET" ? "bg-green-500/15 text-green-400" : "bg-blue-500/15 text-blue-400"}`}>
                        {m.type}
                      </span>
                      <code className="text-sm font-mono text-primary w-36 shrink-0">{m.method}</code>
                      <span className="text-xs text-muted-foreground">{m.desc}</span>
                    </div>
                  ))}

                  <div className="pt-3">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Base URL</p>
                    <div className="flex items-center gap-2 bg-muted/40 rounded-xl px-3 py-2.5">
                      <code className="flex-1 text-xs font-mono text-foreground break-all">{host}/bot/{"<TOKEN>"}/<span className="text-primary">METHOD</span></code>
                      <button onClick={() => copyText(`${host}/bot/`, "baseurl")} className="p-1.5 hover:bg-secondary rounded-lg transition-colors shrink-0">
                        {copied === "baseurl" ? <Check size={13} className="text-green-400" /> : <Copy size={13} className="text-muted-foreground" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Right: Quick-start example */}
                <div className="bg-card rounded-2xl border border-border overflow-hidden flex flex-col">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-[#0d1117]">
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1.5">
                        <div className="w-3 h-3 rounded-full bg-red-500/80" />
                        <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                        <div className="w-3 h-3 rounded-full bg-green-500/80" />
                      </div>
                      <span className="text-sm text-white/50 font-mono">my_bot.py</span>
                    </div>
                    <button
                      onClick={() => copyText(PYTHON_EXAMPLE(bots[0]?.token || "ВАШ_ТОКЕН_БОТА", bots[0]?.display_name || "PulseBot"), "quickex")}
                      className="flex items-center gap-1.5 text-xs text-white/60 hover:text-white/90 transition-colors"
                    >
                      {copied === "quickex" ? <><Check size={12} className="text-green-400" /> Скопировано</> : <><Copy size={12} /> Скопировать</>}
                    </button>
                  </div>
                  <div className="bg-[#0d1117] p-5 flex-1 overflow-auto">
                    <pre className="text-sm text-green-300 font-mono whitespace-pre-wrap leading-relaxed">
                      {PYTHON_EXAMPLE(bots[0]?.token || "ВАШ_ТОКЕН_БОТА", bots[0]?.display_name || "PulseBot")}
                    </pre>
                  </div>
                </div>
              </div>

              {/* pulse_bot.py source preview */}
              <div className="bg-card rounded-2xl border border-border overflow-hidden">
                <div className="flex items-center justify-between px-5 py-3.5 border-b border-border bg-[#0d1117]">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-red-500/80" />
                      <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                      <div className="w-3 h-3 rounded-full bg-green-500/80" />
                    </div>
                    <span className="text-sm text-white/50 font-mono">pulse_bot.py</span>
                    <span className="text-xs text-white/30 font-mono ml-2">— Pulse Bot SDK</span>
                  </div>
                  <button
                    onClick={() => {
                      const blob = new Blob([PULSE_BOT_PY.replace("https://YOUR_PULSE_DOMAIN", host)], { type: "text/plain" });
                      const a = document.createElement("a");
                      a.href = URL.createObjectURL(blob);
                      a.download = "pulse_bot.py";
                      a.click();
                      toast({ title: "Скачивание начато", description: "pulse_bot.py сохранён" });
                    }}
                    className="flex items-center gap-1.5 text-xs text-white/60 hover:text-white/90 transition-colors"
                  >
                    <ExternalLink size={12} /> Скачать полный файл
                  </button>
                </div>
                <div className="bg-[#0d1117] p-5 overflow-auto max-h-80">
                  <pre className="text-xs text-green-300 font-mono whitespace-pre leading-relaxed">
                    {PULSE_BOT_PY.replace("https://YOUR_PULSE_DOMAIN", host).substring(0, 1200)}
                    <span className="text-white/30">{"\n"}... (скачай файл для полного кода)</span>
                  </pre>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Create Bot Modal */}
      <AnimatePresence>
        {showCreate && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
            onClick={e => { if (e.target === e.currentTarget) setShowCreate(false); }}
          >
            <motion.div
              initial={{ y: 40, opacity: 0, scale: 0.97 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 20, opacity: 0 }}
              className="bg-card rounded-2xl border border-border p-5 w-full max-w-md space-y-4"
            >
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-foreground">Создать бота</h2>
                <button onClick={() => setShowCreate(false)} className="p-2 hover:bg-secondary rounded-xl transition-colors">
                  <X size={16} />
                </button>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Имя бота</label>
                  <input
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    placeholder="Мой Бот"
                    className="w-full bg-muted/40 border border-border rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Username <span className="text-muted-foreground/60">(должен заканчиваться на «bot»)</span></label>
                  <div className="flex items-center gap-2 bg-muted/40 border border-border rounded-xl px-3 py-2.5 focus-within:border-primary transition-colors">
                    <span className="text-muted-foreground text-sm">@</span>
                    <input
                      value={newUsername}
                      onChange={e => setNewUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                      placeholder="myawesomebot"
                      className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                    />
                  </div>
                  {newUsername && !/bot$/i.test(newUsername) && (
                    <p className="text-[10px] text-amber-400 mt-1">Username должен заканчиваться на «bot»</p>
                  )}
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Описание <span className="text-muted-foreground/60">(необязательно)</span></label>
                  <textarea
                    value={newDesc}
                    onChange={e => setNewDesc(e.target.value)}
                    placeholder="Что умеет ваш бот..."
                    rows={2}
                    className="w-full bg-muted/40 border border-border rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors resize-none"
                  />
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => setShowCreate(false)}
                  className="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:bg-secondary transition-colors"
                >
                  Отмена
                </button>
                <button
                  onClick={handleCreate}
                  disabled={creating || !newName.trim() || !/bot$/i.test(newUsername)}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-violet-500 to-indigo-600 text-white text-sm font-bold hover:opacity-90 transition-all disabled:opacity-50"
                >
                  {creating ? "Создаём..." : "Создать бота"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Bot Modal */}
      <AnimatePresence>
        {editBot && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
            onClick={e => { if (e.target === e.currentTarget) setEditBot(null); }}
          >
            <motion.div
              initial={{ y: 40, opacity: 0, scale: 0.97 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 20, opacity: 0 }}
              className="bg-card rounded-2xl border border-border p-5 w-full max-w-md space-y-4"
            >
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-foreground">Изменить @{editBot.username}</h2>
                <button onClick={() => setEditBot(null)} className="p-2 hover:bg-secondary rounded-xl transition-colors">
                  <X size={16} />
                </button>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Имя бота</label>
                  <input
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    className="w-full bg-muted/40 border border-border rounded-xl px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary transition-colors"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Описание</label>
                  <textarea
                    value={editDesc}
                    onChange={e => setEditDesc(e.target.value)}
                    rows={2}
                    className="w-full bg-muted/40 border border-border rounded-xl px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary transition-colors resize-none"
                  />
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <button onClick={() => setEditBot(null)} className="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:bg-secondary transition-colors">Отмена</button>
                <button onClick={handleEdit} className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 transition-all">Сохранить</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
