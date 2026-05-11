import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";

interface ShowcaseGift {
  id: number;
  name: string;
  emoji: string;
  rarity: string;
  animation_type: string;
  stars: number;
  count: number;
}

const RARITY_CONFIG: Record<string, { glow: string; border: string; bg: string; label: string; labelColor: string }> = {
  cosmic:    { glow: "rgba(139,92,246,0.8)",   border: "rgba(139,92,246,0.6)", bg: "rgba(139,92,246,0.12)", label: "COSMIC",    labelColor: "text-violet-300" },
  legendary: { glow: "rgba(245,158,11,0.8)",   border: "rgba(245,158,11,0.6)", bg: "rgba(245,158,11,0.12)", label: "LEGENDARY", labelColor: "text-amber-300" },
  epic:      { glow: "rgba(147,51,234,0.7)",    border: "rgba(147,51,234,0.5)", bg: "rgba(147,51,234,0.10)", label: "EPIC",      labelColor: "text-purple-300" },
  rare:      { glow: "rgba(59,130,246,0.6)",    border: "rgba(59,130,246,0.4)", bg: "rgba(59,130,246,0.08)", label: "RARE",      labelColor: "text-blue-300" },
  common:    { glow: "rgba(148,163,184,0.25)",  border: "rgba(148,163,184,0.2)", bg: "rgba(148,163,184,0.05)", label: "COMMON",  labelColor: "text-slate-400" },
};

const RARITY_ORBS: Record<string, { inner: string; outer: string }> = {
  cosmic:    { inner: "radial-gradient(circle at 35% 30%, #c084fc, #7c3aed 55%, #4c1d95)", outer: "rgba(139,92,246,0.5)" },
  legendary: { inner: "radial-gradient(circle at 35% 30%, #fde68a, #f59e0b 55%, #92400e)", outer: "rgba(245,158,11,0.5)" },
  epic:      { inner: "radial-gradient(circle at 35% 30%, #c084fc, #9333ea 55%, #581c87)", outer: "rgba(147,51,234,0.5)" },
  rare:      { inner: "radial-gradient(circle at 35% 30%, #93c5fd, #3b82f6 55%, #1e3a8a)", outer: "rgba(59,130,246,0.5)" },
  common:    { inner: "radial-gradient(circle at 35% 30%, #e2e8f0, #94a3b8 55%, #475569)", outer: "rgba(148,163,184,0.3)" },
};

const GIFT_PNG_MAP: Record<string, string> = {
  "Сердечко":           "/gifts/gen/heart.png",
  "Звёздочка":          "/gifts/gen/star.png",
  "Мыльный пузырь":     "/gifts/gen/bubble.png",
  "Конфета":            "/gifts/gen/candy.png",
  "Клубника":           "/gifts/gen/strawberry.png",
  "Леденец":            "/gifts/gen/lollipop.png",
  "Ромашка":            "/gifts/gen/daisy.png",
  "Цветок сакуры":      "/gifts/gen/sakura.png",
  "Пончик":             "/gifts/gen/donut.png",
  "Мороженое":          "/gifts/gen/icecream.png",
  "Рыбка":              "/gifts/fish.png",
  "Подсолнух":          "/gifts/sunflower.png",
  "Чашка кофе":         "/gifts/coffee.png",
  "Луна":               "/gifts/moon.png",
  "Четырёхлистник":     "/gifts/clover.png",
  "Бабочка":            "/gifts/butterfly.png",
  "Котёнок":            "/gifts/kitten.png",
  "Воздушный шар":      "/gifts/balloon.png",
  "Ретро-телефон":      "/gifts/retro-phone.png",
  "Пицца":              "/gifts/pizza.png",
  "Медвежонок":         "/gifts/teddy-bear.png",
  "Торт":               "/gifts/birthday-cake.png",
  "Игровая приставка":  "/gifts/gaming-console.png",
  "Корона":             "/gifts/crown.png",
  "Красная роза":       "/gifts/rose-in-glass.png",
  "Бриллиант":          "/gifts/diamond-heart.png",
  "Золотая монета":     "/gifts/gold-coin.png",
  "Морская звезда":     "/gifts/star-42.png",
  "Горящее сердце":     "/gifts/rose-in-glass.png",
  "Волшебство":         "/gifts/magic-crystal.png",
  "Кристалл":           "/gifts/magic-crystal.png",
  "Магический гриб":    "/gifts/magic-crystal.png",
  "Сапфировый кулон":   "/gifts/magic-crystal.png",
  "Хрустальное сердце": "/gifts/diamond-heart.png",
  "Золотая рыбка":      "/gifts/fish.png",
  "Пульс":              "/gifts/confetti-box.png",
  "Легендарная звезда": "/gifts/star-42.png",
  "Звёздная колесница": "/gifts/star-small.png",
  "Корона Prime":       "/gifts/crown.png",
  "Пульс Сердца":       "/gifts/confetti-box.png",
  "Звезда Prime":       "/gifts/star-42.png",
  "Единый трон":        "/gifts/crown.png",
};

function getAnimation(animationType: string) {
  switch (animationType) {
    case "hearts":    return { animate: { scale: [1, 1.18, 0.96, 1.12, 0.99, 1], y: [0, -6, 1, -4, 0] }, transition: { duration: 1.8, repeat: Infinity, ease: "easeInOut" } };
    case "fireworks": return { animate: { scale: [1, 1.4, 0.82, 1.25, 0.95, 1], y: [0, -14, 4, -9, 0] }, transition: { duration: 1.2, repeat: Infinity, ease: "easeInOut" } };
    case "stars":     return { animate: { scale: [1, 1.14, 0.96, 1.09, 0.98, 1], y: [0, -5, 1, -3, 0] }, transition: { duration: 2.2, repeat: Infinity, ease: "easeInOut" } };
    case "sparkle":   return { animate: { scale: [1, 1.2, 0.92, 1.14, 0.97, 1], y: [0, -7, 2, -5, 0] }, transition: { duration: 1.5, repeat: Infinity } };
    case "confetti":  return { animate: { y: [0, -13, 3, -8, 0], scale: [1, 1.08, 0.96, 1.05, 1] }, transition: { duration: 1.4, repeat: Infinity, ease: "easeInOut" } };
    case "balloons":  return { animate: { y: [0, -20, -5, -14, 0], scale: [1, 1.04, 0.98, 1.02, 1] }, transition: { duration: 2.8, repeat: Infinity, ease: "easeInOut" } };
    case "diamonds":  return { animate: { scale: [1, 1.22, 0.9, 1.15, 0.96, 1], y: [0, -5, 2, -4, 0] }, transition: { duration: 1.8, repeat: Infinity } };
    case "lightning": return { animate: { scale: [1, 1.4, 0.8, 1.28, 0.92, 1], y: [0, -10, 3, -7, 0] }, transition: { duration: 0.75, repeat: Infinity, repeatDelay: 1.5 } };
    case "flame":     return { animate: { scale: [1, 1.14, 0.9, 1.1, 0.97, 1], y: [0, -10, 3, -7, 0] }, transition: { duration: 0.9, repeat: Infinity, ease: "easeInOut" } };
    case "magic":     return { animate: { scale: [1, 1.12, 0.97, 1.08, 0.99, 1], y: [0, -8, 2, -6, 0] }, transition: { duration: 2.0, repeat: Infinity } };
    case "galaxy":    return { animate: { scale: [1, 1.08, 0.97, 1.05, 0.99, 1], y: [0, -7, 1, -5, 0] }, transition: { duration: 3.5, repeat: Infinity, ease: "easeInOut" } };
    case "supernova": return { animate: { scale: [1, 1.5, 0.75, 1.35, 0.88, 1], y: [0, -18, 5, -12, 0] }, transition: { duration: 1.8, repeat: Infinity, repeatDelay: 0.5 } };
    case "vortex":    return { animate: { scale: [1, 1.15, 0.92, 1.1, 0.97, 1], y: [0, -10, 2, -7, 0] }, transition: { duration: 1.6, repeat: Infinity } };
    case "bounce":    return { animate: { y: [0, -22, 5, -13, 0], scale: [1, 0.88, 1.1, 0.95, 1] }, transition: { duration: 1.0, repeat: Infinity, ease: "easeInOut" } };
    default:          return { animate: { y: [0, -8, 2, -5, 0], scale: [1, 1.05, 0.97, 1.03, 1] }, transition: { duration: 2.0, repeat: Infinity, ease: "easeInOut" } };
  }
}

function GiftOrb({ gift, size }: { gift: ShowcaseGift; size: number }) {
  const pngSrc = GIFT_PNG_MAP[gift.name];
  const cfg = RARITY_CONFIG[gift.rarity] || RARITY_CONFIG.common;
  const orb = RARITY_ORBS[gift.rarity] || RARITY_ORBS.common;
  const anim = getAnimation(gift.animation_type);
  const isHigh = ["epic","legendary","cosmic"].includes(gift.rarity);
  const isTop = ["legendary","cosmic"].includes(gift.rarity);

  return (
    <div style={{ position: "relative", width: size, height: size }}>
      {isHigh && (
        <motion.div
          style={{
            position: "absolute",
            inset: -Math.round(size * 0.18),
            borderRadius: "50%",
            background: cfg.glow,
            filter: `blur(${Math.round(size * 0.3)}px)`,
            zIndex: 0,
          }}
          animate={{ opacity: [0.2, 0.65, 0.2], scale: [0.88, 1.12, 0.88] }}
          transition={{ duration: isTop ? 1.7 : 2.3, repeat: Infinity, ease: "easeInOut" }}
        />
      )}
      <motion.div
        {...(anim as any)}
        style={{ position: "relative", zIndex: 1, width: size, height: size, display: "flex", alignItems: "center", justifyContent: "center" }}
      >
        {pngSrc ? (
          <img
            src={pngSrc}
            alt={gift.name}
            style={{
              width: size,
              height: size,
              objectFit: "contain",
              filter: isTop
                ? `drop-shadow(0 0 ${Math.round(size*0.22)}px ${cfg.glow}) drop-shadow(0 0 ${Math.round(size*0.1)}px ${cfg.glow})`
                : isHigh
                ? `drop-shadow(0 0 ${Math.round(size*0.15)}px ${cfg.glow})`
                : `drop-shadow(0 2px ${Math.round(size*0.1)}px rgba(0,0,0,0.5))`,
            }}
            draggable={false}
          />
        ) : (
          <div
            style={{
              width: size,
              height: size,
              borderRadius: Math.round(size * 0.22),
              background: orb.inner,
              boxShadow: `0 0 ${Math.round(size*0.3)}px ${orb.outer}, 0 0 ${Math.round(size*0.55)}px ${cfg.glow}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: Math.round(size * 0.52),
              lineHeight: 1,
              overflow: "hidden",
              position: "relative",
            }}
          >
            <span style={{ filter: "drop-shadow(0 0 6px rgba(255,255,255,0.5))" }}>{gift.emoji}</span>
          </div>
        )}
      </motion.div>
      {isHigh && (
        <motion.div
          style={{
            position: "absolute",
            inset: -2,
            borderRadius: Math.round(size * 0.22) + 2,
            border: `${isTop ? 2 : 1.5}px solid ${cfg.border}`,
            zIndex: 2,
            pointerEvents: "none",
          }}
          animate={{ opacity: [0.3, 1, 0.3], scale: [0.96, 1.04, 0.96] }}
          transition={{ duration: isTop ? 1.4 : 2, repeat: Infinity, ease: "easeInOut" }}
        />
      )}
    </div>
  );
}

export function GiftShowcase({ userId }: { userId: number }) {
  const [gifts, setGifts] = useState<ShowcaseGift[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    const token = sessionStorage.getItem("pulse-token");
    fetch(`/api/users/${userId}/gift-showcase`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then(r => r.ok ? r.json() : [])
      .then(data => setGifts(Array.isArray(data) ? data : []))
      .catch(() => setGifts([]))
      .finally(() => setLoading(false));
  }, [userId]);

  if (loading) {
    return (
      <div className="rounded-3xl bg-card border border-border p-4">
        <div className="flex gap-3 justify-center">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="w-14 h-14 rounded-2xl bg-white/5 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (gifts.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-3xl bg-card border border-border overflow-hidden"
    >
      <div className="px-5 pt-4 pb-3 flex items-center gap-2">
        <Sparkles size={13} className="text-amber-400" />
        <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground">Витрина подарков</h3>
      </div>
      <div className="px-4 pb-5 flex flex-wrap gap-3 justify-start">
        {gifts.map((gift, idx) => {
          const cfg = RARITY_CONFIG[gift.rarity] || RARITY_CONFIG.common;
          const size = gift.rarity === "cosmic" ? 68 : gift.rarity === "legendary" ? 64 : gift.rarity === "epic" ? 60 : 54;
          return (
            <motion.div
              key={gift.id}
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.07 }}
              className="flex flex-col items-center gap-1.5 cursor-default group"
              title={`${gift.name} (${cfg.label})${gift.count > 1 ? ` × ${gift.count}` : ""}`}
            >
              <div style={{ position: "relative" }}>
                <GiftOrb gift={gift} size={size} />
                {gift.count > 1 && (
                  <div className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] rounded-full bg-primary text-primary-foreground text-[9px] font-black flex items-center justify-center px-1 border-2 border-card z-10">
                    {gift.count > 99 ? "99+" : gift.count}
                  </div>
                )}
              </div>
              <div className="flex flex-col items-center gap-0.5">
                <span className={`text-[9px] font-black uppercase tracking-widest ${cfg.labelColor} opacity-0 group-hover:opacity-100 transition-opacity`}>
                  {cfg.label}
                </span>
                <span className="text-[10px] text-muted-foreground text-center leading-tight max-w-[68px] truncate opacity-0 group-hover:opacity-100 transition-opacity">
                  {gift.name}
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
