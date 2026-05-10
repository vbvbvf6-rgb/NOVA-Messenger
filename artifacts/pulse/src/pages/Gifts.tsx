import React, { useState, useEffect, useCallback, useRef } from "react";
import { useGetGiftCatalog, useGetSentGifts, useGetReceivedGifts, useGetMe, GiftItem, Gift } from "@workspace/api-client-react";
import { Zap, ArrowUpRight, ArrowDownLeft, Gift as GiftIcon, Search, AlertTriangle, X, UserRound, MessageSquare, EyeOff, Crown, Lock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion, AnimatePresence } from "framer-motion";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { formatDistanceToNow } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";

const RARITY_CONFIG: Record<string, {
  cardBg: string; border: string; glow: string;
  badge: string; label: string; shimmer: string; textColor: string;
}> = {
  cosmic: {
    cardBg: "from-violet-500/25 via-fuchsia-400/15 to-pink-500/25",
    border: "border-violet-400/50",
    glow: "shadow-[0_4px_28px_rgba(139,92,246,0.55)] hover:shadow-[0_6px_40px_rgba(139,92,246,0.75)]",
    badge: "bg-violet-500/30 text-violet-200 border-violet-400/50",
    label: "COSMIC",
    shimmer: "rgba(167,139,250,0.25)",
    textColor: "text-violet-200",
  },
  legendary: {
    cardBg: "from-amber-500/25 via-yellow-400/15 to-orange-400/20",
    border: "border-amber-400/50",
    glow: "shadow-[0_4px_24px_rgba(245,158,11,0.5)] hover:shadow-[0_6px_36px_rgba(245,158,11,0.7)]",
    badge: "bg-amber-500/30 text-amber-200 border-amber-400/50",
    label: "LEGENDARY",
    shimmer: "rgba(251,191,36,0.25)",
    textColor: "text-amber-200",
  },
  epic: {
    cardBg: "from-purple-500/25 via-violet-400/15 to-indigo-500/20",
    border: "border-purple-400/40",
    glow: "shadow-[0_4px_18px_rgba(147,51,234,0.45)] hover:shadow-[0_6px_30px_rgba(147,51,234,0.65)]",
    badge: "bg-purple-500/30 text-purple-200 border-purple-400/50",
    label: "EPIC",
    shimmer: "rgba(192,132,252,0.25)",
    textColor: "text-purple-200",
  },
  rare: {
    cardBg: "from-blue-500/20 via-sky-400/12 to-cyan-500/18",
    border: "border-blue-400/35",
    glow: "shadow-[0_4px_14px_rgba(59,130,246,0.4)] hover:shadow-[0_6px_24px_rgba(59,130,246,0.6)]",
    badge: "bg-blue-500/30 text-blue-200 border-blue-400/40",
    label: "RARE",
    shimmer: "rgba(96,165,250,0.2)",
    textColor: "text-blue-200",
  },
  common: {
    cardBg: "from-slate-500/15 via-slate-400/8 to-slate-500/12",
    border: "border-slate-400/20",
    glow: "shadow-[0_2px_8px_rgba(0,0,0,0.25)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.35)]",
    badge: "bg-slate-500/30 text-slate-300 border-slate-400/30",
    label: "COMMON",
    shimmer: "rgba(148,163,184,0.15)",
    textColor: "text-slate-300",
  },
};


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
    case "supernova":
      return {
        animate: { scale: [1, 1.5, 0.8, 1.35, 0.95, 1], filter: ["brightness(1)", "brightness(2.5)", "brightness(0.9)", "brightness(2)", "brightness(1)"] },
        transition: { duration: 1.8, repeat: Infinity, repeatDelay: 0.6 },
      };
    case "vortex":
      return {
        animate: { rotate: [0, 360], scale: [1, 1.12, 0.94, 1.06, 1] },
        transition: { duration: 1.4, repeat: Infinity, ease: "linear" },
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

function FloatingParticles({ shimmer }: { shimmer: string }) {
  return (
    <>
      {Array.from({ length: 6 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 rounded-full pointer-events-none"
          style={{ top: "50%", left: "50%", backgroundColor: shimmer.replace("0.25)", "0.8)") }}
          animate={{
            x: [0, Math.cos(i * 60 * Math.PI / 180) * 38, 0],
            y: [0, Math.sin(i * 60 * Math.PI / 180) * 38, 0],
            opacity: [0, 1, 0],
            scale: [0, 1.4, 0],
          }}
          transition={{ duration: 2.2, repeat: Infinity, delay: i * 0.3, ease: "easeInOut" }}
        />
      ))}
    </>
  );
}

function GiftEmoji({ emoji, animationType, size = 64 }: {
  emoji: string;
  animationType: string;
  size?: number;
}) {
  const anim = getEmojiAnimation(animationType);
  return (
    <motion.span
      className="select-none block leading-none"
      style={{
        fontSize: size * 0.82,
        fontFamily: '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif',
        filter: `drop-shadow(0 ${Math.round(size * 0.06)}px ${Math.round(size * 0.15)}px rgba(0,0,0,0.45))`,
        lineHeight: 1,
      }}
      {...(anim as any)}
    >
      {emoji}
    </motion.span>
  );
}

function GiftCard({ item, onClick, hasPrime }: { item: GiftItem; onClick: () => void; hasPrime: boolean }) {
  const cfg = RARITY_CONFIG[item.rarity] || RARITY_CONFIG.common;
  const [hovered, setHovered] = useState(false);
  const isPrimeOnly = !!(item as any).primeOnly;
  const isLocked = isPrimeOnly && !hasPrime;
  const isHighRarity = ["cosmic", "legendary", "epic"].includes(item.rarity);

  return (
    <motion.div
      whileHover={{ y: -5, scale: 1.02 }}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      className={`relative cursor-pointer rounded-2xl overflow-hidden transition-shadow duration-300 ${isLocked ? "opacity-70" : cfg.glow}`}
    >
      <div className={`relative rounded-2xl border ${isPrimeOnly ? "border-amber-400/50" : cfg.border} overflow-hidden`}>
        <div className={`absolute inset-0 bg-gradient-to-br ${isPrimeOnly ? "from-amber-500/20 via-yellow-400/10 to-orange-500/18" : cfg.cardBg}`} />
        {hovered && isHighRarity && !isLocked && (
          <AnimatePresence>
            <motion.div
              className="absolute inset-0 pointer-events-none"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{ background: `radial-gradient(circle at 50% 40%, ${cfg.shimmer} 0%, transparent 65%)` }}
            />
          </AnimatePresence>
        )}
        <div className="relative p-4 flex flex-col items-center text-center gap-2.5 min-h-[168px] justify-center">
          {hovered && isHighRarity && !isLocked && <FloatingParticles shimmer={cfg.shimmer} />}
          <div className="flex items-center justify-center" style={{ width: 72, height: 72 }}>
            <GiftEmoji emoji={item.emoji} animationType={item.animationType} size={72} />
          </div>
          <div>
            <h3 className="font-semibold text-sm leading-tight text-foreground">{item.name}</h3>
            <div className="flex items-center justify-center gap-1 mt-1 text-xs text-muted-foreground">
              <span className="text-yellow-400">⭐</span>
              <span>{item.stars}</span>
            </div>
          </div>
          <span className={`absolute top-2 right-2 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full border ${isPrimeOnly ? "bg-amber-500/30 text-amber-300 border-amber-400/50" : cfg.badge}`}>
            {isPrimeOnly ? "PRIME" : cfg.label}
          </span>
          {isLocked && (
            <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px] flex flex-col items-center justify-center gap-1 z-20 rounded-2xl">
              <Lock size={22} className="text-amber-400" />
              <span className="text-[10px] font-bold text-amber-400 flex items-center gap-0.5"><Crown size={9} /> Prime</span>
            </div>
          )}
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
          <div className="mb-4 flex items-center justify-center" style={{ width: 96, height: 96 }}>
            <GiftEmoji emoji={emoji} animationType={animationType} size={96} />
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
  const { data: me } = useGetMe();
  const hasPrime = (me as any)?.hasPrime ?? false;
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

      <header className="h-16 border-b border-rose-900/40 flex items-center px-6 justify-between z-10 shrink-0" style={{ background: "linear-gradient(135deg, #1a0409 0%, #2d0916 100%)" }}>
        <h1 className="text-xl font-bold flex items-center gap-2 text-rose-100">
          <span className="text-2xl">🌹</span> Подарки
        </h1>
        <div className="flex items-center gap-1.5 text-sm font-bold text-rose-300 bg-rose-500/10 px-3 py-1.5 rounded-full border border-rose-500/30">
          <Zap size={14} className="text-rose-400" /> {balance} Монета
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
                  <GiftCard
                    key={item.id}
                    item={item}
                    hasPrime={hasPrime}
                    onClick={() => {
                      if ((item as any).primeOnly && !hasPrime) {
                        window.location.href = "/prime";
                        return;
                      }
                      setSelectedGift(item);
                    }}
                  />
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
                    <motion.div key={gift.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className={`rounded-2xl border ${cfg.border} overflow-hidden`}>
                      <div className={`absolute inset-0 bg-gradient-to-br ${cfg.cardBg} pointer-events-none`} />
                      <div className="relative bg-card/80 rounded-2xl p-4 flex items-center gap-4">
                        <div className="shrink-0 flex items-center justify-center" style={{ width: 52, height: 52 }}>
                          <GiftEmoji
                            emoji={gift.giftItem?.emoji || "🎁"}
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
                        <div className="flex items-center gap-1 text-yellow-400 text-sm font-bold shrink-0">
                          <span>⭐</span>{gift.giftItem?.stars}
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
                    <motion.div key={gift.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className={`relative rounded-2xl border ${cfg.border} overflow-hidden`}>
                      <div className={`absolute inset-0 bg-gradient-to-br ${cfg.cardBg} pointer-events-none`} />
                      <div className="relative bg-card/80 rounded-2xl p-4 flex items-center gap-4">
                        <div className="shrink-0 flex items-center justify-center" style={{ width: 52, height: 52 }}>
                          <GiftEmoji
                            emoji={gift.giftItem?.emoji || "🎁"}
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
                        <div className="flex items-center gap-1 text-yellow-400 text-sm font-bold shrink-0">
                          <span>⭐</span>{gift.giftItem?.stars}
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
                <div className={`rounded-3xl border ${getRarityColor(selectedGift.rarity).border} overflow-hidden`}>
                  <div className={`absolute inset-0 bg-gradient-to-br ${getRarityColor(selectedGift.rarity).cardBg} pointer-events-none rounded-3xl`} />
                  <div className="relative bg-[hsl(222,47%,13%)] rounded-3xl p-5 flex flex-col items-center text-center">
                    <div className="mb-4 flex items-center justify-center" style={{ width: 96, height: 96 }}>
                      <GiftEmoji
                        emoji={selectedGift.emoji}
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
                          <Zap size={16} className="text-primary" /> {selectedGift.stars} Монета
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-0.5">Ваш баланс</p>
                        <div className={`flex items-center gap-1 font-bold text-sm ${canAfford ? "text-green-400" : "text-red-400"}`}>
                          <Zap size={14} /> {balance} Монета
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
                        Недостаточно ⚡ Монета. Пополните баланс в Кошельке.
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
