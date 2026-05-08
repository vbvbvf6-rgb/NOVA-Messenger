import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, Zap, Users, TrendingUp, Send, CheckCircle, AlertTriangle, RefreshCw, Plus, Trash2, Key, BadgeCheck, X } from "lucide-react";

const ADMIN_USER_IDS = [4];

interface AdminUser {
  id: number;
  username: string;
  display_name: string;
  avatar_color: string;
  avatar_url: string | null;
  status: string;
  balance: number;
  created_at: string;
  is_verified: boolean;
}

interface Stats {
  totalUsers: number;
  totalSpark: number;
}

function getHeader(): Record<string, string> {
  const uid = localStorage.getItem("pulse-user-id");
  return uid ? { "x-user-id": uid } : {};
}

export default function Admin() {
  const userId = Number(localStorage.getItem("pulse-user-id") || "0");

  if (!ADMIN_USER_IDS.includes(userId)) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background">
        <div className="text-center">
          <Shield size={64} className="mx-auto mb-4 text-destructive opacity-50" />
          <h2 className="text-2xl font-bold text-foreground mb-2">Доступ запрещён</h2>
          <p className="text-muted-foreground">У вас нет прав администратора</p>
        </div>
      </div>
    );
  }

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [giveAmount, setGiveAmount] = useState<string>("");
  const [giveLoading, setGiveLoading] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "ok" | "err" } | null>(null);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"balance" | "password" | "actions">("balance");
  const [newPassword, setNewPassword] = useState("");
  const [pwLoading, setPwLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<AdminUser | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const showToast = (msg: string, type: "ok" | "err") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [usersRes, statsRes] = await Promise.all([
        fetch("/api/admin/users", { headers: getHeader() }),
        fetch("/api/admin/stats", { headers: getHeader() }),
      ]);
      if (usersRes.ok) setUsers(await usersRes.json());
      if (statsRes.ok) setStats(await statsRes.json());
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleGive = async (amount: number) => {
    if (!selectedUser) return;
    setGiveLoading(true);
    try {
      const res = await fetch("/api/admin/give-currency", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getHeader() },
        body: JSON.stringify({ userId: selectedUser.id, amount }),
      });
      const data = await res.json();
      if (!res.ok) { showToast(data.error || "Ошибка", "err"); return; }
      showToast(`✅ ${amount > 0 ? "+" : ""}${amount} ⚡ SPARK → ${selectedUser.display_name}`, "ok");
      setUsers(prev => prev.map(u => u.id === selectedUser.id ? { ...u, balance: data.newBalance } : u));
      setSelectedUser(prev => prev ? { ...prev, balance: data.newBalance } : null);
      if (stats) setStats(prev => prev ? { ...prev, totalSpark: prev.totalSpark + amount } : null);
      setGiveAmount("");
    } catch { showToast("Ошибка соединения", "err"); }
    setGiveLoading(false);
  };

  const handleCustomAmount = () => {
    const n = Number(giveAmount);
    if (isNaN(n) || n === 0) return showToast("Введите корректную сумму (можно отрицательную)", "err");
    handleGive(n);
  };

  const handleResetPassword = async () => {
    if (!selectedUser || !newPassword.trim()) return;
    if (newPassword.length < 6) { showToast("Пароль минимум 6 символов", "err"); return; }
    setPwLoading(true);
    try {
      const res = await fetch("/api/admin/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getHeader() },
        body: JSON.stringify({ userId: selectedUser.id, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) { showToast(data.error || "Ошибка", "err"); }
      else { showToast(`🔐 Пароль @${selectedUser.username} изменён`, "ok"); setNewPassword(""); }
    } catch { showToast("Ошибка соединения", "err"); }
    setPwLoading(false);
  };

  const handleToggleVerified = async (target: AdminUser) => {
    try {
      const res = await fetch("/api/admin/set-verified", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getHeader() },
        body: JSON.stringify({ userId: target.id, isVerified: !target.is_verified }),
      });
      if (res.ok) {
        showToast(`${!target.is_verified ? "✅" : "❌"} Верификация ${!target.is_verified ? "выдана" : "снята"}: @${target.username}`, "ok");
        setUsers(prev => prev.map(u => u.id === target.id ? { ...u, is_verified: !target.is_verified } : u));
        setSelectedUser(prev => prev?.id === target.id ? { ...prev, is_verified: !target.is_verified } : prev);
      }
    } catch { showToast("Ошибка", "err"); }
  };

  const handleDeleteUser = async () => {
    if (!deleteConfirm) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${deleteConfirm.id}`, {
        method: "DELETE",
        headers: getHeader(),
      });
      const data = await res.json();
      if (!res.ok) { showToast(data.error || "Ошибка удаления", "err"); }
      else {
        showToast(`🗑️ @${deleteConfirm.username} удалён`, "ok");
        setUsers(prev => prev.filter(u => u.id !== deleteConfirm.id));
        if (selectedUser?.id === deleteConfirm.id) setSelectedUser(null);
        if (stats) setStats(prev => prev ? { ...prev, totalUsers: prev.totalUsers - 1 } : null);
        setDeleteConfirm(null);
      }
    } catch { showToast("Ошибка соединения", "err"); }
    setDeleteLoading(false);
  };

  const filtered = users.filter(u =>
    u.username.toLowerCase().includes(search.toLowerCase()) ||
    u.display_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex-1 flex flex-col h-full bg-background overflow-hidden">
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -40 }}
            className={`fixed top-4 left-1/2 -translate-x-1/2 z-[999] flex items-center gap-2.5 px-5 py-3 rounded-2xl font-semibold text-sm shadow-2xl backdrop-blur-xl border ${
              toast.type === "ok"
                ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-300"
                : "bg-red-500/20 border-red-500/30 text-red-300"
            }`}
          >
            {toast.type === "ok" ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-card border border-border rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center">
                <Trash2 size={20} className="text-destructive" />
              </div>
              <div>
                <h3 className="font-bold">Удалить пользователя</h3>
                <p className="text-sm text-muted-foreground">Это действие необратимо</p>
              </div>
            </div>
            <p className="text-sm text-foreground mb-5">
              Вы действительно хотите удалить <span className="font-bold">@{deleteConfirm.username}</span>? Все данные пользователя будут удалены.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:bg-secondary transition-colors"
              >
                Отмена
              </button>
              <button
                onClick={handleDeleteUser}
                disabled={deleteLoading}
                className="flex-1 py-2.5 rounded-xl bg-destructive text-destructive-foreground text-sm font-bold hover:bg-destructive/90 transition-colors disabled:opacity-50"
              >
                {deleteLoading ? "Удаляем..." : "Удалить"}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      <header className="h-16 border-b border-border flex items-center px-6 justify-between bg-card/80 backdrop-blur-md shrink-0">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Shield className="text-primary" size={20} /> Панель администратора
        </h1>
        <button onClick={fetchData} className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-card border border-border rounded-2xl p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Users size={20} className="text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">Пользователей</p>
                <p className="text-2xl font-black text-foreground">{stats.totalUsers}</p>
              </div>
            </div>
            <div className="bg-card border border-border rounded-2xl p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-yellow-500/10 flex items-center justify-center">
                <Zap size={20} className="text-yellow-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">SPARK в обороте</p>
                <p className="text-2xl font-black text-foreground">{stats.totalSpark.toLocaleString()}</p>
              </div>
            </div>
            <div className="bg-card border border-border rounded-2xl p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                <TrendingUp size={20} className="text-blue-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">Средний баланс</p>
                <p className="text-2xl font-black text-foreground">
                  {stats.totalUsers > 0 ? Math.round(stats.totalSpark / stats.totalUsers).toLocaleString() : 0}
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <h2 className="font-bold text-foreground">Пользователи</h2>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Поиск..."
                className="text-sm bg-background border border-border rounded-xl px-3 py-1.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary w-36 transition-colors"
              />
            </div>
            <div className="divide-y divide-border max-h-[450px] overflow-y-auto">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="p-4 flex items-center gap-3 animate-pulse">
                    <div className="w-10 h-10 rounded-full bg-secondary" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 bg-secondary rounded w-24" />
                      <div className="h-2 bg-secondary rounded w-16" />
                    </div>
                  </div>
                ))
              ) : filtered.map(user => (
                <motion.button
                  key={user.id}
                  whileHover={{ backgroundColor: "rgba(255,255,255,0.03)" }}
                  onClick={() => { setSelectedUser(user); setActiveTab("balance"); }}
                  className={`w-full p-4 flex items-center gap-3 text-left transition-colors ${selectedUser?.id === user.id ? "bg-primary/10 border-l-2 border-primary" : ""}`}
                >
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0 overflow-hidden"
                    style={{ backgroundColor: user.avatar_color }}
                  >
                    {user.avatar_url ? (
                      <img src={user.avatar_url} alt="" className="w-full h-full object-cover rounded-full" />
                    ) : user.display_name[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="font-semibold text-sm truncate">{user.display_name}</p>
                      {user.is_verified && (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" className="shrink-0">
                          <circle cx="12" cy="12" r="12" fill="#00BCD4"/>
                          <path d="M7 12l3.5 3.5L17 8" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                      {ADMIN_USER_IDS.includes(user.id) && (
                        <span className="text-[8px] font-black uppercase px-1 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">ADM</span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">@{user.username}</p>
                  </div>
                  <div className="flex items-center gap-1 text-primary text-sm font-bold shrink-0">
                    <Zap size={12} /> {Number(user.balance).toLocaleString()}
                  </div>
                </motion.button>
              ))}
            </div>
          </div>

          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            {selectedUser ? (
              <motion.div
                key={selectedUser.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="p-4 border-b border-border">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold shrink-0 overflow-hidden"
                      style={{ backgroundColor: selectedUser.avatar_color }}
                    >
                      {selectedUser.avatar_url ? (
                        <img src={selectedUser.avatar_url} alt="" className="w-full h-full object-cover rounded-full" />
                      ) : selectedUser.display_name[0]?.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="font-bold text-foreground">{selectedUser.display_name}</p>
                        {selectedUser.is_verified && (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                            <circle cx="12" cy="12" r="12" fill="#00BCD4"/>
                            <path d="M7 12l3.5 3.5L17 8" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">@{selectedUser.username}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs text-muted-foreground">Баланс</p>
                      <p className="text-xl font-black text-primary flex items-center gap-1">
                        <Zap size={16} /> {Number(selectedUser.balance).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex border-b border-border">
                  {(["balance", "password", "actions"] as const).map(t => (
                    <button
                      key={t}
                      onClick={() => setActiveTab(t)}
                      className={`flex-1 py-2.5 text-xs font-bold uppercase tracking-wider transition-colors ${activeTab === t ? "text-primary border-b-2 border-primary" : "text-muted-foreground hover:text-foreground"}`}
                    >
                      {t === "balance" ? "Баланс" : t === "password" ? "Пароль" : "Действия"}
                    </button>
                  ))}
                </div>

                <div className="p-5">
                  {activeTab === "balance" && (
                    <>
                      <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Быстрая выдача ⚡ SPARK</p>
                      <div className="grid grid-cols-3 gap-2 mb-4">
                        {[50, 100, 500, 1000, 5000, 10000].map(amt => (
                          <motion.button
                            key={amt}
                            whileHover={{ scale: 1.04 }}
                            whileTap={{ scale: 0.96 }}
                            onClick={() => handleGive(amt)}
                            disabled={giveLoading}
                            className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-primary/10 border border-primary/20 text-primary font-bold text-sm hover:bg-primary/20 transition-all disabled:opacity-50"
                          >
                            <Plus size={12} /> {amt >= 1000 ? `${amt / 1000}k` : amt}
                          </motion.button>
                        ))}
                      </div>
                      <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Произвольная сумма</p>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          value={giveAmount}
                          onChange={e => setGiveAmount(e.target.value)}
                          placeholder="Сумма (отриц. — списать)"
                          className="flex-1 bg-background border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors text-sm"
                          onKeyDown={e => e.key === "Enter" && handleCustomAmount()}
                        />
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={handleCustomAmount}
                          disabled={giveLoading || !giveAmount}
                          className="px-4 py-3 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:bg-primary/90 transition-all disabled:opacity-50 flex items-center gap-1.5"
                        >
                          <Send size={14} />
                          {giveLoading ? "..." : "Выдать"}
                        </motion.button>
                      </div>
                    </>
                  )}

                  {activeTab === "password" && (
                    <div className="space-y-3">
                      <p className="text-xs text-muted-foreground">Установить новый пароль для @{selectedUser.username}</p>
                      <input
                        type="text"
                        value={newPassword}
                        onChange={e => setNewPassword(e.target.value)}
                        placeholder="Новый пароль (мин. 6 символов)"
                        className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors text-sm"
                      />
                      <button
                        onClick={handleResetPassword}
                        disabled={pwLoading || !newPassword.trim()}
                        className="w-full py-3 rounded-xl bg-orange-500 text-white font-bold text-sm hover:bg-orange-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        <Key size={16} />
                        {pwLoading ? "Сохраняем..." : "Сбросить пароль"}
                      </button>
                    </div>
                  )}

                  {activeTab === "actions" && (
                    <div className="space-y-3">
                      <button
                        onClick={() => handleToggleVerified(selectedUser)}
                        className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-sm font-medium ${
                          selectedUser.is_verified
                            ? "bg-cyan-500/10 border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/20"
                            : "bg-card border-border text-muted-foreground hover:border-cyan-500/30 hover:text-cyan-400"
                        }`}
                      >
                        <BadgeCheck size={18} />
                        {selectedUser.is_verified ? "Снять верификацию" : "Выдать верификацию ✓"}
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(selectedUser)}
                        className="w-full flex items-center gap-3 p-3 rounded-xl border border-destructive/30 bg-destructive/10 text-destructive hover:bg-destructive/20 transition-all text-sm font-medium"
                      >
                        <Trash2 size={18} />
                        Удалить пользователя
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center py-16 text-muted-foreground p-5">
                <Users size={48} className="mb-3 opacity-20" />
                <p className="font-medium">Выберите пользователя</p>
                <p className="text-sm opacity-60 mt-1">для управления аккаунтом</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
