import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RefreshCw } from "lucide-react";

const APP_VERSION = "2.4.0";
const STORAGE_KEY = "aura-update-seen-v";

export function WhatsNewModal() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const seen = localStorage.getItem(STORAGE_KEY);
    if (seen !== APP_VERSION) {
      const timer = setTimeout(() => setOpen(true), 800);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, []);

  const handleUpdate = () => {
    localStorage.setItem(STORAGE_KEY, APP_VERSION);
    setOpen(false);
    window.location.reload();
  };

  const handleSkip = () => {
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
            className="fixed inset-0 z-[300] bg-black/70 backdrop-blur-sm"
            onClick={handleSkip}
          />
          <motion.div
            key="modal"
            initial={{ opacity: 0, scale: 0.92, y: 28 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 28 }}
            transition={{ type: "spring", damping: 28, stiffness: 340 }}
            className="fixed inset-0 z-[301] flex items-center justify-center p-4 pointer-events-none"
          >
            <div className="pointer-events-auto w-full max-w-sm bg-card border border-border rounded-3xl shadow-2xl overflow-hidden">
              <div className="px-7 pt-8 pb-6 flex flex-col items-center text-center">
                <motion.div
                  initial={{ scale: 0.7, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.1, type: "spring", stiffness: 200, damping: 18 }}
                  className="w-18 h-18 w-[72px] h-[72px] rounded-[22px] bg-gradient-to-br from-primary via-orange-500 to-amber-500 flex items-center justify-center shadow-2xl shadow-primary/30 mb-5"
                >
                  <RefreshCw size={30} className="text-white" />
                </motion.div>

                <h2 className="text-2xl font-black text-foreground leading-tight mb-2">
                  Доступно обновление
                </h2>
                <p className="text-[14px] text-muted-foreground leading-relaxed mb-7">
                  Новая версия Aura готова к установке. Нажмите «Обновить» чтобы получить последние исправления и улучшения.
                </p>

                <button
                  onClick={handleUpdate}
                  className="w-full py-4 bg-primary text-primary-foreground rounded-2xl text-[16px] font-black hover:bg-primary/90 transition-all shadow-[0_6px_24px_rgba(234,88,12,0.4)] hover:-translate-y-0.5 active:translate-y-0 active:shadow-none mb-3"
                >
                  Обновить
                </button>
                <button
                  onClick={handleSkip}
                  className="text-[13px] font-semibold text-muted-foreground hover:text-foreground transition-colors py-1"
                >
                  Позже
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
