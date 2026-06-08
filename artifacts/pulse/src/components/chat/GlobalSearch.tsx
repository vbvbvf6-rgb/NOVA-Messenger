import React, { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, X, MessageSquare, ChevronRight, Hash, Users, Radio,
  UserPlus, Check, Loader2
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAppContext } from "@/contexts/AppContext";
import { formatDistanceToNow } from "date-fns";
import { ru } from "date-fns/locale";
import { getGetChatsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

interface MessageResult {
  id: number;
  chat_id: number;
  sender_id: number;
  text: string;
  created_at: string;
  display_name: string;
  avatar_color: string;
  avatar_url?: string;
  chat_name?: string;
  chat_type: string;
  other_user_name?: string;
}

interface PublicChat {
  id: number;
  name: string;
  type: "group" | "channel";
  avatar_url?: string;
  avatar_color?: string;
  description?: string;
  member_count: number;
  is_member: boolean;
}

interface GlobalSearchProps {
  onClose: () => void;
}

function getAuthHeaders(): Record<string, string> {
  const token = sessionStorage.getItem("pulse-token");
  return token ? { "Authorization": `Bearer ${token}` } : {};
}

function highlight(text: string, q: string) {
  if (!q.trim()) return <>{text}</>;
  const idx = text.toLowerCase().indexOf(q.toLowerCase());
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-primary/25 text-primary rounded px-0.5">{text.slice(idx, idx + q.length)}</mark>
      {text.slice(idx + q.length)}
    </>
  );
}

function chatLabel(r: MessageResult) {
  if (r.chat_type === "direct") return r.other_user_name || r.display_name;
  return r.chat_name || (r.chat_type === "group" ? "Группа" : "Канал");
}

function MemberCount({ count }: { count: number }) {
  if (count >= 1000) return <>{(count / 1000).toFixed(1)}K участников</>;
  return <>{count} участников</>;
}

export function GlobalSearch({ onClose }: GlobalSearchProps) {
  const { t, lang } = useLanguage();
  const { setSelectedChatId } = useAppContext();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<"messages" | "chats">("chats");
  const [query, setQuery] = useState("");
  const [msgResults, setMsgResults] = useState<MessageResult[]>([]);
  const [chatResults, setChatResults] = useState<PublicChat[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [joiningId, setJoiningId] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const searchMessages = useCallback(async (q: string) => {
    if (!q || q.length < 2) { setMsgResults([]); return; }
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/messages/search?q=${encodeURIComponent(q)}&limit=30`, {
        headers: getAuthHeaders(),
      });
      if (res.ok) setMsgResults(await res.json());
      else setMsgResults([]);
    } catch { setError(t("common.error")); }
    setLoading(false);
  }, []);

  const discoverChats = useCallback(async (q: string) => {
    setLoading(true);
    setError("");
    try {
      const url = q.length >= 2
        ? `/api/chats/discover?q=${encodeURIComponent(q)}`
        : `/api/chats/discover`;
      const res = await fetch(url, { headers: getAuthHeaders() });
      if (res.ok) setChatResults(await res.json());
      else setChatResults([]);
    } catch { setError(t("common.error")); }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (tab === "messages") searchMessages(query);
      else discoverChats(query);
    }, 350);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, tab]);

  const handleMsgClick = (r: MessageResult) => {
    setSelectedChatId(r.chat_id);
    onClose();
  };

  const handleJoin = async (chat: PublicChat) => {
    if (chat.is_member) {
      setSelectedChatId(chat.id);
      onClose();
      return;
    }
    setJoiningId(chat.id);
    try {
      const token = sessionStorage.getItem("pulse-token");
      const res = await fetch(`/api/chats/${chat.id}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
      if (res.ok) {
        setChatResults(prev => prev.map(c => c.id === chat.id ? { ...c, is_member: true, member_count: c.member_count + 1 } : c));
        queryClient.invalidateQueries({ queryKey: getGetChatsQueryKey() });
        setTimeout(() => {
          setSelectedChatId(chat.id);
          onClose();
        }, 600);
      }
    } catch {}
    setJoiningId(null);
  };

  const isEmpty = tab === "messages" ? msgResults.length === 0 : chatResults.length === 0;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-50 bg-background/95 backdrop-blur-sm flex flex-col"
    >
      {/* Header */}
      <div className="p-4 border-b border-border shrink-0">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-primary w-4 h-4" />
            <input
              ref={inputRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder={tab === "chats" ? "Поиск групп и каналов..." : t("search.placeholder")}
              className="w-full pl-9 pr-4 py-2.5 bg-secondary rounded-xl border border-border focus:border-primary focus:outline-none text-sm transition-colors"
            />
            {query && (
              <button onClick={() => setQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X size={14} />
              </button>
            )}
          </div>
          <button
            onClick={onClose}
            className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors font-medium"
          >
            {lang === "ru" ? "Закрыть" : "Close"}
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mt-3">
          {[
            { id: "chats" as const, label: "Чаты и каналы", icon: Hash },
            { id: "messages" as const, label: "Сообщения", icon: MessageSquare },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                tab === id
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon size={12} />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto scrollbar-none">
        {loading && (
          <div className="flex items-center justify-center py-12 text-muted-foreground text-sm gap-2">
            <div className="w-4 h-4 border-2 border-primary/40 border-t-primary rounded-full animate-spin" />
            {lang === "ru" ? "Поиск..." : "Searching..."}
          </div>
        )}

        {!loading && error && (
          <div className="px-4 py-4 text-sm text-destructive">{error}</div>
        )}

        {/* — CHATS TAB — */}
        {!loading && tab === "chats" && (
          <>
            {chatResults.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
                <Hash size={40} className="text-muted-foreground/20" />
                <p className="text-sm font-medium">
                  {query.length >= 2 ? "Ничего не найдено" : "Публичные чаты и каналы"}
                </p>
                <p className="text-xs text-muted-foreground/60">
                  {query.length >= 2 ? `По запросу «${query}»` : "Введите название для поиска"}
                </p>
              </div>
            )}
            {chatResults.length > 0 && (
              <div className="py-2">
                {!query && (
                  <div className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Популярные сообщества
                  </div>
                )}
                {chatResults.map(chat => {
                  const Icon = chat.type === "channel" ? Radio : Users;
                  const isJoining = joiningId === chat.id;
                  return (
                    <div
                      key={chat.id}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-secondary/60 transition-colors"
                    >
                      {/* Avatar */}
                      <div
                        className="w-12 h-12 rounded-[16px] flex items-center justify-center shrink-0 overflow-hidden"
                        style={{ backgroundColor: chat.avatar_color || "#3B82F6" }}
                      >
                        {chat.avatar_url ? (
                          <img src={chat.avatar_url} alt={chat.name} className="w-full h-full object-cover" />
                        ) : (
                          <Icon size={22} className="text-white opacity-90" />
                        )}
                      </div>

                      {/* Info */}
                      <button
                        className="flex-1 min-w-0 text-left"
                        onClick={() => { if (chat.is_member) { setSelectedChatId(chat.id); onClose(); } }}
                      >
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-foreground text-sm truncate">
                            {highlight(chat.name, query)}
                          </span>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${
                            chat.type === "channel"
                              ? "bg-primary/10 text-primary"
                              : "bg-blue-500/10 text-blue-500"
                          }`}>
                            {chat.type === "channel" ? "Канал" : "Группа"}
                          </span>
                        </div>
                        {chat.description && (
                          <p className="text-xs text-muted-foreground truncate mt-0.5">{chat.description}</p>
                        )}
                        <p className="text-xs text-muted-foreground/60 mt-0.5">
                          <MemberCount count={chat.member_count} />
                        </p>
                      </button>

                      {/* Join button */}
                      <button
                        onClick={() => handleJoin(chat)}
                        disabled={isJoining}
                        className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                          chat.is_member
                            ? "bg-primary/10 text-primary hover:bg-primary/15"
                            : "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
                        }`}
                      >
                        {isJoining ? (
                          <Loader2 size={13} className="animate-spin" />
                        ) : chat.is_member ? (
                          <><Check size={13} /> Открыть</>
                        ) : (
                          <><UserPlus size={13} /> Вступить</>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* — MESSAGES TAB — */}
        {!loading && tab === "messages" && (
          <>
            {!query.trim() && (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
                <MessageSquare size={40} className="text-muted-foreground/20" />
                <p className="text-sm font-medium">{t("search.globalTitle")}</p>
                <p className="text-xs text-muted-foreground/60">
                  {lang === "ru" ? "Введите от 2 символов" : "Type at least 2 characters"}
                </p>
              </div>
            )}
            {query.trim().length >= 2 && isEmpty && (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
                <MessageSquare size={40} className="text-muted-foreground/30" />
                <p className="text-sm">{t("search.noResults")}</p>
                <p className="text-xs text-muted-foreground/60">«{query}»</p>
              </div>
            )}
            {msgResults.length > 0 && (
              <div className="py-2">
                <div className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {lang === "ru" ? `Найдено: ${msgResults.length}` : `Found: ${msgResults.length}`}
                </div>
                {msgResults.map(r => (
                  <button
                    key={r.id}
                    onClick={() => handleMsgClick(r)}
                    className="w-full flex items-start gap-3 px-4 py-3 hover:bg-secondary transition-colors text-left group"
                  >
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0 overflow-hidden mt-0.5"
                      style={{ backgroundColor: r.avatar_color || "#3B82F6" }}
                    >
                      {r.avatar_url ? (
                        <img src={r.avatar_url} alt={r.display_name} className="w-full h-full object-cover" />
                      ) : (
                        r.display_name?.[0]?.toUpperCase() || "?"
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-0.5">
                        <span className="text-sm font-semibold truncate">{r.display_name}</span>
                        <span className="text-[10px] text-muted-foreground shrink-0">
                          {formatDistanceToNow(new Date(r.created_at), { addSuffix: true, locale: lang === "ru" ? ru : undefined })}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground truncate leading-snug">
                        {highlight(r.text || "", query)}
                      </p>
                      <div className="flex items-center gap-1 mt-0.5">
                        <span className="text-[10px] text-muted-foreground/60">
                          {t("search.inChat")} <span className="text-primary/70">{chatLabel(r)}</span>
                        </span>
                      </div>
                    </div>
                    <ChevronRight size={14} className="text-muted-foreground shrink-0 mt-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </motion.div>
  );
}
