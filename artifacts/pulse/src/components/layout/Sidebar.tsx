import React from "react";
import { Link, useLocation } from "wouter";
import {
  MessageCircle,
  Phone,
  Users,
  Gift,
  History,
  UserCircle,
  Settings,
  Rss,
  Wallet,
  MoreHorizontal,
  LogOut,
  Shield,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppContext } from "@/contexts/AppContext";
import { useGetMe } from "@workspace/api-client-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const ADMIN_USER_IDS = [4];

const NAV_ITEMS = [
  { href: "/", icon: MessageCircle, label: "Чаты" },
  { href: "/calls", icon: Phone, label: "Звонки" },
  { href: "/feed", icon: Rss, label: "Лента" },
  { href: "/contacts", icon: Users, label: "Контакты" },
  { href: "/gifts", icon: Gift, label: "Подарки" },
  { href: "/stories", icon: History, label: "Истории" },
  { href: "/wallet", icon: Wallet, label: "Кошелёк" },
  { href: "/profile", icon: UserCircle, label: "Профиль" },
  { href: "/settings", icon: Settings, label: "Настройки" },
];

function VerifiedBadge() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="shrink-0">
      <circle cx="12" cy="12" r="12" fill="#00BCD4"/>
      <path d="M7 12l3.5 3.5L17 8" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function AdminBadge() {
  return (
    <span className="inline-flex items-center gap-0.5 text-[8px] font-black uppercase tracking-widest px-1 py-0.5 rounded bg-purple-500/25 text-purple-300 border border-purple-500/40 shrink-0">
      ADMIN
    </span>
  );
}

function PremiumBadge() {
  return (
    <span className="inline-flex items-center gap-0.5 text-[8px] font-black uppercase tracking-widest px-1 py-0.5 rounded bg-yellow-500/20 text-yellow-300 border border-yellow-500/40 shrink-0">
      ⭐
    </span>
  );
}

export function Sidebar() {
  const [location] = useLocation();
  const { logout } = useAppContext();
  const { data: me } = useGetMe();

  const initial = me?.displayName?.[0]?.toUpperCase() || "U";
  const isAdmin = ADMIN_USER_IDS.includes(me?.id ?? -1);
  const isPremium = isAdmin;

  return (
    <div className="hidden md:flex w-16 lg:w-64 h-screen bg-card border-r border-border flex-col items-center lg:items-stretch py-4 flex-shrink-0">
      <div className="flex items-center justify-center lg:justify-start lg:px-6 mb-8">
        <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-[0_0_15px_rgba(0,188,212,0.5)] shrink-0">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M13 2L4.5 13.5H11L10 22L19.5 10.5H13L13 2Z" fill="white" />
          </svg>
        </div>
        <span className="hidden lg:block ml-3 font-bold text-xl tracking-tight text-white">Pulse</span>
      </div>

      <nav className="flex-1 w-full flex flex-col gap-1 px-2 lg:px-4 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 p-3 rounded-xl transition-all duration-200 group relative",
                isActive
                  ? "bg-primary/10 text-primary shadow-[inset_4px_0_0_0_hsl(var(--primary))]"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              )}
            >
              <item.icon
                size={22}
                className={cn(
                  "transition-transform group-hover:scale-110 shrink-0",
                  isActive && "drop-shadow-[0_0_6px_hsl(var(--primary))]"
                )}
              />
              <span className="hidden lg:block font-medium truncate">{item.label}</span>
            </Link>
          );
        })}

        {isAdmin && (
          <Link
            href="/admin"
            className={cn(
              "flex items-center gap-3 p-3 rounded-xl transition-all duration-200 group relative mt-2 border border-purple-500/20",
              location.startsWith("/admin")
                ? "bg-purple-500/20 text-purple-300"
                : "text-purple-400/70 hover:bg-purple-500/10 hover:text-purple-300"
            )}
          >
            <Shield
              size={22}
              className="transition-transform group-hover:scale-110 shrink-0"
            />
            <span className="hidden lg:block font-medium truncate">Админ-панель</span>
          </Link>
        )}
      </nav>

      <div className="w-full px-2 lg:px-4 pt-3 mt-auto border-t border-border">
        <div className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-secondary transition-colors">
          <div className="relative shrink-0">
            <div
              className={cn(
                "w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm overflow-hidden",
                isPremium && "ring-2 ring-yellow-400/60 ring-offset-1 ring-offset-card"
              )}
              style={{ backgroundColor: me?.avatarColor || "#3B82F6" }}
            >
              {me?.avatarUrl ? (
                <img src={me.avatarUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                initial
              )}
            </div>
            {isPremium && (
              <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-yellow-400 flex items-center justify-center shadow-sm">
                <Sparkles size={9} className="text-yellow-900" />
              </div>
            )}
          </div>

          <div className="hidden lg:flex flex-1 min-w-0 flex-col">
            <div className="flex items-center gap-1.5 flex-wrap">
              <p className="text-sm font-semibold truncate text-foreground leading-tight">{me?.displayName || "..."}</p>
              {(me as any)?.isVerified && <VerifiedBadge />}
              {isAdmin && <AdminBadge />}
            </div>
            <div className="flex items-center gap-1">
              <p className="text-xs text-muted-foreground truncate">@{me?.username || "..."}</p>
              {isPremium && <PremiumBadge />}
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors shrink-0">
                <MoreHorizontal size={16} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="right" align="end" className="w-52">
              <DropdownMenuItem asChild>
                <Link href="/profile" className="flex items-center w-full cursor-pointer">
                  <UserCircle size={15} className="mr-2 text-primary" />
                  Мой профиль
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/settings" className="flex items-center w-full cursor-pointer">
                  <Settings size={15} className="mr-2 text-muted-foreground" />
                  Настройки
                </Link>
              </DropdownMenuItem>
              {isAdmin && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/admin" className="flex items-center w-full cursor-pointer text-purple-400 focus:text-purple-400">
                      <Shield size={15} className="mr-2" />
                      Администратор
                    </Link>
                  </DropdownMenuItem>
                </>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={logout}
                className="text-destructive focus:text-destructive"
              >
                <LogOut size={15} className="mr-2" />
                Выйти
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}
