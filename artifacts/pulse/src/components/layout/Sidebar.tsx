import React, { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
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
  Crown,
  X,
  Menu,
  UserPlus,
  Check,
  ChevronRight,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppContext } from "@/contexts/AppContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useGetMe, useGetChats } from "@workspace/api-client-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { SavedAccount } from "@/lib/accounts";

const ADMIN_USER_IDS = [4];

function VerifiedBadge() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" className="shrink-0">
      <circle cx="12" cy="12" r="12" fill="#00BCD4"/>
      <path d="M7 12l3.5 3.5L17 8" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function AccountRow({
  account,
  isActive,
  onSwitch,
  onRemove,
}: {
  account: SavedAccount;
  isActive: boolean;
  onSwitch: () => void;
  onRemove: () => void;
}) {
  const initial = account.displayName[0]?.toUpperCase() || "?";
  return (
    <div
      className={cn(
        "flex items-center gap-2.5 px-2 py-1.5 rounded-lg transition-colors group",
        isActive ? "bg-primary/10" : "hover:bg-secondary cursor-pointer"
      )}
      onClick={!isActive ? onSwitch : undefined}
    >
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs shrink-0 overflow-hidden"
        style={{ backgroundColor: account.avatarColor }}
      >
        {account.avatarUrl ? (
          <img src={account.avatarUrl} alt="" className="w-full h-full object-cover" />
        ) : initial}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground truncate leading-tight">{account.displayName}</p>
        <p className="text-xs text-muted-foreground truncate">@{account.username}</p>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        {isActive && <Check size={14} className="text-primary" />}
        {!isActive && (
          <button
            onClick={(e) => { e.stopPropagation(); onRemove(); }}
            className="p-1 rounded opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all"
            title="Удалить аккаунт"
          >
            <Trash2 size={13} />
          </button>
        )}
      </div>
    </div>
  );
}

interface SidebarProps {
  mobileSidebarOpen: boolean;
  onMobileClose: () => void;
  onMobileOpen: () => void;
}

export function Sidebar({ mobileSidebarOpen, onMobileClose, onMobileOpen }: SidebarProps) {
  const [location, navigate] = useLocation();
  const { logout, currentUserId, savedAccounts, switchAccount, removeAccount, openAddAccount, canAddAccount } = useAppContext();
  const { t } = useLanguage();
  const { data: me } = useGetMe();
  const { data: chats } = useGetChats();
  const [isAdmin, setIsAdmin] = useState(ADMIN_USER_IDS.includes(me?.id ?? -1));

  useEffect(() => {
    const uid = localStorage.getItem("pulse-user-id");
    if (!uid) return;
    fetch("/api/admin/check", { headers: { "x-user-id": uid } })
      .then(r => r.json())
      .then(d => { if (d.isAdmin) setIsAdmin(true); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (me?.id && ADMIN_USER_IDS.includes(me.id)) setIsAdmin(true);
  }, [me?.id]);

  const totalUnread = chats?.reduce((sum: number, c: any) => sum + (c.unreadCount || 0), 0) ?? 0;
  const initial = me?.displayName?.[0]?.toUpperCase() || "U";
  const isPremium = (me as any)?.hasPrime ?? false;

  const NAV_ITEMS = [
    { href: "/",         icon: MessageCircle, label: t("nav.chats") },
    { href: "/calls",    icon: Phone,         label: t("nav.calls") },
    { href: "/feed",     icon: Rss,           label: t("nav.feed") },
    { href: "/contacts", icon: Users,         label: t("nav.contacts") },
    { href: "/gifts",    icon: Gift,          label: t("nav.gifts") },
    { href: "/stories",  icon: History,       label: t("nav.stories") },
    { href: "/wallet",   icon: Wallet,        label: t("nav.wallet") },
    { href: "/profile",  icon: UserCircle,    label: t("nav.profile") },
    { href: "/settings", icon: Settings,      label: t("nav.settings") },
  ];

  const AccountsSection = (
    <>
      {savedAccounts.length > 0 && (
        <div className="px-1 pb-1">
          {savedAccounts.map(acc => (
            <AccountRow
              key={acc.userId}
              account={acc}
              isActive={acc.userId === currentUserId}
              onSwitch={() => switchAccount(acc.userId)}
              onRemove={() => removeAccount(acc.userId)}
            />
          ))}
        </div>
      )}
      {canAddAccount && (
        <DropdownMenuItem
          onClick={openAddAccount}
          className="flex items-center gap-2 text-primary focus:text-primary cursor-pointer"
        >
          <UserPlus size={15} />
          Добавить аккаунт
          {savedAccounts.length > 0 && (
            <span className="ml-auto text-xs text-muted-foreground">{savedAccounts.length}/3</span>
          )}
        </DropdownMenuItem>
      )}
      <DropdownMenuSeparator />
    </>
  );

  const openSupportChat = async () => {
    const uid = localStorage.getItem("pulse-user-id");
    if (!uid) return;
    try {
      const chatRes = await fetch("/api/chats/direct", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-user-id": uid },
        body: JSON.stringify({ userId: 1 }),
      });
      if (chatRes.ok) {
        const chat = await chatRes.json();
        navigate("/");
        onMobileClose();
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent("open-chat", { detail: chat.id }));
        }, 100);
      }
    } catch {}
  };

  // ── Desktop icon-only sidebar ──────────────────────────────────────────
  const DesktopSidebar = (
    <TooltipProvider delayDuration={300}>
      <div className="hidden md:flex flex-col h-screen w-[68px] bg-card border-r border-border py-3 shrink-0 items-center">

        {/* Logo */}
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-[0_0_15px_rgba(0,188,212,0.4)] mb-4 shrink-0 cursor-default">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path d="M13 2L4.5 13.5H11L10 22L19.5 10.5H13L13 2Z" fill="white" />
              </svg>
            </div>
          </TooltipTrigger>
          <TooltipContent side="right"><p className="font-bold">Pulse</p></TooltipContent>
        </Tooltip>

        {/* Nav items */}
        <nav className="flex-1 flex flex-col items-center gap-1 w-full px-2 overflow-y-auto scrollbar-none">
          {NAV_ITEMS.map((item) => {
            const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
            const showBadge = item.href === "/" && totalUnread > 0;
            return (
              <Tooltip key={item.href}>
                <TooltipTrigger asChild>
                  <Link
                    href={item.href}
                    className={cn(
                      "relative w-full flex items-center justify-center p-2.5 rounded-xl transition-all duration-200 group",
                      isActive
                        ? "bg-primary/15 text-primary shadow-[inset_3px_0_0_0_hsl(var(--primary))]"
                        : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                    )}
                  >
                    <div className="relative">
                      <item.icon
                        size={22}
                        className={cn(
                          "transition-transform group-hover:scale-110",
                          isActive && "drop-shadow-[0_0_6px_hsl(var(--primary))]"
                        )}
                      />
                      {showBadge && (
                        <div className="absolute -top-1.5 -right-1.5 bg-primary text-white text-[9px] font-bold px-1 py-px rounded-full min-w-[16px] text-center leading-tight">
                          {totalUnread > 99 ? "99+" : totalUnread}
                        </div>
                      )}
                    </div>
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right"><p>{item.label}</p></TooltipContent>
              </Tooltip>
            );
          })}

          {/* Prime */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Link
                href="/prime"
                className={cn(
                  "w-full flex items-center justify-center p-2.5 rounded-xl transition-all duration-200 group border border-yellow-500/20",
                  location.startsWith("/prime")
                    ? "bg-yellow-500/20 text-yellow-300"
                    : "text-yellow-400/70 hover:bg-yellow-500/10 hover:text-yellow-300"
                )}
              >
                <Crown size={22} className="transition-transform group-hover:scale-110" />
              </Link>
            </TooltipTrigger>
            <TooltipContent side="right"><p>{t("nav.prime")}</p></TooltipContent>
          </Tooltip>

          {/* Admin */}
          {isAdmin && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Link
                  href="/admin"
                  className={cn(
                    "w-full flex items-center justify-center p-2.5 rounded-xl transition-all duration-200 group border border-purple-500/20",
                    location.startsWith("/admin")
                      ? "bg-purple-500/20 text-purple-300"
                      : "text-purple-400/70 hover:bg-purple-500/10 hover:text-purple-300"
                  )}
                >
                  <Shield size={22} className="transition-transform group-hover:scale-110" />
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right"><p>{t("nav.admin")}</p></TooltipContent>
            </Tooltip>
          )}
        </nav>

        {/* User avatar + accounts dropdown at bottom */}
        <div className="w-full px-2 pt-2 mt-auto border-t border-border flex flex-col items-center">
          <DropdownMenu>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <button className="relative w-10 h-10 rounded-full overflow-hidden ring-2 ring-transparent hover:ring-primary/40 transition-all focus:outline-none mt-2">
                    {me?.avatarUrl ? (
                      <img src={me.avatarUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div
                        className={cn(
                          "w-full h-full flex items-center justify-center text-white font-bold text-sm",
                          isPremium && "ring-2 ring-yellow-400/60"
                        )}
                        style={{ backgroundColor: me?.avatarColor || "#3B82F6" }}
                      >
                        {initial}
                      </div>
                    )}
                    {isPremium && (
                      <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-yellow-400 flex items-center justify-center shadow-sm">
                        <Sparkles size={9} className="text-yellow-900" />
                      </div>
                    )}
                    {savedAccounts.length > 1 && (
                      <div className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-primary text-white text-[9px] font-bold flex items-center justify-center shadow-sm">
                        {savedAccounts.length}
                      </div>
                    )}
                  </button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p className="font-semibold">{me?.displayName}</p>
                <p className="text-xs text-muted-foreground">@{me?.username}</p>
                {savedAccounts.length > 1 && (
                  <p className="text-xs text-primary mt-0.5">{savedAccounts.length} аккаунта</p>
                )}
              </TooltipContent>
            </Tooltip>
            <DropdownMenuContent side="right" align="end" className="w-64">
              {AccountsSection}
              <DropdownMenuItem asChild>
                <Link href="/profile" className="flex items-center w-full cursor-pointer">
                  <UserCircle size={15} className="mr-2 text-primary" />
                  {t("menu.myProfile")}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/settings" className="flex items-center w-full cursor-pointer">
                  <Settings size={15} className="mr-2 text-muted-foreground" />
                  {t("menu.settings")}
                </Link>
              </DropdownMenuItem>
              {isAdmin && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/admin" className="flex items-center w-full cursor-pointer text-purple-400 focus:text-purple-400">
                      <Shield size={15} className="mr-2" />
                      {t("menu.administrator")}
                    </Link>
                  </DropdownMenuItem>
                </>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={logout} className="text-destructive focus:text-destructive">
                <LogOut size={15} className="mr-2" />
                {t("menu.logout")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </TooltipProvider>
  );

  // ── Mobile full sidebar (drawer) ──────────────────────────────────────
  const MobileSidebarContent = (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 mb-6 pt-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-[0_0_15px_rgba(0,188,212,0.5)] shrink-0">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M13 2L4.5 13.5H11L10 22L19.5 10.5H13L13 2Z" fill="white" />
            </svg>
          </div>
          <span className="font-bold text-xl tracking-tight text-white">Pulse</span>
        </div>
        <button
          onClick={onMobileClose}
          className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
        >
          <X size={18} />
        </button>
      </div>

      <nav className="flex-1 w-full flex flex-col gap-1 px-2 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
          const showBadge = item.href === "/" && totalUnread > 0;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onMobileClose}
              className={cn(
                "flex items-center gap-3 p-3 rounded-xl transition-all duration-200 group relative",
                isActive
                  ? "bg-primary/10 text-primary shadow-[inset_4px_0_0_0_hsl(var(--primary))]"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              )}
            >
              <div className="relative shrink-0">
                <item.icon
                  size={22}
                  className={cn(
                    "transition-transform group-hover:scale-110",
                    isActive && "drop-shadow-[0_0_6px_hsl(var(--primary))]"
                  )}
                />
                {showBadge && (
                  <div className="absolute -top-1.5 -right-1.5 bg-primary text-white text-[9px] font-bold px-1 py-px rounded-full min-w-[16px] text-center leading-tight">
                    {totalUnread > 99 ? "99+" : totalUnread}
                  </div>
                )}
              </div>
              <span className="font-medium truncate">{item.label}</span>
            </Link>
          );
        })}

        <Link
          href="/prime"
          onClick={onMobileClose}
          className={cn(
            "flex items-center gap-3 p-3 rounded-xl transition-all duration-200 group relative border border-yellow-500/20",
            location.startsWith("/prime")
              ? "bg-yellow-500/20 text-yellow-300"
              : "text-yellow-400/70 hover:bg-yellow-500/10 hover:text-yellow-300"
          )}
        >
          <Crown size={22} className="transition-transform group-hover:scale-110 shrink-0" />
          <span className="font-medium truncate">{t("nav.prime")}</span>
        </Link>

        {isAdmin && (
          <Link
            href="/admin"
            onClick={onMobileClose}
            className={cn(
              "flex items-center gap-3 p-3 rounded-xl transition-all duration-200 group relative border border-purple-500/20",
              location.startsWith("/admin")
                ? "bg-purple-500/20 text-purple-300"
                : "text-purple-400/70 hover:bg-purple-500/10 hover:text-purple-300"
            )}
          >
            <Shield size={22} className="transition-transform group-hover:scale-110 shrink-0" />
            <span className="font-medium truncate">{t("nav.admin")}</span>
          </Link>
        )}
      </nav>

      <div className="w-full px-2 pt-3 mt-auto border-t border-border">
        {/* Accounts list on mobile */}
        {savedAccounts.length > 0 && (
          <div className="mb-2 space-y-0.5">
            {savedAccounts.map(acc => (
              <AccountRow
                key={acc.userId}
                account={acc}
                isActive={acc.userId === currentUserId}
                onSwitch={() => { switchAccount(acc.userId); onMobileClose(); }}
                onRemove={() => removeAccount(acc.userId)}
              />
            ))}
          </div>
        )}

        {canAddAccount && (
          <button
            onClick={() => { openAddAccount(); onMobileClose(); }}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-primary hover:bg-primary/10 transition-colors text-sm font-medium mb-2"
          >
            <UserPlus size={16} />
            Добавить аккаунт
            <span className="ml-auto text-xs text-muted-foreground">{savedAccounts.length}/3</span>
          </button>
        )}

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
              ) : initial}
            </div>
            {isPremium && (
              <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-yellow-400 flex items-center justify-center shadow-sm">
                <Sparkles size={9} className="text-yellow-900" />
              </div>
            )}
          </div>

          <div className="flex flex-1 min-w-0 flex-col">
            <div className="flex items-center gap-1.5 flex-wrap">
              <p className="text-sm font-semibold truncate text-foreground leading-tight">{me?.displayName || "..."}</p>
              {(me as any)?.isVerified && <VerifiedBadge />}
            </div>
            <p className="text-xs text-muted-foreground truncate">@{me?.username || "..."}</p>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors shrink-0">
                <MoreHorizontal size={16} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="right" align="end" className="w-52">
              <DropdownMenuItem asChild>
                <Link href="/profile" onClick={onMobileClose} className="flex items-center w-full cursor-pointer">
                  <UserCircle size={15} className="mr-2 text-primary" />
                  {t("menu.myProfile")}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/settings" onClick={onMobileClose} className="flex items-center w-full cursor-pointer">
                  <Settings size={15} className="mr-2 text-muted-foreground" />
                  {t("menu.settings")}
                </Link>
              </DropdownMenuItem>
              {isAdmin && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/admin" onClick={onMobileClose} className="flex items-center w-full cursor-pointer text-purple-400 focus:text-purple-400">
                      <Shield size={15} className="mr-2" />
                      {t("menu.administrator")}
                    </Link>
                  </DropdownMenuItem>
                </>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={logout} className="text-destructive focus:text-destructive">
                <LogOut size={15} className="mr-2" />
                {t("menu.logout")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile hamburger */}
      <button
        onClick={onMobileOpen}
        className={cn(
          "md:hidden fixed top-3 left-3 z-40 w-10 h-10 rounded-xl bg-card border border-border flex items-center justify-center text-muted-foreground hover:text-foreground shadow-lg transition-all",
          mobileSidebarOpen && "opacity-0 pointer-events-none"
        )}
      >
        <Menu size={20} />
      </button>

      {/* Desktop icon-only sidebar */}
      {DesktopSidebar}

      {/* Mobile drawer */}
      <div className={cn(
        "md:hidden fixed top-0 left-0 h-full w-72 bg-card border-r border-border flex flex-col py-4 z-40 transition-transform duration-300 shadow-2xl",
        mobileSidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        {MobileSidebarContent}
      </div>
    </>
  );
}
