import React from "react";
import { motion } from "framer-motion";
import { Trophy } from "lucide-react";

export function GiftLeaderboard({ userId: _userId }: { userId: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="rounded-3xl bg-card border border-border overflow-hidden"
    >
      <div className="px-5 pt-4 pb-3 flex items-center gap-2 border-b border-border">
        <div className="w-7 h-7 rounded-lg bg-amber-500/15 flex items-center justify-center">
          <Trophy size={14} className="text-amber-400" />
        </div>
        <span className="text-sm font-black text-foreground">Рейтинг подарков</span>
        <span className="ml-auto text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/25">Soon</span>
      </div>
      <div className="flex flex-col items-center gap-2 py-6 px-4 text-muted-foreground">
        <span className="text-3xl">🏆</span>
        <p className="text-sm font-semibold text-foreground/70">Рейтинг подарков — скоро</p>
        <p className="text-xs text-center opacity-60">Функция появится в ближайшем обновлении</p>
      </div>
    </motion.div>
  );
}
