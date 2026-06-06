import React from "react";
import { Link, useLocation } from "wouter";
import { MessageCircle, Phone, Users, Rss, Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import { useGetChats } from "@workspace/api-client-react";
import { useAppContext } from "@/contexts/AppContext";
import { motion } from "framer-motion";

interface BottomNavProps {
  onOpenPalette?: () => void;
  onOpenSidebar?: () => void;
}

export function BottomNav({ onOpenPalette, onOpenSidebar }: BottomNavProps) {
  const [location] = useLocation();
  const { data: chats } = useGetChats();
  const { selectedChatId } = useAppContext();

  const totalUnread = chats?.reduce((sum: number, c: any) => sum + (c.unreadCount || 0), 0) ?? 0;

  const NAV_ITEMS = [
    { href: "/",         icon: MessageCircle, label: "Чаты",     badge: totalUnread },
    { href: "/calls",    icon: Phone,         label: "Звонки",   badge: 0 },
    { href: "/contacts", icon: Users,         label: "Контакты", badge: 0 },
    { href: "/feed",     icon: Rss,           label: "Лента",    badge: 0 },
  ];

  if (selectedChatId && location === "/") return null;

  return (
    <nav
      className="flex md:hidden fixed bottom-0 inset-x-0 z-50 pointer-events-none"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <div className="mx-3 mb-3 flex-1 bg-card/80 dark:bg-card/90 backdrop-blur-2xl border border-border/60 dark:border-white/8 rounded-[22px] flex items-stretch justify-around px-1 pointer-events-auto shadow-[0_8px_32px_rgba(0,0,0,0.10)] dark:shadow-[0_8px_40px_rgba(0,0,0,0.35)]">
        {NAV_ITEMS.map((item) => {
          const isActive = item.href === "/"
            ? location === "/"
            : location.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative flex flex-col items-center justify-center gap-1 flex-1 py-2.5 min-h-[58px] landscape:py-1 landscape:min-h-[42px] transition-all duration-200 group rounded-[18px] my-1.5 mx-0.5",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground active:scale-95"
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="bottomNavActive"
                  className="absolute inset-0 bg-primary/10 rounded-[18px]"
                  transition={{ type: "spring", stiffness: 380, damping: 32 }}
                />
              )}
              <div className="relative z-10">
                <item.icon
                  size={22}
                  strokeWidth={isActive ? 2.5 : 1.8}
                  className={cn(
                    "transition-all duration-200",
                    isActive ? "scale-110" : "group-active:scale-90"
                  )}
                  fill={isActive ? "currentColor" : "none"}
                />
                {item.badge > 0 && (
                  <div className={cn(
                    "absolute -top-1.5 -right-2 min-w-[17px] h-[17px] px-1 rounded-full text-[9px] font-black flex items-center justify-center border-[1.5px]",
                    isActive
                      ? "bg-primary text-white border-card"
                      : "bg-primary text-white border-card"
                  )}>
                    {item.badge > 99 ? "99+" : item.badge}
                  </div>
                )}
              </div>
              <span className={cn(
                "text-[10px] font-bold leading-none transition-all duration-200 relative z-10 landscape:hidden",
                isActive ? "text-primary" : "text-muted-foreground/70"
              )}>
                {item.label}
              </span>
            </Link>
          );
        })}

        <button
          onClick={onOpenSidebar}
          className="relative flex flex-col items-center justify-center gap-1 flex-1 py-2.5 min-h-[58px] landscape:py-1 landscape:min-h-[42px] transition-all duration-200 group rounded-[18px] my-1.5 mx-0.5 text-muted-foreground active:scale-95 hover:bg-secondary/50"
        >
          <Menu size={22} strokeWidth={1.8} className="group-active:scale-90 transition-transform" />
          <span className="text-[10px] font-bold leading-none text-muted-foreground/70 landscape:hidden">Ещё</span>
        </button>
      </div>
    </nav>
  );
}
