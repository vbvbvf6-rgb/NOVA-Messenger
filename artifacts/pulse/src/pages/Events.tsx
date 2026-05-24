import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CalendarDays, MapPin, Users, Clock, ChevronRight, Star, Flame, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";

type EventCategory = "all" | "upcoming" | "popular" | "nearby";

interface PulseEvent {
  id: number;
  title: string;
  titleEn: string;
  description: string;
  descriptionEn: string;
  date: string;
  time: string;
  location: string;
  locationEn: string;
  category: string;
  categoryEn: string;
  attendees: number;
  featured?: boolean;
  color: string;
  emoji: string;
}

const EVENTS: PulseEvent[] = [
  {
    id: 1,
    title: "Pulse Community Meetup",
    titleEn: "Pulse Community Meetup",
    description: "Встреча сообщества Pulse — обсуждение новых функций, знакомство с командой и другими пользователями.",
    descriptionEn: "Join the Pulse community to discuss new features, meet the team and other users.",
    date: "28 мая",
    time: "19:00",
    location: "Москва, Центр",
    locationEn: "Moscow, Center",
    category: "Встреча",
    categoryEn: "Meetup",
    attendees: 142,
    featured: true,
    color: "from-violet-500 to-indigo-600",
    emoji: "🎉",
  },
  {
    id: 2,
    title: "Pulse Hackathon 2026",
    titleEn: "Pulse Hackathon 2026",
    description: "48-часовой хакатон для разработчиков. Создайте лучшее приложение и выиграйте Spark-награды.",
    descriptionEn: "48-hour hackathon for developers. Build the best app and win Spark rewards.",
    date: "1 июня",
    time: "10:00",
    location: "Онлайн",
    locationEn: "Online",
    category: "Хакатон",
    categoryEn: "Hackathon",
    attendees: 389,
    featured: true,
    color: "from-orange-500 to-rose-600",
    emoji: "💻",
  },
  {
    id: 3,
    title: "AMA с командой Pulse",
    titleEn: "AMA with Pulse Team",
    description: "Сессия вопросов и ответов с командой разработчиков. Задайте любой вопрос о продукте.",
    descriptionEn: "Q&A session with the development team. Ask anything about the product.",
    date: "5 июня",
    time: "18:00",
    location: "Pulse Live",
    locationEn: "Pulse Live",
    category: "AMA",
    categoryEn: "AMA",
    attendees: 671,
    color: "from-sky-500 to-blue-600",
    emoji: "🎙️",
  },
  {
    id: 4,
    title: "Pulse Gaming Tournament",
    titleEn: "Pulse Gaming Tournament",
    description: "Онлайн-турнир среди пользователей Pulse. Соревнуйтесь и зарабатывайте Spark.",
    descriptionEn: "Online tournament among Pulse users. Compete and earn Spark rewards.",
    date: "10 июня",
    time: "20:00",
    location: "Онлайн",
    locationEn: "Online",
    category: "Турнир",
    categoryEn: "Tournament",
    attendees: 204,
    color: "from-green-500 to-emerald-600",
    emoji: "🎮",
  },
  {
    id: 5,
    title: "Вебинар: Приватность в Pulse",
    titleEn: "Webinar: Privacy in Pulse",
    description: "Узнайте всё о настройках приватности, 2FA и безопасности вашего аккаунта.",
    descriptionEn: "Learn everything about privacy settings, 2FA, and account security.",
    date: "15 июня",
    time: "17:00",
    location: "Онлайн",
    locationEn: "Online",
    category: "Вебинар",
    categoryEn: "Webinar",
    attendees: 118,
    color: "from-gray-500 to-slate-600",
    emoji: "🔒",
  },
];

const CATEGORIES: { id: EventCategory; labelRu: string; labelEn: string }[] = [
  { id: "all",      labelRu: "Все",         labelEn: "All" },
  { id: "upcoming", labelRu: "Скоро",       labelEn: "Upcoming" },
  { id: "popular",  labelRu: "Популярные",  labelEn: "Popular" },
  { id: "nearby",   labelRu: "Онлайн",      labelEn: "Online" },
];

export default function Events() {
  const { t } = useLanguage();
  const lang = localStorage.getItem("pulse-language") || "ru";
  const [activeCategory, setActiveCategory] = useState<EventCategory>("all");
  const [joined, setJoined] = useState<Set<number>>(new Set());

  const filtered = EVENTS.filter(e => {
    if (activeCategory === "all") return true;
    if (activeCategory === "upcoming") return e.id <= 2;
    if (activeCategory === "popular") return e.attendees > 200;
    if (activeCategory === "nearby") return (lang === "ru" ? e.location : e.locationEn) === (lang === "ru" ? "Онлайн" : "Online");
    return true;
  });

  const featured = EVENTS.filter(e => e.featured);

  const toggleJoin = (id: number) => {
    setJoined(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden">
      <div className="flex-1 overflow-y-auto scrollbar-none pb-8">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-xl border-b border-border px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/20 shrink-0">
              <CalendarDays size={18} className="text-white" />
            </div>
            <div>
              <h1 className="text-lg font-black text-foreground leading-tight">
                {lang === "ru" ? "События" : "Events"}
              </h1>
              <p className="text-xs text-muted-foreground">
                {lang === "ru" ? `${EVENTS.length} предстоящих событий` : `${EVENTS.length} upcoming events`}
              </p>
            </div>
          </div>
        </div>

        <div className="px-4 pt-4 space-y-5">
          {/* Featured banner */}
          {featured.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Flame size={14} className="text-orange-500" />
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
                  {lang === "ru" ? "Избранные" : "Featured"}
                </span>
              </div>
              <div className="flex gap-3 overflow-x-auto scrollbar-none pb-1 -mx-4 px-4">
                {featured.map(event => (
                  <motion.div
                    key={event.id}
                    whileTap={{ scale: 0.97 }}
                    className={cn(
                      "min-w-[260px] rounded-2xl bg-gradient-to-br p-4 text-white cursor-pointer shrink-0 relative overflow-hidden",
                      event.color
                    )}
                  >
                    <div className="absolute top-3 right-3 text-2xl opacity-60">{event.emoji}</div>
                    <div className="text-xs font-bold uppercase tracking-wider opacity-75 mb-1">
                      {lang === "ru" ? event.category : event.categoryEn}
                    </div>
                    <p className="font-black text-base leading-tight mb-2 pr-8">
                      {lang === "ru" ? event.title : event.titleEn}
                    </p>
                    <div className="flex items-center gap-3 text-xs opacity-80">
                      <span className="flex items-center gap-1"><Clock size={11}/>{event.date} · {event.time}</span>
                      <span className="flex items-center gap-1"><Users size={11}/>{event.attendees}</span>
                    </div>
                    <button
                      onClick={() => toggleJoin(event.id)}
                      className="mt-3 w-full py-2 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-bold transition-colors border border-white/20"
                    >
                      {joined.has(event.id)
                        ? (lang === "ru" ? "✓ Вы участвуете" : "✓ Joined")
                        : (lang === "ru" ? "Участвовать" : "Join Event")}
                    </button>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* Category tabs */}
          <div className="flex gap-2 overflow-x-auto scrollbar-none -mx-4 px-4 pb-1">
            {CATEGORIES.map(cat => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all shrink-0",
                  activeCategory === cat.id
                    ? "bg-primary text-primary-foreground shadow-[0_2px_10px_rgba(139,92,246,0.3)]"
                    : "bg-secondary text-muted-foreground hover:text-foreground"
                )}
              >
                {lang === "ru" ? cat.labelRu : cat.labelEn}
              </button>
            ))}
          </div>

          {/* Events list */}
          <AnimatePresence mode="popLayout">
            <div className="space-y-3">
              {filtered.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-12 text-muted-foreground text-sm"
                >
                  {lang === "ru" ? "Нет событий в этой категории" : "No events in this category"}
                </motion.div>
              ) : (
                filtered.map((event, i) => (
                  <motion.div
                    key={event.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ delay: i * 0.04 }}
                    className="bg-card border border-border rounded-2xl overflow-hidden hover:border-border/80 transition-all"
                  >
                    <div className="p-4">
                      <div className="flex items-start gap-3">
                        <div className={cn(
                          "w-11 h-11 rounded-xl bg-gradient-to-br flex items-center justify-center text-xl shrink-0",
                          event.color
                        )}>
                          {event.emoji}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="font-bold text-sm text-foreground leading-tight">
                                {lang === "ru" ? event.title : event.titleEn}
                              </p>
                              <span className="text-[10px] font-semibold text-muted-foreground bg-secondary px-1.5 py-0.5 rounded-full mt-0.5 inline-block">
                                {lang === "ru" ? event.category : event.categoryEn}
                              </span>
                            </div>
                            {event.featured && (
                              <Star size={14} className="text-amber-400 fill-amber-400 shrink-0 mt-0.5" />
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed line-clamp-2">
                            {lang === "ru" ? event.description : event.descriptionEn}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1.5">
                          <Clock size={12} className="text-primary/70" />
                          {event.date} · {event.time}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <MapPin size={12} className="text-primary/70" />
                          {lang === "ru" ? event.location : event.locationEn}
                        </span>
                        <span className="flex items-center gap-1.5 ml-auto">
                          <Users size={12} />
                          {event.attendees}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 mt-3">
                        <button
                          onClick={() => toggleJoin(event.id)}
                          className={cn(
                            "flex-1 py-2 rounded-xl text-xs font-bold transition-all",
                            joined.has(event.id)
                              ? "bg-primary/10 text-primary border border-primary/20"
                              : "bg-primary text-primary-foreground hover:opacity-90 shadow-[0_2px_10px_rgba(139,92,246,0.25)]"
                          )}
                        >
                          {joined.has(event.id)
                            ? (lang === "ru" ? "✓ Участвую" : "✓ Joined")
                            : (lang === "ru" ? "Участвовать" : "Join")}
                        </button>
                        <button className="p-2 rounded-xl border border-border text-muted-foreground hover:bg-secondary transition-colors">
                          <ChevronRight size={14} />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
