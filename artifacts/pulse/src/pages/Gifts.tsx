import React, { useState, useEffect, useCallback, useRef } from "react";
import { useGetGiftCatalog, useGetSentGifts, useGetReceivedGifts, GiftItem, Gift } from "@workspace/api-client-react";
import { Zap, ArrowUpRight, ArrowDownLeft, Gift as GiftIcon, Search, AlertTriangle, X, UserRound, MessageSquare, EyeOff } from "lucide-react";
import { GiftArt } from "./GiftArt";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion, AnimatePresence } from "framer-motion";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { formatDistanceToNow } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";

const RARITY_CONFIG: Record<string, { gradient: string; glow: string; badge: string; label: string }> = {
  legendary: {
    gradient: "from-yellow-300 via-orange-400 to-red-500",
    glow: "shadow-[0_0_30px_rgba(251,191,36,0.5)] hover:shadow-[0_0_50px_rgba(251,191,36,0.7)]",
    badge: "bg-yellow-500/30 text-yellow-300 border-yellow-400/50",
    label: "LEGENDARY",
  },
  epic: {
    gradient: "from-purple-400 via-pink-500 to-purple-700",
    glow: "shadow-[0_0_20px_rgba(168,85,247,0.4)] hover:shadow-[0_0_35px_rgba(168,85,247,0.6)]",
    badge: "bg-purple-500/30 text-purple-300 border-purple-400/50",
    label: "EPIC",
  },
  rare: {
    gradient: "from-blue-400 via-cyan-400 to-teal-500",
    glow: "shadow-[0_0_12px_rgba(59,130,246,0.3)] hover:shadow-[0_0_25px_rgba(59,130,246,0.5)]",
    badge: "bg-blue-500/30 text-blue-300 border-blue-400/50",
    label: "RARE",
  },
  common: {
    gradient: "from-slate-400 via-slate-500 to-slate-600",
    glow: "shadow-[0_0_6px_rgba(100,116,139,0.2)] hover:shadow-[0_0_15px_rgba(100,116,139,0.3)]",
    badge: "bg-slate-500/30 text-slate-300 border-slate-400/50",
    label: "COMMON",
  },
};

interface GiftTheme {
  bg1: string;
  bg2: string;
  glow: string;
  ring: string;
}

const GIFT_THEMES: Record<string, GiftTheme> = {
  "Сердечко":       { bg1: "#ff6b9d", bg2: "#9b1239", glow: "#ff6b9d", ring: "#ff4d7d" },
  "Звёздочка":      { bg1: "#fde047", bg2: "#b45309", glow: "#fbbf24", ring: "#f59e0b" },
  "Цветок сакуры":  { bg1: "#f9a8d4", bg2: "#9d174d", glow: "#f472b6", ring: "#ec4899" },
  "Пончик":         { bg1: "#fb923c", bg2: "#7c2d12", glow: "#f97316", ring: "#ea580c" },
  "Котёнок":        { bg1: "#fcd34d", bg2: "#92400e", glow: "#fbbf24", ring: "#d97706" },
  "Воздушный шар":  { bg1: "#f87171", bg2: "#7f1d1d", glow: "#ef4444", ring: "#dc2626" },
  "Четырёхлистник": { bg1: "#4ade80", bg2: "#14532d", glow: "#22c55e", ring: "#16a34a" },
  "Пицца":          { bg1: "#fbbf24", bg2: "#78350f", glow: "#f59e0b", ring: "#d97706" },
  "Торт":           { bg1: "#f0abfc", bg2: "#6b21a8", glow: "#e879f9", ring: "#d946ef" },
  "Луна":           { bg1: "#93c5fd", bg2: "#1e1b4b", glow: "#818cf8", ring: "#6366f1" },

  "Корона":         { bg1: "#fde68a", bg2: "#78350f", glow: "#f59e0b", ring: "#d97706" },
  "Красная роза":   { bg1: "#fca5a5", bg2: "#7f1d1d", glow: "#ef4444", ring: "#b91c1c" },
  "Лиса":           { bg1: "#fb923c", bg2: "#7c2d12", glow: "#f97316", ring: "#ea580c" },
  "Бриллиант":      { bg1: "#67e8f9", bg2: "#164e63", glow: "#22d3ee", ring: "#06b6d4" },
  "Ракета":         { bg1: "#93c5fd", bg2: "#1e3a5f", glow: "#60a5fa", ring: "#3b82f6" },
  "Гитара":         { bg1: "#c4b5fd", bg2: "#3b0764", glow: "#a78bfa", ring: "#8b5cf6" },
  "Кубок":          { bg1: "#fde68a", bg2: "#713f12", glow: "#f59e0b", ring: "#d97706" },
  "Радуга":         { bg1: "#a5f3fc", bg2: "#3730a3", glow: "#38bdf8", ring: "#0ea5e9" },
  "Молния":         { bg1: "#fef08a", bg2: "#713f12", glow: "#facc15", ring: "#eab308" },
  "Самоцвет":       { bg1: "#6ee7b7", bg2: "#064e3b", glow: "#34d399", ring: "#10b981" },

  "Дракон":         { bg1: "#fca5a5", bg2: "#450a0a", glow: "#ef4444", ring: "#dc2626" },
  "Единорог":       { bg1: "#f0abfc", bg2: "#4a044e", glow: "#e879f9", ring: "#a21caf" },
  "Феникс":         { bg1: "#fdba74", bg2: "#431407", glow: "#fb923c", ring: "#ea580c" },
  "Планета":        { bg1: "#a5b4fc", bg2: "#1e1b4b", glow: "#818cf8", ring: "#4f46e5" },
  "Волшебство":     { bg1: "#d8b4fe", bg2: "#3b0764", glow: "#c084fc", ring: "#9333ea" },
  "Кристалл":       { bg1: "#7dd3fc", bg2: "#082f49", glow: "#38bdf8", ring: "#0284c7" },

  "Галактика":      { bg1: "#818cf8", bg2: "#020617", glow: "#6366f1", ring: "#4338ca" },
  "Ангел":          { bg1: "#fef9c3", bg2: "#78350f", glow: "#fde047", ring: "#ca8a04" },
  "Пульс":          { bg1: "#e879f9", bg2: "#2e1065", glow: "#d946ef", ring: "#a21caf" },
  "Звезда":         { bg1: "#fde68a", bg2: "#7c2d12", glow: "#f59e0b", ring: "#b45309" },
  "Бесконечность":  { bg1: "#67e8f9", bg2: "#0c4a6e", glow: "#22d3ee", ring: "#0891b2" },
};

const DEFAULT_THEME: GiftTheme = { bg1: "#94a3b8", bg2: "#1e293b", glow: "#64748b", ring: "#475569" };

function getGiftTheme(name: string): GiftTheme {
  return GIFT_THEMES[name] || DEFAULT_THEME;
}

function getEmojiAnimation(animationType: string) {
  switch (animationType) {
    case "hearts":
      return {
        animate: { scale: [1, 1.25, 0.95, 1.15, 1], rotate: [0, -12, 12, -6, 0] },
        transition: { duration: 1.6, repeat: Infinity, ease: "easeInOut" },
      };
    case "fireworks":
      return {
        animate: { scale: [1, 1.5, 0.85, 1.3, 0.95, 1], rotate: [0, 20, -20, 12, -8, 0] },
        transition: { duration: 1.1, repeat: Infinity, ease: "easeInOut" },
      };
    case "stars":
      return {
        animate: { rotate: [0, 360], scale: [1, 1.18, 1, 1.1, 1] },
        transition: { duration: 2.5, repeat: Infinity, ease: "linear" },
      };
    case "sparkle":
      return {
        animate: { scale: [1, 1.3, 0.9, 1.2, 1], filter: ["brightness(1)", "brightness(1.6)", "brightness(1)"] },
        transition: { duration: 1.6, repeat: Infinity },
      };
    case "confetti":
      return {
        animate: { y: [0, -14, 3, -8, 0], rotate: [0, 14, -14, 7, 0] },
        transition: { duration: 1.3, repeat: Infinity, ease: "easeInOut" },
      };
    case "balloons":
      return {
        animate: { y: [0, -18, -4, -14, 0], rotate: [-6, 6, -4, 4, -6] },
        transition: { duration: 2.8, repeat: Infinity, ease: "easeInOut" },
      };
    case "diamonds":
      return {
        animate: { rotate: [0, 25, -25, 12, 0], scale: [1, 1.35, 0.92, 1.2, 1] },
        transition: { duration: 2, repeat: Infinity },
      };
    case "lightning":
      return {
        animate: { scale: [1, 1.4, 0.88, 1.25, 1], x: [-2, 2, -2, 1, 0] },
        transition: { duration: 0.7, repeat: Infinity, repeatDelay: 1.2 },
      };
    case "flame":
      return {
        animate: { scale: [1, 1.18, 0.93, 1.12, 1], rotate: [-4, 4, -3, 3, -4], y: [0, -4, 1, -3, 0] },
        transition: { duration: 0.9, repeat: Infinity, ease: "easeInOut" },
      };
    case "magic":
      return {
        animate: { rotate: [0, 360], scale: [1, 1.22, 0.95, 1.15, 1] },
        transition: { duration: 1.8, repeat: Infinity, ease: "easeInOut" },
      };
    case "galaxy":
      return {
        animate: { rotate: [0, 360], scale: [1, 1.08, 0.97, 1.04, 1] },
        transition: { duration: 4, repeat: Infinity, ease: "linear" },
      };
    case "bounce":
      return {
        animate: { y: [0, -16, 2, -10, 0], scale: [1, 0.92, 1.08, 0.96, 1] },
        transition: { duration: 1.1, repeat: Infinity, ease: "easeInOut" },
      };
    default:
      return {
        animate: { y: [0, -10, 0], rotate: [0, 5, -5, 0] },
        transition: { duration: 2, repeat: Infinity, ease: "easeInOut" },
      };
  }
}

function FloatingParticles({ rarity, theme }: { rarity: string; theme: GiftTheme }) {
  const count = rarity === "legendary" ? 8 : rarity === "epic" ? 6 : rarity === "rare" ? 4 : 2;
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1.5 h-1.5 rounded-full pointer-events-none"
          style={{ top: "50%", left: "50%", backgroundColor: i % 2 === 0 ? theme.bg1 : theme.ring }}
          animate={{
            x: [0, Math.cos(i * (360 / count) * Math.PI / 180) * 42, 0],
            y: [0, Math.sin(i * (360 / count) * Math.PI / 180) * 42, 0],
            opacity: [0, 1, 0],
            scale: [0, 1.6, 0],
          }}
          transition={{ duration: 2.4, repeat: Infinity, delay: i * 0.28, ease: "easeInOut" }}
        />
      ))}
    </>
  );
}

function GiftVisual({ name, emoji, rarity, animationType, size = 64 }: {
  name: string;
  emoji: string;
  rarity: string;
  animationType: string;
  size?: number;
}) {
  const theme = getGiftTheme(name);
  const artAnim = getEmojiAnimation(animationType);
  const isHighRarity = rarity === "legendary" || rarity === "epic";
  const isRare = rarity === "rare";

  return (
    <div
      className="relative flex items-center justify-center rounded-2xl overflow-hidden shrink-0"
      style={{
        width: size,
        height: size,
        background: `radial-gradient(circle at 35% 30%, ${theme.bg1}22 0%, ${theme.bg2}cc 100%)`,
        boxShadow: `0 0 ${size * 0.4}px ${theme.glow}60, inset 0 1px 0 rgba(255,255,255,0.15)`,
      }}
    >
      {isHighRarity && (
        <motion.div
          className="absolute inset-0 rounded-2xl"
          style={{ background: `conic-gradient(from 0deg, ${theme.bg1}25, ${theme.ring}45, ${theme.bg1}25)` }}
          animate={{ rotate: [0, 360] }}
          transition={{ duration: rarity === "legendary" ? 3 : 5, repeat: Infinity, ease: "linear" }}
        />
      )}
      {isRare && (
        <motion.div
          className="absolute rounded-2xl border"
          style={{ inset: 2, borderColor: `${theme.ring}50` }}
          animate={{ opacity: [0.3, 0.9, 0.3] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      )}
      <motion.div
        className="relative z-10 select-none flex items-center justify-center"
        style={{ width: size, height: size }}
        {...(artAnim as any)}
      >
        <GiftArt name={name} size={size} />
      </motion.div>
      {rarity === "legendary" && (
        <motion.div
          className="absolute inset-0 rounded-2xl pointer-events-none"
          style={{ background: `radial-gradient(circle at 50% 50%, ${theme.bg1}20, transparent 70%)` }}
          animate={{ scale: [1, 1.15, 1], opacity: [0.4, 0.9, 0.4] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      )}
    </div>
  );
}

function GiftCard({ item, onClick }: { item: GiftItem; onClick: () => void }) {
  const cfg = RARITY_CONFIG[item.rarity] || RARITY_CONFIG.common;
  const theme = getGiftTheme(item.name);
  const [hovered, setHovered] = useState(false);

  return (
    <motion.div
      whileHover={{ y: -6, scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      className={`relative cursor-pointer rounded-2xl overflow-hidden transition-shadow duration-300 ${cfg.glow}`}
    >
      <div className={`p-[1.5px] rounded-2xl bg-gradient-to-br ${cfg.gradient}`}>
        <div className="bg-[hsl(222,47%,13%)] rounded-2xl p-4 flex flex-col items-center justify-center text-center min-h-[160px] relative overflow-hidden">
          {hovered && item.rarity !== "common" && <FloatingParticles rarity={item.rarity} theme={theme} />}
          <div className="mb-3 relative z-10">
            <GiftVisual
              name={item.name}
              emoji={item.emoji}
              rarity={item.rarity}
              animationType={item.animationType}
              size={64}
            />
          </div>
          <h3 className="font-bold text-sm mb-1 leading-tight relative z-10">{item.name}</h3>
          <div className="flex items-center gap-1 text-primary font-medium text-xs relative z-10">
            <Zap size={11} className="text-primary" />
            <span>{item.stars} Spark</span>
          </div>
          <span className={`absolute top-2 left-2 text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full border ${cfg.badge}`}>
            {cfg.label}
          </span>
        </div>
      </div>
    </motion.div>
  );
}

function CelebrationOverlay({ animationType, giftName, emoji, onDone }: { animationType: string; giftName: string; emoji: string; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 3500);
    return () => clearTimeout(t);
  }, [onDone]);

  const emojiSets: Record<string, string[]> = {
    hearts: ["❤️","💕","💖","💗","💓","🌸","✨"],
    fireworks: ["🎆","🎇","✨","💥","⭐","🌟","🎉"],
    confetti: ["🎊","🎉","🎈","🌟","💛","💜","🧡","🩷"],
    stars: ["⭐","🌟","✨","💫","🌠","⚡"],
    balloons: ["🎈","🎀","🎉","🥳","🎊","✨"],
    sparkle: ["✨","💫","⚡","🌟","💥","🔆"],
    bounce: ["💥","✨","🎉","⭐","🌟"],
    lightning: ["⚡","💥","✨","🌟","🔆"],
    flame: ["🔥","✨","💥","🌟","⚡"],
    magic: ["✨","🪄","💫","🌟","⭐","🎆"],
    galaxy: ["🌌","✨","💫","⭐","🌠","🔮"],
    diamonds: ["💎","✨","💙","❄️","🌟"],
  };
  const emojis = emojiSets[animationType] || emojiSets.confetti;

  return (
    <motion.div
      className="fixed inset-0 z-[200] pointer-events-none flex items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {Array.from({ length: 45 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute text-2xl"
          style={{ top: "50%", left: "50%" }}
          initial={{ x: 0, y: 0, opacity: 1, scale: 0.5 }}
          animate={{
            x: (Math.random() - 0.5) * window.innerWidth * 1.5,
            y: (Math.random() - 0.5) * window.innerHeight * 1.5,
            opacity: [1, 1, 0],
            scale: [0.5, 1.5 + Math.random(), 0],
            rotate: Math.random() * 720 - 360,
          }}
          transition={{ duration: 2 + Math.random() * 1.5, ease: "easeOut" }}
        >
          {i % 4 === 0 ? emoji : emojis[i % emojis.length]}
        </motion.div>
      ))}
      <motion.div
        className="text-center z-10"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: [0, 1.2, 1], opacity: [0, 1, 1] }}
        exit={{ scale: 0, opacity: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <div className="bg-black/60 backdrop-blur-xl rounded-3xl p-8 border border-white/10 flex flex-col items-center">
          <div className="mb-4">
            <GiftArt name={giftName} size={96} />
          </div>
          <div className="text-2xl font-black text-white">Подарок отправлен!</div>
          <div className="text-sm text-white/60 mt-1">{giftName} улетел к получателю ✨</div>
        </div>
      </motion.div>
    </motion.div>
  );
}

interface UserSearchResult {
  id: number;
  username: string;
  displayName: string;
  avatarColor: string;
  avatarUrl?: string | null;
}

const RARITY_ORDER = ["legendary", "epic", "rare", "common"];

export default function Gifts() {
  const queryClient = useQueryClient();
  const { data: catalog, isLoading: catalogLoading } = useGetGiftCatalog();
  const { data: receivedGifts, isLoading: receivedLoading } = useGetReceivedGifts();
  const { data: sentGifts, isLoading: sentLoading } = useGetSentGifts();

  const [selectedGift, setSelectedGift] = useState<GiftItem | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterRarity, setFilterRarity] = useState<string>("all");
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationAnim, setCelebrationAnim] = useState("confetti");
  const [celebrationGift, setCelebrationGift] = useState("");
  const [celebrationEmoji, setCelebrationEmoji] = useState("🎁");
  const [balance, setBalance] = useState<number>(0);
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  const [recipientSearch, setRecipientSearch] = useState("");
  const [recipientResults, setRecipientResults] = useState<UserSearchResult[]>([]);
  const [selectedRecipient, setSelectedRecipient] = useState<UserSearchResult | null>(null);
  const [recipientLoading, setRecipientLoading] = useState(false);
  const [showRecipientDropdown, setShowRecipientDropdown] = useState(false);
  const [giftMessage, setGiftMessage] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const recipientRef = useRef<HTMLDivElement>(null);

  const getUserIdHeader = (): Record<string, string> => {
    const token = localStorage.getItem("pulse-token");
    if (token) return { "Authorization": `Bearer ${token}` };
    const uid = localStorage.getItem("pulse-user-id");
    return uid ? { "x-user-id": uid } : {};
  };

  const fetchBalance = useCallback(async () => {
    try {
      const res = await fetch("/api/wallet", { headers: getUserIdHeader() });
      if (res.ok) {
        const data = await res.json();
        setBalance(data.balance);
      }
    } catch {}
  }, []);

  useEffect(() => { fetchBalance(); }, []);
  useEffect(() => { if (selectedGift) { fetchBalance(); setSendError(null); } }, [selectedGift]);

  useEffect(() => {
    if (!recipientSearch.trim()) {
      setRecipientResults([]);
      setShowRecipientDropdown(false);
      return;
    }
    const timer = setTimeout(async () => {
      setRecipientLoading(true);
      try {
        const res = await fetch(`/api/users/search?q=${encodeURIComponent(recipientSearch)}`, { headers: getUserIdHeader() });
        if (res.ok) {
          const data = await res.json();
          setRecipientResults(data);
          setShowRecipientDropdown(true);
        }
      } catch {}
      setRecipientLoading(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [recipientSearch]);

  const filtered = catalog?.filter((item: GiftItem) => {
    const matchSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchRarity = filterRarity === "all" || item.rarity === filterRarity;
    return matchSearch && matchRarity;
  }).sort((a: GiftItem, b: GiftItem) => RARITY_ORDER.indexOf(a.rarity) - RARITY_ORDER.indexOf(b.rarity));

  const getRarityColor = (rarity: string) => RARITY_CONFIG[rarity] || RARITY_CONFIG.common;

  const canAfford = selectedGift ? balance >= selectedGift.stars : false;
  const canSend = canAfford && !!selectedRecipient && !isSending;

  const handleSendGift = async () => {
    if (!selectedGift || !selectedRecipient) {
      setSendError("Выберите получателя подарка");
      return;
    }
    const cost = selectedGift.stars;
    setIsSending(true);
    setSendError(null);
    try {
      const spendRes = await fetch("/api/wallet/spend", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getUserIdHeader() },
        body: JSON.stringify({ amount: cost }),
      });
      if (!spendRes.ok) {
        const data = await spendRes.json();
        setSendError(data.error || "Недостаточно средств");
        if (data.balance !== undefined) setBalance(data.balance);
        setIsSending(false);
        return;
      }
      const spendData = await spendRes.json();
      setBalance(spendData.balance);

      await fetch("/api/gifts/send", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getUserIdHeader() },
        body: JSON.stringify({
          giftItemId: selectedGift.id,
          receiverId: selectedRecipient.id,
          message: giftMessage.trim() || undefined,
          isAnonymous,
        }),
      });

      queryClient.invalidateQueries({ queryKey: ["/api/gifts/sent"] });
      queryClient.invalidateQueries({ queryKey: ["/api/gifts/received"] });

      setCelebrationAnim(selectedGift.animationType);
      setCelebrationGift(selectedGift.name);
      setCelebrationEmoji(selectedGift.emoji);
      setSelectedGift(null);
      setSelectedRecipient(null);
      setRecipientSearch("");
      setGiftMessage("");
      setIsAnonymous(false);
      setShowCelebration(true);
    } catch {
      setSendError("Ошибка при отправке подарка");
    }
    setIsSending(false);
  };

  const handleCloseDialog = () => {
    setSelectedGift(null);
    setSendError(null);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-background overflow-hidden relative">
      <AnimatePresence>
        {showCelebration && (
          <CelebrationOverlay
            animationType={celebrationAnim}
            giftName={celebrationGift}
            emoji={celebrationEmoji}
            onDone={() => setShowCelebration(false)}
          />
        )}
      </AnimatePresence>

      <header className="h-16 border-b border-border flex items-center px-6 justify-between bg-card/80 backdrop-blur-md z-10 shrink-0">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <GiftIcon className="text-primary" size={20} /> Подарки
        </h1>
        <div className="flex items-center gap-1.5 text-sm font-bold text-primary bg-primary/10 px-3 py-1.5 rounded-full border border-primary/20">
          <Zap size={14} /> {balance} Spark
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 md:p-6 w-full scrollbar-thin">
        <Tabs defaultValue="catalog" className="w-full max-w-6xl mx-auto">
          <div className="flex flex-col gap-4 mb-6">
            <div className="flex justify-center">
              <TabsList className="bg-card border border-border h-11 p-1">
                <TabsTrigger value="catalog" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-5 py-1.5 rounded-lg text-sm">
                  Каталог
                </TabsTrigger>
                <TabsTrigger value="received" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-5 py-1.5 rounded-lg text-sm">
                  <ArrowDownLeft size={14} className="mr-1" /> Получены
                </TabsTrigger>
                <TabsTrigger value="sent" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-5 py-1.5 rounded-lg text-sm">
                  <ArrowUpRight size={14} className="mr-1" /> Отправлены
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="catalog" className="mt-0">
              <div className="flex gap-2 flex-wrap">
                <div className="relative flex-1 min-w-[160px]">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Поиск подарков..." className="pl-8 h-9 bg-card border-border text-sm" />
                </div>
                <div className="flex gap-1 flex-wrap">
                  {["all", "legendary", "epic", "rare", "common"].map(r => (
                    <button
                      key={r}
                      onClick={() => setFilterRarity(r)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all border ${filterRarity === r ? r === "all" ? "bg-primary text-primary-foreground border-primary" : `border ${getRarityColor(r).badge}` : "bg-card border-border text-muted-foreground hover:text-foreground"}`}
                    >
                      {r === "all" ? "Все" : r}
                    </button>
                  ))}
                </div>
              </div>
            </TabsContent>
          </div>

          <TabsContent value="catalog" className="mt-0 outline-none">
            {catalogLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                {Array.from({ length: 24 }).map((_, i) => <Skeleton key={i} className="h-44 rounded-2xl" />)}
              </div>
            ) : filtered?.length === 0 ? (
              <div className="text-center text-muted-foreground py-20">Подарки не найдены</div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                {filtered?.map((item: GiftItem) => (
                  <GiftCard key={item.id} item={item} onClick={() => setSelectedGift(item)} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="received" className="mt-0">
            {receivedLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{[1, 2, 3].map(i => <Skeleton key={i} className="h-24 rounded-2xl" />)}</div>
            ) : !receivedGifts || receivedGifts.length === 0 ? (
              <div className="text-center text-muted-foreground py-20 flex flex-col items-center gap-3">
                <GiftIcon size={48} className="opacity-20" />
                <p className="font-medium">Нет полученных подарков</p>
                <p className="text-sm opacity-60">Когда вам подарят что-то, это появится здесь</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {receivedGifts.map((gift: Gift) => {
                  const cfg = RARITY_CONFIG[gift.giftItem?.rarity || "common"];
                  return (
                    <motion.div key={gift.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className={`p-[1.5px] rounded-2xl bg-gradient-to-br ${cfg.gradient}`}>
                      <div className="bg-card rounded-2xl p-4 flex items-center gap-4">
                        <div className="shrink-0">
                          <GiftVisual
                            name={gift.giftItem?.name || ""}
                            emoji={gift.giftItem?.emoji || "🎁"}
                            rarity={gift.giftItem?.rarity || "common"}
                            animationType={gift.giftItem?.animationType || "sparkle"}
                            size={52}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold">{gift.giftItem?.name}</p>
                          <p className="text-sm text-muted-foreground">От {gift.isAnonymous ? "Анонима" : (gift.sender?.displayName || "Неизвестно")}</p>
                          {gift.message && <p className="text-sm mt-1 italic opacity-80">&quot;{gift.message}&quot;</p>}
                          <p className="text-xs text-muted-foreground mt-1">{formatDistanceToNow(new Date(gift.createdAt), { addSuffix: true })}</p>
                        </div>
                        <div className="flex items-center gap-1 text-primary text-sm font-bold shrink-0">
                          <Zap size={14} />{gift.giftItem?.stars}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="sent" className="mt-0">
            {sentLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{[1, 2, 3].map(i => <Skeleton key={i} className="h-24 rounded-2xl" />)}</div>
            ) : !sentGifts || sentGifts.length === 0 ? (
              <div className="text-center text-muted-foreground py-20 flex flex-col items-center gap-3">
                <ArrowUpRight size={48} className="opacity-20" />
                <p className="font-medium">Нет отправленных подарков</p>
                <p className="text-sm opacity-60">Отправьте подарок из каталога</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {sentGifts.map((gift: Gift) => {
                  const cfg = RARITY_CONFIG[gift.giftItem?.rarity || "common"];
                  return (
                    <motion.div key={gift.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className={`p-[1.5px] rounded-2xl bg-gradient-to-br ${cfg.gradient}`}>
                      <div className="bg-card rounded-2xl p-4 flex items-center gap-4">
                        <div className="shrink-0">
                          <GiftVisual
                            name={gift.giftItem?.name || ""}
                            emoji={gift.giftItem?.emoji || "🎁"}
                            rarity={gift.giftItem?.rarity || "common"}
                            animationType={gift.giftItem?.animationType || "sparkle"}
                            size={52}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold">{gift.giftItem?.name}</p>
                          <p className="text-sm text-muted-foreground">Кому: {gift.receiver?.displayName || "Неизвестно"}</p>
                          {gift.message && <p className="text-sm mt-1 italic opacity-80">&quot;{gift.message}&quot;</p>}
                          <p className="text-xs text-muted-foreground mt-1">{formatDistanceToNow(new Date(gift.createdAt), { addSuffix: true })}</p>
                        </div>
                        <div className="flex items-center gap-1 text-primary text-sm font-bold shrink-0">
                          <Zap size={14} />{gift.giftItem?.stars}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <AnimatePresence>
        {selectedGift && (
          <Dialog open onOpenChange={handleCloseDialog}>
            <DialogContent className="sm:max-w-md border-none bg-transparent shadow-none p-0 max-h-[90vh] overflow-y-auto" aria-describedby={undefined}>
              <DialogTitle className="sr-only">{selectedGift?.name}</DialogTitle>
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
              >
                <div className={`p-[2px] rounded-3xl bg-gradient-to-br ${getRarityColor(selectedGift.rarity).gradient}`}>
                  <div className="bg-[hsl(222,47%,13%)] rounded-3xl p-5 flex flex-col items-center text-center">
                    <div className="mb-4 drop-shadow-2xl">
                      <GiftVisual
                        name={selectedGift.name}
                        emoji={selectedGift.emoji}
                        rarity={selectedGift.rarity}
                        animationType={selectedGift.animationType}
                        size={96}
                      />
                    </div>
                    <h2 className="text-xl font-black mb-1">{selectedGift.name}</h2>
                    <span className={`text-xs font-black uppercase tracking-widest px-2.5 py-1 rounded-full border mb-2 ${getRarityColor(selectedGift.rarity).badge}`}>
                      {selectedGift.rarity}
                    </span>
                    <p className="text-muted-foreground text-sm mb-4 max-w-xs">{selectedGift.description}</p>

                    <div className="w-full space-y-3 mb-4">
                      <div className="text-left">
                        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1.5">
                          <UserRound size={12} /> Кому отправить *
                        </label>
                        <div className="relative" ref={recipientRef}>
                          {selectedRecipient ? (
                            <div className="flex items-center gap-3 p-3 rounded-xl bg-primary/10 border border-primary/30">
                              <div
                                className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0 overflow-hidden"
                                style={{ backgroundColor: selectedRecipient.avatarColor }}
                              >
                                {selectedRecipient.avatarUrl ? (
                                  <img src={selectedRecipient.avatarUrl} alt="" className="w-full h-full object-cover" />
                                ) : selectedRecipient.displayName[0].toUpperCase()}
                              </div>
                              <div className="flex-1 text-left min-w-0">
                                <p className="font-semibold text-sm">{selectedRecipient.displayName}</p>
                                <p className="text-xs text-muted-foreground">@{selectedRecipient.username}</p>
                              </div>
                              <button
                                onClick={() => { setSelectedRecipient(null); setRecipientSearch(""); }}
                                className="text-muted-foreground hover:text-foreground p-1"
                              >
                                <X size={16} />
                              </button>
                            </div>
                          ) : (
                            <>
                              <div className="relative">
                                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                <input
                                  value={recipientSearch}
                                  onChange={e => setRecipientSearch(e.target.value)}
                                  onFocus={() => recipientResults.length > 0 && setShowRecipientDropdown(true)}
                                  placeholder="Поиск по имени или никнейму..."
                                  className="w-full pl-8 pr-3 py-2.5 rounded-xl bg-black/30 border border-white/10 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-colors"
                                />
                              </div>
                              {showRecipientDropdown && recipientResults.length > 0 && (
                                <div className="absolute top-full mt-1 w-full bg-card border border-border rounded-xl shadow-2xl z-50 max-h-48 overflow-y-auto">
                                  {recipientResults.map(user => (
                                    <button
                                      key={user.id}
                                      onClick={() => {
                                        setSelectedRecipient(user);
                                        setRecipientSearch("");
                                        setShowRecipientDropdown(false);
                                      }}
                                      className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-secondary text-left transition-colors"
                                    >
                                      <div
                                        className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs shrink-0 overflow-hidden"
                                        style={{ backgroundColor: user.avatarColor }}
                                      >
                                        {user.avatarUrl ? (
                                          <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" />
                                        ) : user.displayName[0].toUpperCase()}
                                      </div>
                                      <div>
                                        <p className="font-semibold text-sm">{user.displayName}</p>
                                        <p className="text-xs text-muted-foreground">@{user.username}</p>
                                      </div>
                                    </button>
                                  ))}
                                </div>
                              )}
                              {recipientLoading && (
                                <p className="text-xs text-muted-foreground mt-1 px-1">Поиск...</p>
                              )}
                            </>
                          )}
                        </div>
                      </div>

                      <div className="text-left">
                        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1.5">
                          <MessageSquare size={12} /> Сообщение (необязательно)
                        </label>
                        <textarea
                          value={giftMessage}
                          onChange={e => setGiftMessage(e.target.value)}
                          placeholder="Добавьте пожелание..."
                          rows={2}
                          maxLength={200}
                          className="w-full px-3 py-2 rounded-xl bg-black/30 border border-white/10 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-colors resize-none"
                        />
                      </div>

                      <button
                        onClick={() => setIsAnonymous(v => !v)}
                        className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-xl border transition-all text-sm font-medium ${isAnonymous ? "bg-primary/10 border-primary/30 text-primary" : "bg-black/20 border-white/10 text-muted-foreground hover:border-white/20"}`}
                      >
                        <EyeOff size={15} />
                        {isAnonymous ? "Анонимно (вкл.)" : "Отправить анонимно"}
                      </button>
                    </div>

                    <div className="flex items-center justify-between w-full p-3.5 rounded-xl bg-black/30 border border-white/5 mb-3">
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-0.5">Стоимость</p>
                        <div className="flex items-center gap-1.5 text-primary font-black text-lg">
                          <Zap size={16} className="text-primary" /> {selectedGift.stars} Spark
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-0.5">Ваш баланс</p>
                        <div className={`flex items-center gap-1 font-bold text-sm ${canAfford ? "text-green-400" : "text-red-400"}`}>
                          <Zap size={14} /> {balance} Spark
                        </div>
                      </div>
                    </div>

                    {!canAfford && (
                      <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="w-full flex items-center gap-2 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl px-4 py-2.5 text-sm font-semibold mb-3"
                      >
                        <AlertTriangle size={16} className="shrink-0" />
                        Недостаточно ⚡ Spark. Пополните баланс в Кошельке.
                      </motion.div>
                    )}

                    {sendError && (
                      <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="w-full flex items-center gap-2 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl px-4 py-2.5 text-sm font-semibold mb-3"
                      >
                        <AlertTriangle size={16} className="shrink-0" />
                        {sendError}
                      </motion.div>
                    )}

                    <motion.button
                      whileHover={canSend ? { scale: 1.03 } : {}}
                      whileTap={canSend ? { scale: 0.97 } : {}}
                      onClick={handleSendGift}
                      disabled={!canAfford || isSending || !selectedRecipient}
                      className={`w-full py-3.5 rounded-xl font-black text-base transition-all ${canAfford && selectedRecipient ? "bg-primary text-primary-foreground hover:opacity-90 shadow-[0_0_25px_rgba(0,188,212,0.4)]" : "bg-secondary text-muted-foreground cursor-not-allowed opacity-60"}`}
                    >
                      {isSending ? "Отправляем..." : !selectedRecipient ? "Выберите получателя" : !canAfford ? "Недостаточно средств" : "Отправить подарок"}
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            </DialogContent>
          </Dialog>
        )}
      </AnimatePresence>
    </div>
  );
}
