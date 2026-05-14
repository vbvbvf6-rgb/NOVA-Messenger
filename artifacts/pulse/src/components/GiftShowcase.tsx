import React from "react";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";

export function GiftShowcase({ userId: _userId }: { userId: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-3xl bg-card border border-border overflow-hidden"
    >
      <div className="px-5 pt-4 pb-3 flex items-center gap-2">
        <Sparkles size={13} className="text-amber-400" />
        <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground">Витрина подарков</h3>
        <span className="ml-auto text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/25">Soon</span>
      </div>
      <div className="flex flex-col items-center gap-2 py-5 px-4 text-muted-foreground">
        <span className="text-3xl">🎁</span>
        <p className="text-sm font-semibold text-foreground/70">Витрина подарков — скоро</p>
        <p className="text-xs text-center opacity-60">Функция появится в ближайшем обновлении</p>
      </div>
    </motion.div>
  );
}
