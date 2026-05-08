import React, { useState, useEffect, useCallback, useRef, useId } from "react";
import { useGetGiftCatalog, useGetSentGifts, useGetReceivedGifts, GiftItem, Gift } from "@workspace/api-client-react";
import { Zap, ArrowUpRight, ArrowDownLeft, Gift as GiftIcon, Search, AlertTriangle, X, UserRound, MessageSquare, EyeOff } from "lucide-react";
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

function getEmojiAnimation(animationType: string) {
  switch (animationType) {
    case "hearts": return { animate: { scale: [1, 1.3, 1], rotate: [0, -10, 10, 0] }, transition: { duration: 1.5, repeat: Infinity, ease: "easeInOut" } };
    case "fireworks": return { animate: { scale: [1, 1.4, 0.9, 1.2, 1], rotate: [0, 15, -15, 8, 0] }, transition: { duration: 1.2, repeat: Infinity, ease: "easeInOut" } };
    case "stars": return { animate: { rotate: [0, 360], scale: [1, 1.2, 1] }, transition: { duration: 3, repeat: Infinity, ease: "linear" } };
    case "sparkle": return { animate: { scale: [1, 1.25, 1, 1.15, 1] }, transition: { duration: 1.8, repeat: Infinity } };
    case "confetti": return { animate: { y: [0, -12, 0], rotate: [0, 10, -10, 0] }, transition: { duration: 1.4, repeat: Infinity, ease: "easeInOut" } };
    case "balloons": return { animate: { y: [0, -15, 0], rotate: [-5, 5, -5] }, transition: { duration: 2.5, repeat: Infinity, ease: "easeInOut" } };
    case "diamonds": return { animate: { rotate: [0, 20, -20, 0], scale: [1, 1.3, 1] }, transition: { duration: 2.2, repeat: Infinity } };
    case "lightning": return { animate: { scale: [1, 1.3, 1, 1.2, 1], rotate: [0, -5, 5, 0] }, transition: { duration: 0.8, repeat: Infinity, repeatDelay: 1 } };
    case "flame": return { animate: { scale: [1, 1.2, 0.95, 1.15, 1], rotate: [-3, 3, -3] }, transition: { duration: 1, repeat: Infinity, ease: "easeInOut" } };
    case "magic": return { animate: { rotate: [0, 360], scale: [1, 1.2, 1] }, transition: { duration: 2, repeat: Infinity, ease: "easeInOut" } };
    case "galaxy": return { animate: { rotate: [0, 360], scale: [1, 1.1, 1] }, transition: { duration: 5, repeat: Infinity, ease: "linear" } };
    default: return { animate: { y: [0, -10, 0], rotate: [0, 5, -5, 0] }, transition: { duration: 2, repeat: Infinity, ease: "easeInOut" } };
  }
}

function FloatingParticles({ rarity }: { rarity: string }) {
  const colors: Record<string, string[]> = {
    legendary: ["#fbbf24", "#f59e0b", "#ef4444", "#fcd34d"],
    epic: ["#a855f7", "#ec4899", "#8b5cf6", "#c084fc"],
    rare: ["#3b82f6", "#06b6d4", "#0ea5e9", "#22d3ee"],
    common: ["#94a3b8", "#64748b", "#cbd5e1"],
  };
  const particleColors = colors[rarity] || colors.common;
  const count = rarity === "legendary" ? 8 : rarity === "epic" ? 6 : rarity === "rare" ? 4 : 2;
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1.5 h-1.5 rounded-full pointer-events-none"
          style={{ top: "50%", left: "50%", backgroundColor: particleColors[i % particleColors.length] }}
          animate={{
            x: [0, Math.cos(i * (360 / count) * Math.PI / 180) * 40, 0],
            y: [0, Math.sin(i * (360 / count) * Math.PI / 180) * 40, 0],
            opacity: [0, 1, 0],
            scale: [0, 1.5, 0],
          }}
          transition={{ duration: 2.5, repeat: Infinity, delay: i * 0.3, ease: "easeInOut" }}
        />
      ))}
    </>
  );
}

function makeStarPoints(n: number, cx: number, cy: number, r1: number, r2: number): string {
  return Array.from({ length: n * 2 }, (_, i) => {
    const r = i % 2 === 0 ? r1 : r2;
    const a = (i * Math.PI / n) - Math.PI / 2;
    return `${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`;
  }).join(" ");
}

function GiftIconSVG({ animationType, rarity, size = 80 }: { animationType: string; rarity: string; size?: number }) {
  const rawId = useId();
  const id = `gi${rawId.replace(/[^a-zA-Z0-9]/g, "")}`;
  const palettes: Record<string, string[]> = {
    legendary: ["#fde68a", "#f59e0b", "#ef4444", "#fcd34d"],
    epic:      ["#e879f9", "#a855f7", "#7c3aed", "#c084fc"],
    rare:      ["#67e8f9", "#3b82f6", "#06b6d4", "#38bdf8"],
    common:    ["#e2e8f0", "#94a3b8", "#64748b", "#cbd5e1"],
  };
  const c = palettes[rarity] || palettes.common;

  switch (animationType) {
    case "sparkle": {
      const pts = makeStarPoints(4, 50, 50, 46, 19);
      return (
        <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
          <defs>
            <radialGradient id={`${id}rg`} cx="40%" cy="35%" r="65%">
              <stop offset="0%" stopColor="white" stopOpacity="0.95"/>
              <stop offset="30%" stopColor={c[0]}/>
              <stop offset="70%" stopColor={c[1]}/>
              <stop offset="100%" stopColor={c[2]}/>
            </radialGradient>
            <radialGradient id={`${id}gl`} cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor={c[0]} stopOpacity="0.5"/>
              <stop offset="100%" stopColor={c[0]} stopOpacity="0"/>
            </radialGradient>
          </defs>
          <circle cx="50" cy="50" r="48" fill={`url(#${id}gl)`}/>
          <polygon points={pts} fill={`url(#${id}rg)`}/>
          <circle cx="50" cy="50" r="10" fill="white" opacity="0.4"/>
          <circle cx="37" cy="37" r="4" fill="white" opacity="0.65"/>
        </svg>
      );
    }
    case "float": {
      return (
        <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
          <defs>
            <radialGradient id={`${id}bg`} cx="34%" cy="32%" r="68%">
              <stop offset="0%" stopColor="white" stopOpacity="0.95"/>
              <stop offset="28%" stopColor={c[0]}/>
              <stop offset="65%" stopColor={c[1]}/>
              <stop offset="100%" stopColor={c[2]}/>
            </radialGradient>
            <radialGradient id={`${id}rim`} cx="50%" cy="50%" r="50%">
              <stop offset="60%" stopColor="transparent"/>
              <stop offset="100%" stopColor={c[2]} stopOpacity="0.8"/>
            </radialGradient>
          </defs>
          <circle cx="50" cy="50" r="44" fill={`url(#${id}bg)`}/>
          <circle cx="50" cy="50" r="44" fill={`url(#${id}rim)`}/>
          <ellipse cx="36" cy="31" rx="14" ry="9" fill="white" opacity="0.55" transform="rotate(-35 36 31)"/>
          <ellipse cx="65" cy="68" rx="7" ry="4" fill="white" opacity="0.2" transform="rotate(-35 65 68)"/>
        </svg>
      );
    }
    case "bounce": {
      return (
        <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
          <defs>
            <linearGradient id={`${id}l1`} x1="0.2" y1="0" x2="0.8" y2="1">
              <stop offset="0%" stopColor={c[0]}/>
              <stop offset="100%" stopColor={c[2]}/>
            </linearGradient>
            <linearGradient id={`${id}l2`} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor={c[1]}/>
              <stop offset="100%" stopColor={c[3]}/>
            </linearGradient>
          </defs>
          <polygon points="50,8 86,29 86,71 50,92 14,71 14,29" fill={`url(#${id}l1)`}/>
          <polygon points="50,8 86,29 50,50" fill={`url(#${id}l2)`} opacity="0.75"/>
          <polygon points="50,8 14,29 50,50" fill="white" opacity="0.22"/>
          <polygon points="86,71 50,92 50,50" fill="black" opacity="0.2"/>
          <polygon points="14,29 14,71 50,50" fill="black" opacity="0.1"/>
          <ellipse cx="42" cy="30" rx="13" ry="7" fill="white" opacity="0.5" transform="rotate(-20 42 30)"/>
        </svg>
      );
    }
    case "explosion": {
      const pts = makeStarPoints(6, 50, 50, 46, 22);
      return (
        <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
          <defs>
            <radialGradient id={`${id}rg`} cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="white"/>
              <stop offset="20%" stopColor={c[3] || c[0]}/>
              <stop offset="60%" stopColor={c[0]}/>
              <stop offset="100%" stopColor={c[1]}/>
            </radialGradient>
            <radialGradient id={`${id}gl`} cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor={c[0]} stopOpacity="0.55"/>
              <stop offset="100%" stopColor={c[0]} stopOpacity="0"/>
            </radialGradient>
          </defs>
          <circle cx="50" cy="50" r="48" fill={`url(#${id}gl)`}/>
          <polygon points={pts} fill={`url(#${id}rg)`}/>
          <circle cx="50" cy="50" r="13" fill="white" opacity="0.4"/>
          <circle cx="50" cy="50" r="6" fill="white" opacity="0.75"/>
        </svg>
      );
    }
    case "orbit": {
      return (
        <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
          <defs>
            <radialGradient id={`${id}pg`} cx="36%" cy="33%" r="67%">
              <stop offset="0%" stopColor={c[0]}/>
              <stop offset="55%" stopColor={c[1]}/>
              <stop offset="100%" stopColor={c[2]}/>
            </radialGradient>
            <mask id={`${id}bm`}>
              <rect width="100" height="100" fill="white"/>
              <circle cx="50" cy="50" r="29" fill="black"/>
            </mask>
            <clipPath id={`${id}fc`}>
              <rect x="0" y="46" width="100" height="54"/>
            </clipPath>
          </defs>
          <ellipse cx="50" cy="50" rx="46" ry="14" stroke={c[0]} strokeWidth="5" strokeOpacity="0.65" fill="none" transform="rotate(-25 50 50)" mask={`url(#${id}bm)`}/>
          <circle cx="50" cy="50" r="28" fill={`url(#${id}pg)`}/>
          <ellipse cx="40" cy="37" rx="10" ry="7" fill="white" opacity="0.45" transform="rotate(-20 40 37)"/>
          <ellipse cx="50" cy="50" rx="46" ry="14" stroke={c[0]} strokeWidth="5" fill="none" transform="rotate(-25 50 50)" clipPath={`url(#${id}fc)`}/>
        </svg>
      );
    }
    default: {
      return (
        <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
          <defs>
            <radialGradient id={`${id}fb`} cx="35%" cy="35%" r="65%">
              <stop offset="0%" stopColor={c[0]}/>
              <stop offset="100%" stopColor={c[2]}/>
            </radialGradient>
          </defs>
          <circle cx="50" cy="50" r="44" fill={`url(#${id}fb)`}/>
          <ellipse cx="38" cy="33" rx="12" ry="8" fill="white" opacity="0.4" transform="rotate(-30 38 33)"/>
        </svg>
      );
    }
  }
}

function GiftCard({ item, onClick }: { item: GiftItem; onClick: () => void }) {
  const cfg = RARITY_CONFIG[item.rarity] || RARITY_CONFIG.common;
  const emojiAnim = getEmojiAnimation(item.animationType);
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
          {hovered && item.rarity !== "common" && <FloatingParticles rarity={item.rarity} />}
          <motion.div className="mb-3 relative z-10" {...(emojiAnim as any)}>
            <GiftIconSVG animationType={item.animationType} rarity={item.rarity} size={64} />
          </motion.div>
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

function CelebrationOverlay({ animationType, giftName, onDone }: { animationType: string; giftName: string; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 3500);
    return () => clearTimeout(t);
  }, [onDone]);

  const emojiSets: Record<string, string[]> = {
    hearts: ["❤️","💕","💖","💗","💓"],
    fireworks: ["🎆","🎇","✨","💥","⭐"],
    confetti: ["🎊","🎉","🎈","🌟","💛","💜","🧡"],
    stars: ["⭐","🌟","✨","💫","🌠"],
    balloons: ["🎈","🎀","🎉","🥳","🎊"],
    sparkle: ["✨","💫","⚡","🌟","💥"],
  };
  const emojis = emojiSets[animationType] || emojiSets.confetti;

  return (
    <motion.div
      className="fixed inset-0 z-[200] pointer-events-none flex items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {Array.from({ length: 40 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute text-3xl"
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
          {emojis[i % emojis.length]}
        </motion.div>
      ))}
      <motion.div
        className="text-center z-10"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: [0, 1.2, 1], opacity: [0, 1, 1] }}
        exit={{ scale: 0, opacity: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <div className="bg-black/60 backdrop-blur-xl rounded-3xl p-8 border border-white/10">
          <div className="text-6xl mb-3">🎁</div>
          <div className="text-2xl font-black text-white">Подарок отправлен!</div>
          <div className="text-sm text-white/60 mt-1">{giftName} улетел к получателю</div>
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
                          <GiftIconSVG animationType={gift.giftItem?.animationType || "sparkle"} rarity={gift.giftItem?.rarity || "common"} size={52} />
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
                          <GiftIconSVG animationType={gift.giftItem?.animationType || "sparkle"} rarity={gift.giftItem?.rarity || "common"} size={52} />
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
                    <motion.div
                      className="mb-3 drop-shadow-2xl"
                      {...(getEmojiAnimation(selectedGift.animationType) as any)}
                    >
                      <GiftIconSVG animationType={selectedGift.animationType} rarity={selectedGift.rarity} size={96} />
                    </motion.div>
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
