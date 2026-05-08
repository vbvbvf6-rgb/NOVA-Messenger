import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Zap, Copy, Check, Trophy, Star, MessageSquare, Phone, Gift,
  TrendingUp, Sparkles, History, Shield, ChevronRight, ArrowUpRight, ArrowDownLeft, AlertTriangle, CheckCircle2
} from "lucide-react";

const CURRENCY_NAME = "SPARK";
const CURRENCY_FULL = "Spark — внутренняя валюта Pulse";

const TASKS = [
  { id: "daily_login", title: "Ежедневный вход", description: "Открой Pulse сегодня", reward: 5, icon: <Zap size={18} className="text-yellow-400" /> },
  { id: "send_message", title: "Отправь сообщение", description: "Напиши кому-нибудь", reward: 10, icon: <MessageSquare size={18} className="text-blue-400" /> },
  { id: "make_call", title: "Позвони другу", description: "Соверши звонок", reward: 15, icon: <Phone size={18} className="text-green-400" /> },
  { id: "send_gift", title: "Отправь подарок", description: "Порадуй кого-нибудь", reward: 20, icon: <Gift size={18} className="text-pink-400" /> },
  { id: "add_contact", title: "Добавь контакт", description: "Расширь сеть", reward: 10, icon: <Star size={18} className="text-purple-400" /> },
  { id: "update_profile", title: "Обнови профиль", description: "Добавь биографию", reward: 15, icon: <Trophy size={18} className="text-orange-400" /> },
];

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={handleCopy} className="p-2 rounded-lg hover:bg-white/10 transition-colors text-white/70 hover:text-white">
      {copied ? <Check size={16} className="text-green-400" /> : <Copy size={16} />}
    </button>
  );
}

interface TxEntry {
  id: string;
  type: "earn" | "spend" | "gift_in" | "gift_out";
  amount: number;
  label: string;
  time: Date;
}

function getUserIdHeader(): Record<string, string> {
  const uid = localStorage.getItem("pulse-user-id");
  return uid ? { "x-user-id": uid } : {};
}

async function verifyTask(taskId: string): Promise<{ ok: boolean; reason?: string }> {
  try {
    const headers = getUserIdHeader();
    switch (taskId) {
      case "daily_login":
        return { ok: true };

      case "send_message": {
        const res = await fetch("/api/stats/me", { headers });
        if (!res.ok) return { ok: false, reason: "Не удалось проверить" };
        const data = await res.json();
        if ((data.messagesSent || 0) > 0) return { ok: true };
        return { ok: false, reason: "Сначала отправь хотя бы одно сообщение" };
      }

      case "make_call": {
        const res = await fetch("/api/stats/me", { headers });
        if (!res.ok) return { ok: false, reason: "Не удалось проверить" };
        const data = await res.json();
        if ((data.callsMade || 0) > 0) return { ok: true };
        return { ok: false, reason: "Сначала позвони кому-нибудь" };
      }

      case "send_gift": {
        const res = await fetch("/api/gifts/sent", { headers });
        if (!res.ok) return { ok: false, reason: "Не удалось проверить" };
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) return { ok: true };
        return { ok: false, reason: "Сначала отправь подарок кому-нибудь" };
      }

      case "add_contact": {
        const res = await fetch("/api/contacts", { headers });
        if (!res.ok) return { ok: false, reason: "Не удалось проверить" };
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) return { ok: true };
        return { ok: false, reason: "Сначала добавь хотя бы один контакт" };
      }

      case "update_profile": {
        const res = await fetch("/api/users/me", { headers });
        if (!res.ok) return { ok: false, reason: "Не удалось проверить" };
        const data = await res.json();
        if (data.bio && data.bio.trim().length > 0) return { ok: true };
        return { ok: false, reason: "Добавь биографию в Настройках" };
      }

      default:
        return { ok: true };
    }
  } catch {
    return { ok: false, reason: "Ошибка проверки" };
  }
}

export default function Wallet() {
  const [balance, setBalance] = useState(0);
  const [walletAddress, setWalletAddress] = useState("");
  const [completedTasks, setCompletedTasks] = useState<string[]>([]);
  const [earningTask, setEarningTask] = useState<string | null>(null);
  const [taskErrors, setTaskErrors] = useState<Record<string, string>>({});
  const [txHistory, setTxHistory] = useState<TxEntry[]>([]);
  const [tab, setTab] = useState<"tasks" | "history">("tasks");

  const fetchWallet = useCallback(async () => {
    try {
      const res = await fetch("/api/wallet", { headers: getUserIdHeader() });
      if (res.ok) {
        const data = await res.json();
        setBalance(data.balance);
        setWalletAddress(data.address);
      }
    } catch {}
  }, []);

  useEffect(() => {
    fetchWallet();
    const stored = localStorage.getItem("pulse-completed-tasks");
    if (stored) setCompletedTasks(JSON.parse(stored));
    const storedTx = localStorage.getItem("pulse-tx-history");
    if (storedTx) {
      try {
        setTxHistory(JSON.parse(storedTx).map((tx: any) => ({ ...tx, time: new Date(tx.time) })));
      } catch {}
    }
    const lastLogin = localStorage.getItem("pulse-last-login");
    const today = new Date().toDateString();
    if (lastLogin !== today) {
      localStorage.setItem("pulse-last-login", today);
      const tasks: string[] = stored ? JSON.parse(stored) : [];
      if (!tasks.includes("daily_login")) {
        earnTask("daily_login", 5, tasks);
      }
    }
  }, []);

  const earnTask = async (taskId: string, reward: number, currentCompleted?: string[]) => {
    const completed = currentCompleted ?? completedTasks;
    if (completed.includes(taskId)) return;
    setEarningTask(taskId);
    setTaskErrors(prev => ({ ...prev, [taskId]: "" }));
    try {
      const res = await fetch("/api/wallet/earn", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getUserIdHeader() },
        body: JSON.stringify({ amount: reward }),
      });
      if (res.ok) {
        const data = await res.json();
        setBalance(data.balance);
        const newCompleted = [...completed, taskId];
        setCompletedTasks(newCompleted);
        localStorage.setItem("pulse-completed-tasks", JSON.stringify(newCompleted));
        const task = TASKS.find(t => t.id === taskId);
        const newTx: TxEntry = {
          id: `${taskId}-${Date.now()}`,
          type: "earn",
          amount: reward,
          label: task?.title || taskId,
          time: new Date(),
        };
        const updated = [newTx, ...txHistory].slice(0, 50);
        setTxHistory(updated);
        localStorage.setItem("pulse-tx-history", JSON.stringify(updated));
      }
    } catch {}
    setEarningTask(null);
  };

  const handleClickTask = async (task: typeof TASKS[number]) => {
    if (completedTasks.includes(task.id)) return;
    setEarningTask(task.id);
    setTaskErrors(prev => ({ ...prev, [task.id]: "" }));
    const result = await verifyTask(task.id);
    if (!result.ok) {
      setTaskErrors(prev => ({ ...prev, [task.id]: result.reason || "Условие не выполнено" }));
      setEarningTask(null);
      return;
    }
    await earnTask(task.id, task.reward);
  };

  const timeAgo = (date: Date) => {
    const diff = Date.now() - date.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "только что";
    if (mins < 60) return `${mins} мин. назад`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} ч. назад`;
    return `${Math.floor(hours / 24)} д. назад`;
  };

  const uid = Number(localStorage.getItem("pulse-user-id") || "0");
  const isAdmin = [4].includes(uid);

  return (
    <div className="flex-1 flex flex-col h-full bg-background overflow-hidden">
      <header className="h-16 border-b border-border flex items-center px-6 justify-between bg-card/80 backdrop-blur-md shrink-0">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Zap className="text-primary" size={20} /> Кошелёк
        </h1>
        <div className="flex items-center gap-1.5 text-sm font-bold text-primary bg-primary/10 px-3 py-1.5 rounded-full border border-primary/20">
          <Zap size={14} /> {Number(balance).toLocaleString()} SPARK
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 md:p-6 scrollbar-thin">
        <div className="max-w-2xl mx-auto space-y-5">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative overflow-hidden rounded-3xl p-6 text-white"
            style={{ background: "linear-gradient(135deg, #0ea5e9 0%, #06b6d4 40%, #8b5cf6 100%)" }}
          >
            <div className="absolute inset-0 opacity-20"
              style={{ backgroundImage: "radial-gradient(circle at 70% 20%, white 0%, transparent 60%)" }} />
            <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-white/10" />
            <div className="absolute -right-4 top-16 w-24 h-24 rounded-full bg-white/5" />

            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-1">
                <Sparkles size={14} className="opacity-70" />
                <span className="text-xs font-bold uppercase tracking-widest opacity-70">{CURRENCY_FULL}</span>
              </div>
              <div className="text-5xl font-black mb-1 tracking-tight">
                {Number(balance).toLocaleString()}
              </div>
              <div className="text-sm opacity-70 font-medium mb-5">⚡ {CURRENCY_NAME}</div>

              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-3 flex items-center justify-between border border-white/10">
                <div>
                  <p className="text-[10px] uppercase tracking-wider opacity-60 mb-0.5">Адрес кошелька</p>
                  <p className="font-mono text-sm font-bold">{walletAddress || "PLS···SPARK"}</p>
                </div>
                <CopyButton text={walletAddress} />
              </div>
            </div>
          </motion.div>

          {isAdmin && (
            <motion.a
              href="/admin"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-3 p-4 bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-2xl hover:from-purple-500/20 hover:to-pink-500/20 transition-all group cursor-pointer"
            >
              <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center shrink-0">
                <Shield size={20} className="text-purple-400" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-foreground text-sm">Панель администратора</p>
                <p className="text-xs text-muted-foreground">Управление балансами пользователей</p>
              </div>
              <ChevronRight size={16} className="text-muted-foreground group-hover:text-foreground transition-colors" />
            </motion.a>
          )}

          <div className="flex gap-1 p-1 bg-card border border-border rounded-2xl">
            <button
              onClick={() => setTab("tasks")}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all ${tab === "tasks" ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:text-foreground"}`}
            >
              <TrendingUp size={15} /> Задания
            </button>
            <button
              onClick={() => setTab("history")}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all ${tab === "history" ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:text-foreground"}`}
            >
              <History size={15} /> История
            </button>
          </div>

          <AnimatePresence mode="wait">
            {tab === "tasks" && (
              <motion.div
                key="tasks"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="space-y-2"
              >
                {TASKS.map((task, i) => {
                  const done = completedTasks.includes(task.id);
                  const earning = earningTask === task.id;
                  const errMsg = taskErrors[task.id];
                  return (
                    <motion.div
                      key={task.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04 }}
                      className={`flex flex-col gap-2 p-4 rounded-2xl border transition-all ${
                        done
                          ? "bg-card/50 border-border opacity-60"
                          : errMsg
                          ? "bg-card border-red-500/30"
                          : "bg-card border-border hover:border-primary/30"
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${done ? "bg-secondary" : "bg-background"}`}>
                          {done ? <Check size={18} className="text-primary" /> : task.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`font-semibold text-sm ${done ? "line-through text-muted-foreground" : "text-foreground"}`}>
                            {task.title}
                          </p>
                          <p className="text-xs text-muted-foreground">{task.description}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="flex items-center gap-1 text-primary font-bold text-sm">
                            <Zap size={12} /> +{task.reward}
                          </span>
                          {!done && (
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => handleClickTask(task)}
                              disabled={earning}
                              className="px-3 py-1.5 rounded-xl bg-primary/10 border border-primary/20 text-primary text-xs font-bold hover:bg-primary/20 transition-all disabled:opacity-50"
                            >
                              {earning ? "..." : "Выполнить"}
                            </motion.button>
                          )}
                          {done && (
                            <CheckCircle2 size={18} className="text-primary" />
                          )}
                        </div>
                      </div>
                      {errMsg && (
                        <motion.div
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="flex items-center gap-2 text-xs text-red-400 bg-red-500/10 rounded-xl px-3 py-2 border border-red-500/20"
                        >
                          <AlertTriangle size={13} className="shrink-0" />
                          {errMsg}
                        </motion.div>
                      )}
                    </motion.div>
                  );
                })}
              </motion.div>
            )}

            {tab === "history" && (
              <motion.div
                key="history"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="space-y-2"
              >
                {txHistory.length === 0 ? (
                  <div className="text-center text-muted-foreground py-16">
                    <History size={48} className="mx-auto mb-3 opacity-20" />
                    <p className="font-medium">Нет транзакций</p>
                    <p className="text-sm opacity-60 mt-1">Выполни задания чтобы заработать ⚡ SPARK</p>
                  </div>
                ) : txHistory.map((tx, i) => (
                  <motion.div
                    key={tx.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="flex items-center gap-3 p-4 bg-card border border-border rounded-2xl"
                  >
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                      tx.type === "earn" || tx.type === "gift_in"
                        ? "bg-emerald-500/10"
                        : "bg-red-500/10"
                    }`}>
                      {tx.type === "earn" || tx.type === "gift_in"
                        ? <ArrowDownLeft size={16} className="text-emerald-400" />
                        : <ArrowUpRight size={16} className="text-red-400" />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-foreground">{tx.label}</p>
                      <p className="text-xs text-muted-foreground">{timeAgo(tx.time)}</p>
                    </div>
                    <span className={`font-bold text-sm ${
                      tx.type === "earn" || tx.type === "gift_in"
                        ? "text-emerald-400"
                        : "text-red-400"
                    }`}>
                      {tx.type === "earn" || tx.type === "gift_in" ? "+" : "-"}
                      {Math.abs(tx.amount)} ⚡
                    </span>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
