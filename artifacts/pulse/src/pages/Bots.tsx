import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bot, Plus, Trash2, RefreshCw, Copy, Check, ChevronRight,
  Code2, Webhook, Eye, EyeOff, Pencil, X, Terminal, ExternalLink,
  ChevronDown, ChevronUp, Zap, MessageSquare, Globe
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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

  const host = window.location.origin;
  const botSelected = selectedBot ? bots.find(b => b.bot_user_id === selectedBot.bot_user_id) || selectedBot : null;

  return (
    <div className="min-h-full bg-background">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-card/95 backdrop-blur-md border-b border-border px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
              <Bot size={16} className="text-white" />
            </div>
            <div>
              <h1 className="font-bold text-foreground text-sm leading-none">Pulse BotFather</h1>
              <p className="text-[10px] text-muted-foreground">Платформа для разработчиков</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setActiveTab("bots")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${activeTab === "bots" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-secondary"}`}
            >
              Мои боты
            </button>
            <button
              onClick={() => setActiveTab("sdk")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${activeTab === "sdk" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-secondary"}`}
            >
              Python SDK
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-4 space-y-4">
        <AnimatePresence mode="wait">
          {/* ── MY BOTS TAB ── */}
          {activeTab === "bots" && (
            <motion.div key="bots" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-3">
              {/* Create Bot Button */}
              <button
                onClick={() => setShowCreate(true)}
                className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-violet-500/10 to-indigo-500/10 border border-violet-500/20 rounded-2xl hover:from-violet-500/15 hover:to-indigo-500/15 transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
                    <Plus size={16} className="text-white" />
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-foreground text-sm">Создать нового бота</p>
                    <p className="text-xs text-muted-foreground">Получить токен и начать разработку</p>
                  </div>
                </div>
                <ChevronRight size={16} className="text-muted-foreground" />
              </button>

              {/* Bots list */}
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}>
                    <RefreshCw size={20} className="text-muted-foreground" />
                  </motion.div>
                </div>
              ) : bots.length === 0 ? (
                <div className="text-center py-12">
                  <Bot size={40} className="text-muted-foreground mx-auto mb-3 opacity-50" />
                  <p className="font-medium text-foreground">Ботов пока нет</p>
                  <p className="text-sm text-muted-foreground mt-1">Создай своего первого бота и начни автоматизировать</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {bots.map(bot => (
                    <motion.div
                      key={bot.bot_user_id}
                      layout
                      className="bg-card rounded-2xl border border-border overflow-hidden"
                    >
                      <button
                        className="w-full flex items-center gap-3 p-4 hover:bg-secondary/50 transition-colors text-left"
                        onClick={() => setSelectedBot(prev => prev?.bot_user_id === bot.bot_user_id ? null : bot)}
                      >
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-base shrink-0"
                          style={{ background: bot.avatar_color }}
                        >
                          {bot.display_name[0]?.toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="font-bold text-foreground text-sm truncate">{bot.display_name}</p>
                            <span className="text-[9px] font-bold bg-blue-500/15 text-blue-400 px-1.5 py-0.5 rounded-full shrink-0">BOT</span>
                          </div>
                          <p className="text-xs text-muted-foreground">@{bot.username}</p>
                        </div>
                        {selectedBot?.bot_user_id === bot.bot_user_id
                          ? <ChevronUp size={15} className="text-muted-foreground shrink-0" />
                          : <ChevronDown size={15} className="text-muted-foreground shrink-0" />
                        }
                      </button>

                      <AnimatePresence>
                        {selectedBot?.bot_user_id === bot.bot_user_id && botSelected && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="px-4 pb-4 space-y-3 border-t border-border pt-3">
                              {/* Token */}
                              <div>
                                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Токен</p>
                                <div className="flex items-center gap-2 bg-muted/40 rounded-xl px-3 py-2">
                                  <code className="flex-1 text-xs text-foreground font-mono break-all select-all">
                                    {showToken[bot.bot_user_id] ? botSelected.token : "•".repeat(24)}
                                  </code>
                                  <div className="flex gap-1 shrink-0">
                                    <button onClick={() => setShowToken(p => ({ ...p, [bot.bot_user_id]: !p[bot.bot_user_id] }))} className="p-1.5 hover:bg-secondary rounded-lg transition-colors">
                                      {showToken[bot.bot_user_id] ? <EyeOff size={13} className="text-muted-foreground" /> : <Eye size={13} className="text-muted-foreground" />}
                                    </button>
                                    <button onClick={() => copyText(botSelected.token, `token-${bot.bot_user_id}`)} className="p-1.5 hover:bg-secondary rounded-lg transition-colors">
                                      {copied === `token-${bot.bot_user_id}` ? <Check size={13} className="text-green-400" /> : <Copy size={13} className="text-muted-foreground" />}
                                    </button>
                                  </div>
                                </div>
                              </div>

                              {/* API URL */}
                              <div>
                                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Base URL</p>
                                <div className="flex items-center gap-2 bg-muted/40 rounded-xl px-3 py-2">
                                  <code className="flex-1 text-xs text-foreground font-mono truncate">{host}/bot/{botSelected.token.substring(0, 12)}...</code>
                                  <button onClick={() => copyText(`${host}/bot/${botSelected.token}`, `url-${bot.bot_user_id}`)} className="p-1.5 hover:bg-secondary rounded-lg transition-colors shrink-0">
                                    {copied === `url-${bot.bot_user_id}` ? <Check size={13} className="text-green-400" /> : <Copy size={13} className="text-muted-foreground" />}
                                  </button>
                                </div>
                              </div>

                              {/* Quick example */}
                              <div>
                                <div className="flex items-center justify-between mb-1.5">
                                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Python пример</p>
                                  <button onClick={() => setExpandedExample(p => !p)} className="text-[10px] text-primary">
                                    {expandedExample ? "Скрыть" : "Показать"}
                                  </button>
                                </div>
                                {expandedExample && (
                                  <div className="relative bg-[#0d1117] rounded-xl p-3 overflow-auto max-h-52">
                                    <button
                                      onClick={() => copyText(PYTHON_EXAMPLE(botSelected.token, botSelected.display_name), `ex-${bot.bot_user_id}`)}
                                      className="absolute top-2 right-2 p-1.5 bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
                                    >
                                      {copied === `ex-${bot.bot_user_id}` ? <Check size={11} className="text-green-400" /> : <Copy size={11} className="text-white/60" />}
                                    </button>
                                    <pre className="text-[10px] text-green-300 font-mono whitespace-pre-wrap leading-relaxed">
                                      {PYTHON_EXAMPLE(botSelected.token, botSelected.display_name)}
                                    </pre>
                                  </div>
                                )}
                              </div>

                              {/* Actions */}
                              <div className="flex gap-2 pt-1">
                                <button
                                  onClick={() => { setEditBot(bot); setEditName(bot.display_name); setEditDesc(bot.bio || ""); }}
                                  className="flex items-center gap-1.5 px-3 py-2 bg-secondary hover:bg-secondary/70 rounded-xl text-xs font-medium text-foreground transition-colors"
                                >
                                  <Pencil size={12} /> Изменить
                                </button>
                                <button
                                  onClick={() => handleRegenerate(bot)}
                                  disabled={regenerating === bot.bot_user_id}
                                  className="flex items-center gap-1.5 px-3 py-2 bg-amber-500/10 hover:bg-amber-500/15 border border-amber-500/20 rounded-xl text-xs font-medium text-amber-400 transition-colors disabled:opacity-50"
                                >
                                  <RefreshCw size={12} className={regenerating === bot.bot_user_id ? "animate-spin" : ""} />
                                  Новый токен
                                </button>
                                <button
                                  onClick={() => handleDelete(bot)}
                                  disabled={deletingId === bot.bot_user_id}
                                  className="flex items-center gap-1.5 px-3 py-2 bg-destructive/10 hover:bg-destructive/15 border border-destructive/20 rounded-xl text-xs font-medium text-destructive transition-colors disabled:opacity-50 ml-auto"
                                >
                                  <Trash2 size={12} /> Удалить
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

              {/* Info cards */}
              <div className="grid grid-cols-3 gap-2 pt-2">
                {[
                  { icon: <MessageSquare size={14} />, label: "Сообщения", desc: "Получай и отправляй" },
                  { icon: <Webhook size={14} />, label: "Webhook", desc: "Реалтайм события" },
                  { icon: <Globe size={14} />, label: "Polling", desc: "Long-polling API" },
                ].map(item => (
                  <div key={item.label} className="bg-card rounded-xl p-3 border border-border text-center">
                    <div className="text-primary mb-1 flex justify-center">{item.icon}</div>
                    <p className="text-[11px] font-bold text-foreground">{item.label}</p>
                    <p className="text-[9px] text-muted-foreground">{item.desc}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* ── PYTHON SDK TAB ── */}
          {activeTab === "sdk" && (
            <motion.div key="sdk" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
              {/* Header */}
              <div className="bg-gradient-to-r from-violet-500/10 to-indigo-500/10 border border-violet-500/20 rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Terminal size={16} className="text-violet-400" />
                  <span className="font-bold text-foreground">pulse_bot.py</span>
                  <span className="text-[10px] bg-violet-500/20 text-violet-300 px-2 py-0.5 rounded-full">Python SDK</span>
                </div>
                <p className="text-xs text-muted-foreground">Telegram-совместимый Python SDK для Pulse ботов. Поддерживает polling, webhook и все основные методы API.</p>
              </div>

              {/* API Reference */}
              <div className="bg-card rounded-2xl border border-border p-4 space-y-3">
                <p className="font-bold text-sm text-foreground flex items-center gap-2">
                  <Code2 size={14} className="text-primary" /> API Методы
                </p>
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
                  <div key={m.method} className="flex items-center gap-3 py-1.5 border-b border-border last:border-0">
                    <span className={`text-[9px] font-black px-1.5 py-0.5 rounded shrink-0 ${m.type === "GET" ? "bg-green-500/15 text-green-400" : "bg-blue-500/15 text-blue-400"}`}>
                      {m.type}
                    </span>
                    <code className="text-xs font-mono text-primary w-36 shrink-0">{m.method}</code>
                    <span className="text-xs text-muted-foreground">{m.desc}</span>
                  </div>
                ))}
              </div>

              {/* Base URL */}
              <div className="bg-card rounded-2xl border border-border p-4">
                <p className="font-bold text-sm text-foreground mb-2">Base URL</p>
                <div className="flex items-center gap-2 bg-muted/40 rounded-xl px-3 py-2">
                  <code className="flex-1 text-xs font-mono text-foreground break-all">{host}/bot/{"<TOKEN>"}/<span className="text-primary">METHOD</span></code>
                  <button onClick={() => copyText(`${host}/bot/`, "baseurl")} className="p-1.5 hover:bg-secondary rounded-lg transition-colors shrink-0">
                    {copied === "baseurl" ? <Check size={13} className="text-green-400" /> : <Copy size={13} className="text-muted-foreground" />}
                  </button>
                </div>
              </div>

              {/* pulse_bot.py download */}
              <div className="bg-card rounded-2xl border border-border overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-[#0d1117]">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
                      <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
                      <div className="w-2.5 h-2.5 rounded-full bg-green-500/80" />
                    </div>
                    <span className="text-xs text-white/50 font-mono">pulse_bot.py</span>
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
                    className="flex items-center gap-1.5 text-[11px] text-white/60 hover:text-white/90 transition-colors"
                  >
                    <ExternalLink size={11} /> Скачать
                  </button>
                </div>
                <div className="bg-[#0d1117] p-4 overflow-auto max-h-96">
                  <pre className="text-[10px] text-green-300 font-mono whitespace-pre leading-relaxed">
                    {PULSE_BOT_PY.replace("https://YOUR_PULSE_DOMAIN", host).substring(0, 1200)}
                    <span className="text-white/30">... (скачай файл для полного кода)</span>
                  </pre>
                </div>
              </div>

              {/* Quick start example */}
              <div className="bg-card rounded-2xl border border-border overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-[#0d1117]">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
                      <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
                      <div className="w-2.5 h-2.5 rounded-full bg-green-500/80" />
                    </div>
                    <span className="text-xs text-white/50 font-mono">my_bot.py</span>
                  </div>
                  <button
                    onClick={() => copyText(PYTHON_EXAMPLE(bots[0]?.token || "ВАШ_ТОКЕН_БОТА", bots[0]?.display_name || "PulseBot"), "quickex")}
                    className="flex items-center gap-1.5 text-[11px] text-white/60 hover:text-white/90 transition-colors"
                  >
                    {copied === "quickex" ? <><Check size={11} className="text-green-400" /> Скопировано</> : <><Copy size={11} /> Скопировать</>}
                  </button>
                </div>
                <div className="bg-[#0d1117] p-4">
                  <pre className="text-[11px] text-green-300 font-mono whitespace-pre-wrap leading-relaxed">
                    {PYTHON_EXAMPLE(bots[0]?.token || "ВАШ_ТОКЕН_БОТА", bots[0]?.display_name || "PulseBot")}
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
