import React, { useState } from "react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff, ShieldCheck } from "lucide-react";
import PulseLogo from "@/components/PulseLogo";

interface LoginProps {
  onLogin: (userId: number) => void;
}

export default function Login({ onLogin }: LoginProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [step, setStep] = useState<"credentials" | "2fa">("credentials");
  const [twoFaCode, setTwoFaCode] = useState("");
  const [pendingToken, setPendingToken] = useState("");
  const [twoFaLoading, setTwoFaLoading] = useState(false);
  const [twoFaError, setTwoFaError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError("Заполните все поля");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Неверный никнейм или пароль");
        return;
      }
      if (data.requiresTwoFactor) {
        setPendingToken(data.pendingToken);
        setStep("2fa");
        return;
      }
      if (data.token) localStorage.setItem("pulse-token", data.token);
      localStorage.setItem("pulse-user-id", String(data.userId));
      localStorage.setItem("pulse-user", JSON.stringify(data.user));
      onLogin(data.userId);
    } catch {
      setError("Ошибка подключения к серверу");
    } finally {
      setLoading(false);
    }
  };

  const handleTwoFa = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = twoFaCode.replace(/\s/g, "");
    if (code.length !== 6) {
      setTwoFaError("Введите 6-значный код");
      return;
    }
    setTwoFaLoading(true);
    setTwoFaError("");
    try {
      const res = await fetch("/api/auth/2fa/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pendingToken, code }),
      });
      const data = await res.json();
      if (!res.ok) {
        setTwoFaError(data.error || "Неверный код");
        return;
      }
      if (data.token) localStorage.setItem("pulse-token", data.token);
      localStorage.setItem("pulse-user-id", String(data.userId));
      localStorage.setItem("pulse-user", JSON.stringify(data.user));
      onLogin(data.userId);
    } catch {
      setTwoFaError("Ошибка подключения к серверу");
    } finally {
      setTwoFaLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background orbs */}
      <motion.div
        animate={{ x: [0, 30, 0], y: [0, -20, 0] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-[-15%] left-[-10%] w-[55%] h-[55%] rounded-full blur-[140px] opacity-50"
        style={{ background: "radial-gradient(circle, hsl(16 100% 50% / 0.18), transparent 70%)" }}
      />
      <motion.div
        animate={{ x: [0, -20, 0], y: [0, 25, 0] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 2 }}
        className="absolute bottom-[-15%] right-[-10%] w-[55%] h-[55%] rounded-full blur-[140px] opacity-40"
        style={{ background: "radial-gradient(circle, hsl(30 100% 45% / 0.15), transparent 70%)" }}
      />
      <motion.div
        animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.5, 0.3] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        className="absolute top-[40%] right-[20%] w-[30%] h-[30%] rounded-full blur-[100px]"
        style={{ background: "radial-gradient(circle, hsl(280 80% 60% / 0.08), transparent 70%)" }}
      />

      {/* Subtle grid overlay */}
      <div
        className="absolute inset-0 opacity-[0.015]"
        style={{
          backgroundImage: "linear-gradient(hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-[380px] relative z-10"
      >
        {/* Logo + title */}
        <div className="flex flex-col items-center mb-10">
          <motion.div
            initial={{ scale: 0.7, opacity: 0, rotate: -10 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 200, damping: 18, delay: 0.15 }}
            className="w-24 h-24 rounded-[28px] flex items-center justify-center mb-6 relative"
            style={{
              background: "linear-gradient(135deg, hsl(16 100% 50% / 0.15) 0%, hsl(16 100% 50% / 0.05) 100%)",
              border: "1px solid hsl(16 100% 50% / 0.2)",
              boxShadow: "0 0 40px hsl(16 100% 50% / 0.15), inset 0 1px 0 rgba(255,255,255,0.06)",
            }}
          >
            {step === "2fa" ? (
              <ShieldCheck className="text-primary w-10 h-10" />
            ) : (
              <PulseLogo size={48} />
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.5 }}
            className="text-center"
          >
            <h1 className="text-4xl font-black text-foreground tracking-tight leading-none mb-2">
              {step === "2fa" ? "Верификация" : "Pulse"}
            </h1>
            <p className="text-muted-foreground text-[15px] font-medium">
              {step === "2fa" ? "Введите код из приложения" : "С возвращением"}
            </p>
          </motion.div>
        </div>

        {/* Card */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="rounded-[28px] p-6"
          style={{
            background: "hsl(var(--card) / 0.7)",
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
            border: "1px solid hsl(var(--border) / 0.8)",
            boxShadow: "0 24px 64px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.04)",
          }}
        >
          <AnimatePresence mode="wait">
            {step === "credentials" ? (
              <motion.div
                key="credentials"
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 16 }}
                transition={{ duration: 0.25 }}
              >
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-black text-muted-foreground uppercase tracking-widest pl-1">
                      Имя или никнейм
                    </label>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="@никнейм или имя"
                      autoComplete="username"
                      autoFocus
                      className="w-full bg-secondary/60 border border-border rounded-2xl px-4 py-3.5 text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all text-[15px] font-medium"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between pl-1 pr-1">
                      <label className="text-[11px] font-black text-muted-foreground uppercase tracking-widest">Пароль</label>
                      <Link href="/forgot-password" className="text-xs text-primary hover:text-primary/80 transition-colors font-bold">
                        Забыли?
                      </Link>
                    </div>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        autoComplete="current-password"
                        className="w-full bg-secondary/60 border border-border rounded-2xl px-4 py-3.5 pr-12 text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all text-[15px] font-medium"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  <AnimatePresence>
                    {error && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="bg-destructive/10 border border-destructive/20 text-destructive rounded-xl px-4 py-3 text-sm font-semibold"
                      >
                        {error}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <motion.button
                    type="submit"
                    disabled={loading}
                    whileHover={{ scale: loading ? 1 : 1.01 }}
                    whileTap={{ scale: loading ? 1 : 0.98 }}
                    className="w-full text-primary-foreground font-black py-4 rounded-2xl transition-all disabled:opacity-50 text-[15px] mt-2"
                    style={{
                      background: loading
                        ? "hsl(var(--primary) / 0.7)"
                        : "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(16 100% 42%) 100%)",
                      boxShadow: loading ? "none" : "0 8px 28px hsl(var(--primary) / 0.35)",
                    }}
                  >
                    {loading ? "Входим..." : "Войти"}
                  </motion.button>
                </form>

                <div className="mt-5 pt-5 border-t border-border text-center">
                  <p className="text-sm font-medium text-muted-foreground">
                    Нет аккаунта?{" "}
                    <Link href="/register" className="text-primary hover:text-primary/80 transition-colors font-bold">
                      Создать
                    </Link>
                  </p>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="2fa"
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }}
                transition={{ duration: 0.25 }}
              >
                <div className="text-center mb-6">
                  <p className="text-sm font-medium text-muted-foreground leading-relaxed">
                    Откройте приложение аутентификации и введите 6-значный код.
                  </p>
                </div>
                <form onSubmit={handleTwoFa} className="space-y-4">
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="\d{6}"
                    maxLength={6}
                    value={twoFaCode}
                    onChange={(e) => setTwoFaCode(e.target.value.replace(/\D/g, ""))}
                    placeholder="000000"
                    autoFocus
                    className="w-full bg-secondary/60 border border-border rounded-2xl px-5 py-6 text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all text-center text-4xl font-mono tracking-[0.5em] font-black shadow-inner"
                  />

                  <AnimatePresence>
                    {twoFaError && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="bg-destructive/10 border border-destructive/20 text-destructive rounded-xl px-4 py-3 text-sm font-semibold text-center"
                      >
                        {twoFaError}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <motion.button
                    type="submit"
                    disabled={twoFaLoading || twoFaCode.length !== 6}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full text-primary-foreground font-black py-4 rounded-2xl transition-all disabled:opacity-50 text-[15px]"
                    style={{
                      background: "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(16 100% 42%) 100%)",
                      boxShadow: "0 8px 28px hsl(var(--primary) / 0.35)",
                    }}
                  >
                    {twoFaLoading ? "Проверяем..." : "Подтвердить"}
                  </motion.button>

                  <button
                    type="button"
                    onClick={() => { setStep("credentials"); setTwoFaCode(""); setTwoFaError(""); }}
                    className="w-full text-sm font-bold text-muted-foreground hover:text-foreground transition-colors py-2"
                  >
                    ← Назад
                  </button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Version badge */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-center text-[11px] text-muted-foreground/40 font-medium mt-6"
        >
          Pulse Messenger · Ваши данные надёжно защищены
        </motion.p>
      </motion.div>
    </div>
  );
}
