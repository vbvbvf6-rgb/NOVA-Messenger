import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, Crown, Gift } from "lucide-react";
import { Link } from "wouter";

interface LeaderEntry {
  userId: number;
  username: string;
  displayName: string | null;
  avatarColor: string | null;
  avatarUrl: string | null;
  hasPrime: boolean | string | number;
  primeTier: string | null;
  isVerified: boolean | string | number;
  giftCount: number;
  totalStars: number;
  totalValue: number;
  lastGiftAt: string;
}

function isPrimeActive(u: LeaderEntry) {
  return u.hasPrime === true || u.hasPrime === "t" || u.hasPrime === 1;
}
function isVerifiedUser(u: LeaderEntry) {
  return u.isVerified === true || u.isVerified === "t" || u.isVerified === 1;
}
function isPlusActive(u: LeaderEntry) {
  return isPrimeActive(u) && u.primeTier === "prime_plus";
}

const PODIUM_CONFIG = [
  { rank: 2, place: 1, label: "🥈", height: "h-20", color: "from-slate-400 to-slate-500", glow: "shadow-[0_0_20px_rgba(148,163,184,0.4)]", textColor: "text-slate-300" },
  { rank: 1, place: 0, label: "🥇", height: "h-28", color: "from-yellow-400 to-amber-500", glow: "shadow-[0_0_28px_rgba(250,204,21,0.5)]", textColor: "text-yellow-300" },
  { rank: 3, place: 2, label: "🥉", height: "h-14", color: "from-amber-600 to-orange-700", glow: "shadow-[0_0_16px_rgba(180,83,9,0.4)]", textColor: "text-amber-500" },
];

function UserAvatar({ user, size = "md" }: { user: LeaderEntry; size?: "sm" | "md" | "lg" }) {
  const hasPrime = isPrimeActive(user);
  const isPlus = isPlusActive(user);
  const initial = (user.displayName || user.username || "?")[0].toUpperCase();
  const sizeClass = size === "lg" ? "w-16 h-16 text-2xl" : size === "md" ? "w-12 h-12 text-lg" : "w-9 h-9 text-sm";

  return (
    <div className="relative shrink-0">
      {hasPrime && (
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: isPlus ? 3 : 5, repeat: Infinity, ease: "linear" }}
          className="absolute -inset-[2.5px] rounded-full z-0"
          style={{
            background: isPlus
              ? "conic-gradient(from 0deg, #a855f7, #d946ef, #7c3aed, #a855f7)"
              : "conic-gradient(from 0deg, #facc15, #fb923c, #f97316, #facc15)",
            borderRadius: "50%",
          }}
        />
      )}
      <div
        className={`relative z-10 ${sizeClass} rounded-full flex items-center justify-center font-black text-white border-2 border-card overflow-hidden`}
        style={{ backgroundColor: user.avatarColor || "#6366f1" }}
      >
        {user.avatarUrl ? (
          <img src={user.avatarUrl} alt={user.displayName || user.username} className="w-full h-full object-cover" />
        ) : initial}
      </div>
    </div>
  );
}

function PodiumCard({ user, config }: { user: LeaderEntry; config: typeof PODIUM_CONFIG[0] }) {
  const hasPrime = isPrimeActive(user);
  const isFirst = config.place === 0;

  return (
    <Link href={`/user/${user.userId}`}>
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: config.place * 0.12 + 0.1 }}
        className="flex flex-col items-center gap-2 cursor-pointer group"
      >
        <div className="relative">
          {isFirst && (
            <motion.div
              animate={{ rotate: [0, -8, 8, -8, 0], scale: [1, 1.2, 1] }}
              transition={{ duration: 3, repeat: Infinity, repeatDelay: 2 }}
              className="absolute -top-5 left-1/2 -translate-x-1/2 text-xl"
            >
              👑
            </motion.div>
          )}
          <UserAvatar user={user} size={isFirst ? "lg" : "md"} />
        </div>

        <div className="text-center max-w-[80px]">
          <div className="flex items-center justify-center gap-1">
            <p className={`text-xs font-black truncate ${isFirst ? "text-foreground" : "text-foreground/80"}`}>
              {user.displayName || user.username}
            </p>
            {isVerifiedUser(user) && (
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" className="shrink-0">
                <circle cx="12" cy="12" r="12" fill="hsl(16 100% 50%)"/>
                <path d="M7 12l3.5 3.5L17 8" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
          </div>
          <p className="text-[10px] text-muted-foreground font-medium mt-0.5 truncate">
            ⚡ {user.totalValue.toLocaleString()}
          </p>
        </div>

        <div className={`${config.height} w-full rounded-t-2xl bg-gradient-to-t ${config.color} ${config.glow} flex items-start justify-center pt-2 min-w-[64px] max-w-[80px]`}>
          <span className="text-lg leading-none">{config.label}</span>
        </div>
      </motion.div>
    </Link>
  );
}

function LeaderRow({ user, rank }: { user: LeaderEntry; rank: number }) {
  const hasPrime = isPrimeActive(user);
  const isPlus = isPlusActive(user);

  return (
    <Link href={`/user/${user.userId}`}>
      <motion.div
        initial={{ opacity: 0, x: -16 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: Math.min((rank - 4) * 0.04, 0.4) }}
        className="flex items-center gap-3 px-4 py-3 hover:bg-secondary/50 transition-colors cursor-pointer rounded-2xl group"
      >
        <div className="w-7 text-center shrink-0">
          <span className={`text-sm font-black ${rank <= 10 ? "text-foreground" : "text-muted-foreground"}`}>
            {rank}
          </span>
        </div>

        <UserAvatar user={user} size="sm" />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span
              className={`text-sm font-bold truncate ${hasPrime ? "" : "text-foreground"}`}
              style={hasPrime ? {
                background: isPlus
                  ? "linear-gradient(90deg, #a855f7, #d946ef)"
                  : "linear-gradient(90deg, #facc15, #fb923c)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              } : undefined}
            >
              {user.displayName || user.username}
            </span>
            {isVerifiedUser(user) && (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" className="shrink-0">
                <circle cx="12" cy="12" r="12" fill="hsl(16 100% 50%)"/>
                <path d="M7 12l3.5 3.5L17 8" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
            {hasPrime && (
              <div className={`w-3.5 h-3.5 rounded-sm flex items-center justify-center ${isPlus ? "bg-purple-500/20" : "bg-yellow-500/20"}`}>
                <Crown size={8} className={isPlus ? "text-purple-400" : "text-yellow-400"} />
              </div>
            )}
          </div>
          <p className="text-xs text-muted-foreground truncate">@{user.username}</p>
        </div>

        <div className="text-right shrink-0">
          <p className="text-sm font-black text-foreground">⚡ {user.totalValue.toLocaleString()}</p>
          <p className="text-[11px] text-muted-foreground">{user.giftCount} подарков</p>
        </div>
      </motion.div>
    </Link>
  );
}

function SkeletonPodium() {
  return (
    <div className="flex items-end justify-center gap-4 px-4 py-6">
      {[68, 88, 56].map((h, i) => (
        <div key={i} className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-full bg-secondary animate-pulse" />
          <div className="h-3 w-16 bg-secondary rounded animate-pulse" />
          <div style={{ height: h }} className="w-16 rounded-t-2xl bg-secondary animate-pulse" />
        </div>
      ))}
    </div>
  );
}

function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <div className="w-7 h-4 bg-secondary rounded animate-pulse shrink-0" />
      <div className="w-9 h-9 rounded-full bg-secondary animate-pulse shrink-0" />
      <div className="flex-1 space-y-1.5">
        <div className="h-3 w-28 bg-secondary rounded animate-pulse" />
        <div className="h-2.5 w-16 bg-secondary rounded animate-pulse" />
      </div>
      <div className="text-right space-y-1.5">
        <div className="h-3 w-16 bg-secondary rounded animate-pulse" />
        <div className="h-2.5 w-12 bg-secondary rounded animate-pulse" />
      </div>
    </div>
  );
}

export default function Leaderboard() {
  const [entries, setEntries] = useState<LeaderEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const token = sessionStorage.getItem("pulse-token");
    const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
    fetch("/api/gifts/leaderboard?limit=50", { headers })
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setEntries(data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const top3 = entries.slice(0, 3);
  const rest = entries.slice(3);

  return (
    <div className="flex-1 flex flex-col h-full bg-background overflow-hidden">
      <header className="h-[72px] border-b border-border flex items-center px-4 justify-between bg-card z-20 shrink-0 shadow-[0_4px_24px_rgba(0,0,0,0.04)]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
            <Trophy size={18} className="text-amber-400" />
          </div>
          <div>
            <h1 className="text-base font-black text-foreground leading-tight">Рейтинг популярности</h1>
            <p className="text-xs text-muted-foreground font-medium">По стоимости полученных подарков</p>
          </div>
        </div>
        {!loading && entries.length > 0 && (
          <div className="text-xs font-semibold text-muted-foreground bg-secondary px-3 py-1.5 rounded-full">
            {entries.length} участников
          </div>
        )}
      </header>

      <div className="flex-1 overflow-y-auto scrollbar-thin pb-24 md:pb-0">
        {loading ? (
          <div>
            <SkeletonPodium />
            <div className="px-2 space-y-1">
              {Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)}
            </div>
          </div>
        ) : entries.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8 text-center min-h-[60vh]">
            <div className="w-20 h-20 rounded-3xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
              <Gift size={36} className="text-amber-400" />
            </div>
            <div>
              <h2 className="text-lg font-black text-foreground mb-1">Рейтинг пуст</h2>
              <p className="text-sm text-muted-foreground">Отправьте первый подарок, чтобы попасть в рейтинг!</p>
            </div>
            <Link href="/gifts">
              <button className="px-6 py-3 bg-primary text-primary-foreground rounded-2xl text-sm font-black shadow-[0_4px_16px_rgba(255,85,0,0.3)] hover:bg-primary/90 transition-all">
                Перейти к подаркам
              </button>
            </Link>
          </div>
        ) : (
          <>
            {top3.length >= 2 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="relative overflow-hidden"
              >
                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-amber-500/5 rounded-full blur-3xl" />
                </div>
                <div className="flex items-end justify-center gap-3 px-6 pt-8 pb-4 relative z-10">
                  {PODIUM_CONFIG.map(cfg => {
                    const user = top3[cfg.place];
                    if (!user) return null;
                    return <PodiumCard key={cfg.place} user={user} config={cfg} />;
                  })}
                </div>
              </motion.div>
            )}

            {top3.length === 1 && (
              <div className="flex justify-center py-6">
                <PodiumCard user={top3[0]} config={PODIUM_CONFIG[1]} />
              </div>
            )}

            {rest.length > 0 && (
              <div className="px-2 pb-4">
                <div className="h-px bg-border mx-4 mb-3" />
                <AnimatePresence>
                  {rest.map((user, idx) => (
                    <LeaderRow key={user.userId} user={user} rank={idx + 4} />
                  ))}
                </AnimatePresence>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
