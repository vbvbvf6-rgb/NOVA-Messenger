import React, { useState, useEffect, useRef, useCallback } from "react";
import { X, Camera, UserPlus, Trash2, Search, Users, Radio } from "lucide-react";
import { motion } from "framer-motion";
import { useQueryClient } from "@tanstack/react-query";
import { getGetChatsQueryKey } from "@workspace/api-client-react";

function compressAvatar(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const size = 256;
      const canvas = document.createElement("canvas");
      canvas.width = size; canvas.height = size;
      const ctx = canvas.getContext("2d");
      if (!ctx) { reject(new Error("no ctx")); return; }
      const s = Math.min(img.width, img.height);
      const sx = (img.width - s) / 2;
      const sy = (img.height - s) / 2;
      ctx.drawImage(img, sx, sy, s, s, 0, 0, size, size);
      resolve(canvas.toDataURL("image/jpeg", 0.85));
    };
    img.onerror = reject;
    img.src = url;
  });
}

interface Member {
  userId: number;
  role: string;
  user: {
    id: number;
    username: string;
    displayName: string;
    avatarColor: string;
    avatarUrl?: string | null;
  };
}

interface UserResult {
  id: number;
  username: string;
  displayName: string;
  avatarColor?: string;
  avatarUrl?: string | null;
}

interface ChatInfoPanelProps {
  chatId: number;
  chatType?: "group" | "channel";
  displayName?: string;
  avatarUrl?: string | null;
  avatarColor?: string;
  onClose: () => void;
  onNameChanged?: (name: string) => void;
  onDeleteChat?: () => void;
  onSetAutoDelete?: () => void;
  autoDeleteTimer?: number | null;
  onTogglePin?: () => void;
  isPinned?: boolean;
  onToggleMute?: () => void;
  isMuted?: boolean;
}

function getAuthHeaders(json?: boolean): Record<string, string> {
  const token = sessionStorage.getItem("pulse-token");
  const base: Record<string, string> = token ? { "Authorization": `Bearer ${token}` } : {};
  return json ? { "Content-Type": "application/json", ...base } : base;
}

export function ChatInfoPanel({ chatId, chatType, displayName, avatarUrl, avatarColor, onClose }: ChatInfoPanelProps) {
  const queryClient = useQueryClient();
  const [members, setMembers] = useState<Member[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [editName, setEditName] = useState(displayName);
  const [saving, setSaving] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(avatarUrl || null);
  const [addSearch, setAddSearch] = useState("");
  const [searchResults, setSearchResults] = useState<UserResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchMembers = useCallback(async () => {
    setLoadingMembers(true);
    try {
      const res = await fetch(`/api/chats/${chatId}/members`, { headers: getAuthHeaders() });
      if (res.ok) setMembers(await res.json());
    } catch {}
    setLoadingMembers(false);
  }, [chatId]);

  useEffect(() => { fetchMembers(); }, [fetchMembers]);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressAvatar(file);
      setAvatarPreview(compressed);
      await fetch(`/api/chats/${chatId}`, {
        method: "PUT",
        headers: getAuthHeaders(true),
        body: JSON.stringify({ avatarUrl: compressed }),
      });
      queryClient.invalidateQueries({ queryKey: getGetChatsQueryKey() });
      queryClient.invalidateQueries({ queryKey: [`/api/chats/${chatId}`] });
    } catch {}
    e.target.value = "";
  };

  const handleSaveName = async () => {
    const trimmed = (editName || "").trim();
    if (!trimmed || trimmed === displayName) return;
    setSaving(true);
    await fetch(`/api/chats/${chatId}`, {
      method: "PUT",
      headers: getAuthHeaders(true),
      body: JSON.stringify({ name: trimmed }),
    });
    queryClient.invalidateQueries({ queryKey: getGetChatsQueryKey() });
    queryClient.invalidateQueries({ queryKey: [`/api/chats/${chatId}`] });
    setSaving(false);
  };

  const searchUsers = async (q: string) => {
    if (!q.trim()) { setSearchResults([]); return; }
    setSearching(true);
    try {
      const res = await fetch(`/api/users/search?q=${encodeURIComponent(q)}&limit=20`, { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        const memberIds = new Set(members.map(m => m.userId));
        setSearchResults((data.users || data || []).filter((u: UserResult) => !memberIds.has(u.id)));
      }
    } catch {}
    setSearching(false);
  };

  const onAddSearchChange = (val: string) => {
    setAddSearch(val);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => searchUsers(val), 300);
  };

  const handleAddMember = async (user: UserResult) => {
    await fetch(`/api/chats/${chatId}/members`, {
      method: "POST",
      headers: getAuthHeaders(true),
      body: JSON.stringify({ userId: user.id, role: "member" }),
    });
    await fetchMembers();
    setSearchResults(prev => prev.filter(u => u.id !== user.id));
    queryClient.invalidateQueries({ queryKey: getGetChatsQueryKey() });
  };

  const handleRemoveMember = async (userId: number) => {
    await fetch(`/api/chats/${chatId}/members/${userId}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });
    setMembers(prev => prev.filter(m => m.userId !== userId));
    queryClient.invalidateQueries({ queryKey: getGetChatsQueryKey() });
  };

  return (
    <motion.div
      initial={{ x: "100%" }}
      animate={{ x: 0 }}
      exit={{ x: "100%" }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="absolute top-0 right-0 h-full w-full sm:w-80 bg-card border-l border-border flex flex-col z-20 shadow-xl"
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
        <div className="flex items-center gap-2">
          {chatType === "channel"
            ? <Radio size={15} className="text-primary" />
            : <Users size={15} className="text-primary" />}
          <h3 className="font-semibold text-sm">
            {chatType === "channel" ? "Настройки канала" : "Настройки группы"}
          </h3>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
        >
          <X size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {/* Avatar */}
        <div className="flex flex-col items-center py-6 border-b border-border">
          <div
            className="relative group cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
          >
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center text-white font-bold text-2xl overflow-hidden ring-2 ring-border group-hover:ring-primary/50 transition-all"
              style={{ backgroundColor: avatarColor }}
            >
              {avatarPreview ? (
                <img src={avatarPreview} alt="" className="w-full h-full object-cover" />
              ) : chatType === "channel" ? (
                <Radio size={28} />
              ) : (
                (displayName || "G")[0]?.toUpperCase() || "G"
              )}
            </div>
            <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <Camera size={22} className="text-white" />
            </div>
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
          <p className="text-xs text-muted-foreground mt-2">Нажмите для смены фото</p>
        </div>

        {/* Name */}
        <div className="px-4 py-4 border-b border-border">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">
            {chatType === "channel" ? "Название канала" : "Название группы"}
          </p>
          <div className="flex gap-2">
            <input
              value={editName}
              onChange={e => setEditName(e.target.value)}
              onBlur={handleSaveName}
              onKeyDown={e => e.key === "Enter" && handleSaveName()}
              className="flex-1 bg-background border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary transition-colors"
            />
            {saving && <span className="text-xs text-muted-foreground self-center">Сохранение...</span>}
          </div>
        </div>

        {/* Members */}
        <div className="px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Участники{members.length > 0 ? ` · ${members.length}` : ""}
            </p>
            <button
              onClick={() => { setShowAdd(p => !p); setAddSearch(""); setSearchResults([]); }}
              className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 font-medium transition-colors"
            >
              <UserPlus size={13} />
              Добавить
            </button>
          </div>

          {showAdd && (
            <div className="mb-3 space-y-2">
              <div className="relative">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  autoFocus
                  value={addSearch}
                  onChange={e => onAddSearchChange(e.target.value)}
                  placeholder="Поиск пользователей..."
                  className="w-full bg-background border border-border rounded-xl pl-8 pr-3 py-2 text-sm focus:outline-none focus:border-primary transition-colors"
                />
              </div>
              {searching && <p className="text-xs text-muted-foreground text-center py-1">Поиск...</p>}
              {searchResults.length > 0 && (
                <div className="space-y-0.5 max-h-48 overflow-y-auto scrollbar-thin">
                  {searchResults.slice(0, 8).map(u => (
                    <button
                      key={u.id}
                      onClick={() => handleAddMember(u)}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-secondary transition-colors text-left"
                    >
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs shrink-0 overflow-hidden"
                        style={{ backgroundColor: u.avatarColor || "#3B82F6" }}
                      >
                        {u.avatarUrl
                          ? <img src={u.avatarUrl} alt="" className="w-full h-full object-cover" />
                          : u.displayName[0]?.toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{u.displayName}</p>
                        <p className="text-xs text-muted-foreground">@{u.username}</p>
                      </div>
                      <UserPlus size={14} className="text-primary shrink-0" />
                    </button>
                  ))}
                </div>
              )}
              {addSearch.trim() && !searching && searchResults.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-1">Пользователи не найдены</p>
              )}
            </div>
          )}

          {loadingMembers ? (
            <div className="py-6 text-center text-xs text-muted-foreground">Загрузка...</div>
          ) : (
            <div className="space-y-0.5">
              {members.map(m => (
                <div
                  key={m.userId}
                  className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-secondary/50 transition-colors group"
                >
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-xs shrink-0 overflow-hidden"
                    style={{ backgroundColor: m.user.avatarColor || "#3B82F6" }}
                  >
                    {m.user.avatarUrl
                      ? <img src={m.user.avatarUrl} alt="" className="w-full h-full object-cover" />
                      : m.user.displayName[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{m.user.displayName}</p>
                    <p className="text-xs text-muted-foreground truncate">@{m.user.username}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {m.role === "owner" && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-yellow-500/15 text-yellow-400">Владелец</span>
                    )}
                    {m.role === "admin" && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-primary/15 text-primary">Админ</span>
                    )}
                    {m.role !== "owner" && (
                      <button
                        onClick={() => handleRemoveMember(m.userId)}
                        className="p-1 rounded-lg opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
