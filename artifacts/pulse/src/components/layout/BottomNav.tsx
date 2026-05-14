import React from "react";
import { Link, useLocation } from "wouter";
import { MessageCircle, Phone, Users, Gift, Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import { useGetChats } from "@workspace/api-client-react";
import { useAppContext } from "@/contexts/AppContext";

interface BottomNavProps {
  onMoreClick?: () => void;
}

export function BottomNav({ onMoreClick }: BottomNavProps) {
  const [location] = useLocation();
  const { data: chats } = useGetChats();
  const { selectedChatId } = useAppContext();

  const totalUnread = chats?.reduce((sum: number, c: any) => sum + (c.unreadCount || 0), 0) ?? 0;

  const NAV_ITEMS: Array<{ href: string; icon: any; label: string; badge: number; soon?: boolean }> = [
    { href: "/",          icon: MessageCircle, label: "Чаты",     badge: totalUnread },
    { href: "/calls",     icon: Phone,         label: "Звонки",   badge: 0 },
    { href: "/contacts",  icon: Users,         label: "Контакты", badge: 0 },
    { href: "/gifts",     icon: Gift,          label: "Подарки",  badge: 0, soon: true },
  ];

  if (selectedChatId) return null;

  return (
    <nav
      className="flex md:hidden fixed bottom-0 inset-x-0 z-50"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <div className="w-full bg-card/95 backdrop-blur-xl border-t border-border flex items-center justify-around px-1 pt-1 pb-2">
        {NAV_ITEMS.map((item) => {
          const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative flex flex-col items-center gap-[3px] px-4 py-1.5 rounded-2xl transition-all min-w-[52px]",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
            >
              <div className="relative">
                <item.icon
                  size={23}
                  strokeWidth={isActive ? 2.5 : 1.8}
                  className={cn(
                    "transition-all duration-200",
                    isActive && "drop-shadow-[0_0_8px_hsl(var(--primary)/0.7)] scale-110"
                  )}
                />
                {item.badge > 0 && (
                  <div className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-black flex items-center justify-center shadow-sm">
                    {item.badge > 99 ? "99+" : item.badge}
                  </div>
                )}
                {item.soon && item.badge === 0 && (
                  <div className="absolute -top-1.5 -right-1.5 px-1 py-px rounded-full bg-amber-500 text-white text-[8px] font-black leading-none shadow-sm">
                    soon
                  </div>
                )}
              </div>
              <span className={cn(
                "text-[10px] font-semibold leading-none transition-colors",
                isActive ? "text-primary" : "text-muted-foreground/70"
              )}>
                {item.label}
              </span>
              {isActive && (
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary" />
              )}
            </Link>
          );
        })}

        <button
          onClick={onMoreClick}
          className="flex flex-col items-center gap-[3px] px-4 py-1.5 rounded-2xl transition-all min-w-[52px] text-muted-foreground active:text-foreground"
        >
          <Menu size={23} strokeWidth={1.8} className="transition-all duration-200" />
          <span className="text-[10px] font-semibold leading-none text-muted-foreground/70">Ещё</span>
        </button>
      </div>
    </nav>
  );
}
