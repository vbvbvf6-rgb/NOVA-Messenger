import React, { useState } from "react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff, Zap, ShieldCheck, MessageCircle } from "lucide-react";
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
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-blue-500/5 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm relative z-10"
      >
        <div className="flex flex-col items-center mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 300, delay: 0.1 }}
            className="w-20 h-20 rounded-3xl bg-gradient-to-br from-cyan-500 to-violet-600 flex items-center justify-center shadow-[0_0_40px_rgba(6,182,212,0.5)] mb-4"
          >
            {step === "2fa" ? (
              <ShieldCheck className="text-white" size={40} />
            ) : (
              <PulseLogo size={44} />
            )}
          </motion.div>
          <h1 className="text-3xl font-black text-white">Pulse</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {step === "2fa" ? "Двухфакторная аутентификация" : "Войдите в аккаунт"}
          </p>
        </div>

        <AnimatePresence mode="wait">
          {step === "credentials" ? (
            <motion.div
              key="credentials"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="bg-card border border-border rounded-3xl p-6 shadow-2xl"
            >
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-1.5">Имя или никнейм</label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Ваше имя или @никнейм"
                    autoComplete="username"
                    autoFocus
                    className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors text-sm"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-sm font-semibold text-foreground">Пароль</label>
                    <Link href="/forgot-password" className="text-xs text-primary hover:text-primary/80 transition-colors font-medium">
                      Забыли пароль?
                    </Link>
                  </div>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      autoComplete="current-password"
                      className="w-full bg-background border border-border rounded-xl px-4 py-3 pr-12 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-destructive/10 border border-destructive/20 text-destructive rounded-xl px-4 py-3 text-sm font-medium"
                  >
                    {error}
                  </motion.div>
                )}

                <motion.button
                  type="submit"
                  disabled={loading}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full bg-primary text-primary-foreground font-bold py-3.5 rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-60 shadow-[0_0_20px_rgba(0,188,212,0.3)] text-base"
                >
                  {loading ? "Входим..." : "Войти"}
                </motion.button>
              </form>

              <div className="mt-5 text-center">
                <p className="text-sm text-muted-foreground">
                  Нет аккаунта?{" "}
                  <Link href="/register" className="text-primary font-semibold hover:underline">
                    Создать
                  </Link>
                </p>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="2fa"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="bg-card border border-border rounded-3xl p-6 shadow-2xl"
            >
              <div className="text-center mb-5">
                <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-xl px-4 py-2 text-sm text-primary font-medium mb-2">
                  <ShieldCheck size={15} />
                  Введите код из приложения
                </div>
                <p className="text-xs text-muted-foreground">
                  Откройте приложение аутентификации и введите 6-значный код для подтверждения входа.
                </p>
              </div>
              <form onSubmit={handleTwoFa} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-1.5">Код 2FA</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="\d{6}"
                    maxLength={6}
                    value={twoFaCode}
                    onChange={(e) => setTwoFaCode(e.target.value.replace(/\D/g, ""))}
                    placeholder="000000"
                    autoFocus
                    className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors text-center text-2xl font-mono tracking-[0.3em]"
                  />
                </div>

                {twoFaError && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-destructive/10 border border-destructive/20 text-destructive rounded-xl px-4 py-3 text-sm font-medium"
                  >
                    {twoFaError}
                  </motion.div>
                )}

                <motion.button
                  type="submit"
                  disabled={twoFaLoading || twoFaCode.length !== 6}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full bg-primary text-primary-foreground font-bold py-3.5 rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-60 shadow-[0_0_20px_rgba(0,188,212,0.3)] text-base"
                >
                  {twoFaLoading ? "Проверяем..." : "Подтвердить"}
                </motion.button>

                <button
                  type="button"
                  onClick={() => { setStep("credentials"); setTwoFaCode(""); setTwoFaError(""); }}
                  className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors py-2"
                >
                  ← Вернуться к входу
                </button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mt-6 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
          <Zap size={12} className="text-primary" />
          <span>Powered by Pulse</span>
        </div>
      </motion.div>
    </div>
  );
}
