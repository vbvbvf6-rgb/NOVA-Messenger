import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Sparkles, MessageSquare, Shield, Zap, Star, Bell, Palette } from "lucide-react";

const APP_VERSION = "2.1.0";
const STORAGE_KEY = "nova-whats-new-seen-version";

interface ChangelogEntry {
  icon: React.ReactNode;
  color: string;
  title: string;
  description: string;
}

const CHANGELOG: ChangelogEntry[] = [
  {
    icon: <Sparkles size={18} />,
    color: "text-amber-400 bg-amber-500/15",
    title: "SVG-графика везде",
    description: "Все иконки и эмодзи теперь используют векторный формат SVG — чёткость на любом экране.",
  },
  {
    icon: <MessageSquare size={18} />,
    color: "text-blue-400 bg-blue-500/15",
    title: "Флаги стран в пикере",
    description: "Флаги всех стран теперь отображаются корректно через Twemoji — больше никаких кодов.",
  },
  {
    icon: <Star size={18} />,
    color: "text-purple-400 bg-purple-500/15",
    title: "Стикеры — скоро",
    description: "Раздел стикеров временно скрыт. Мы готовим уникальный пак стикеров Aura — следите за обновлениями!",
  },
  {
    icon: <Bell size={18} />,
    color: "text-green-400 bg-green-500/15",
    title: "Журнал изменений",
    description: "Теперь при каждом обновлении вы видите это окно с новыми функциями. Всегда в курсе!",
  },
  {
    icon: <Shield size={18} />,
    color: "text-rose-400 bg-rose-500/15",
    title: "Улучшена безопасность",
    description: "Оптимизирована работа JWT-токенов и улучшена защита сессий.",
  },
  {
    icon: <Zap size={18} />,
    color: "text-orange-400 bg-orange-500/15",
    title: "Быстрее и стабильнее",
    description: "Ускорена загрузка чатов, исправлены мелкие баги в интерфейсе.",
  },
  {
    icon: <Palette size={18} />,
    color: "text-cyan-400 bg-cyan-500/15",
    title: "Railway-деплой",
    description: "Приложение теперь полностью поддерживает деплой на Railway с автоматической конфигурацией.",
  },
];

export function WhatsNewModal() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const seen = localStorage.getItem(STORAGE_KEY);
    if (seen !== APP_VERSION) {
      const timer = setTimeout(() => setOpen(true), 1200);
      return () => clearTimeout(timer);
    }
  }, []);

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, APP_VERSION);
    setOpen(false);
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[300] bg-black/60 backdrop-blur-sm"
            onClick={dismiss}
          />
          <motion.div
            key="modal"
            initial={{ opacity: 0, scale: 0.93, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.93, y: 24 }}
            transition={{ type: "spring", damping: 26, stiffness: 320 }}
            className="fixed inset-0 z-[301] flex items-center justify-center p-4 pointer-events-none"
          >
            <div className="pointer-events-auto w-full max-w-md bg-card border border-border rounded-3xl shadow-2xl overflow-hidden">
              {/* Header */}
              <div className="relative px-6 pt-7 pb-5 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-b border-border">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-primary/15 border border-primary/20 flex items-center justify-center shrink-0">
                    <svg width="28" height="28" viewBox="0 0 100 100" fill="none">
                      <path
                        d="M50 13 C50 13 54.5 41 87 50 C54.5 59 50 87 50 87 C50 87 45.5 59 13 50 C45.5 41 50 13 50 13Z"
                        fill="currentColor"
                        className="text-primary"
                      />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-black uppercase tracking-widest text-primary mb-0.5">
                      Версия {APP_VERSION}
                    </p>
                    <h2 className="text-[22px] font-black text-foreground leading-tight">
                      Что нового в Aura
                    </h2>
                    <p className="text-[13px] text-muted-foreground mt-1">
                      Обновление уже установлено — вот что изменилось
                    </p>
                  </div>
                </div>
                <button
                  onClick={dismiss}
                  className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Changelog list */}
              <div className="px-5 py-4 space-y-3 max-h-[340px] overflow-y-auto scrollbar-none">
                {CHANGELOG.map((entry, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.05 + i * 0.04 }}
                    className="flex gap-3 items-start"
                  >
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${entry.color}`}>
                      {entry.icon}
                    </div>
                    <div className="flex-1 min-w-0 pt-0.5">
                      <p className="text-[14px] font-bold text-foreground leading-tight">{entry.title}</p>
                      <p className="text-[12px] text-muted-foreground leading-relaxed mt-0.5">{entry.description}</p>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Footer */}
              <div className="px-5 pb-5 pt-3 border-t border-border">
                <button
                  onClick={dismiss}
                  className="w-full py-3.5 bg-primary text-primary-foreground rounded-[16px] text-[15px] font-black hover:bg-primary/90 transition-all shadow-[0_4px_14px_rgba(234,88,12,0.3)] hover:-translate-y-0.5 active:translate-y-0"
                >
                  Отлично, понятно!
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
