import React, { useState, useEffect } from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Settings as SettingsIcon, Bell, Moon, Lock, Shield, Smartphone, Save, Sun, Palette, Database, Edit3, CheckCircle, LogOut, Link, Key, Eye, EyeOff } from "lucide-react";
import { useGetMe, useUpdateMe } from "@workspace/api-client-react";
import { useAppContext } from "@/contexts/AppContext";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const AVATAR_COLORS = [
  "#3B82F6","#EC4899","#10B981","#F59E0B","#8B5CF6",
  "#06B6D4","#EF4444","#F97316","#14B8A6","#84CC16",
  "#6366F1","#A855F7","#E11D48","#059669","#D97706",
];

const STATUS_PRESETS = [
  { emoji: "💬", text: "Доступен" },
  { emoji: "🔕", text: "Не беспокоить" },
  { emoji: "📍", text: "В офисе" },
  { emoji: "🏠", text: "Дома" },
  { emoji: "🚗", text: "В дороге" },
  { emoji: "😴", text: "Сплю" },
  { emoji: "🎮", text: "Играю" },
  { emoji: "🎧", text: "Слушаю музыку" },
];

export default function Settings() {
  const { isDark, toggleTheme, logout } = useAppContext();
  const { data: user } = useGetMe();
  const updateMe = useUpdateMe();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [statusText, setStatusText] = useState("");
  const [avatarColor, setAvatarColor] = useState("#3B82F6");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [hasChanges, setHasChanges] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);

  const [reduceAnimations, setReduceAnimations] = useState(() => {
    return localStorage.getItem("pulse-reduce-animations") === "true";
  });
  const [notifyMessages, setNotifyMessages] = useState(() => {
    return localStorage.getItem("pulse-notify-messages") !== "false";
  });
  const [notifySounds, setNotifySounds] = useState(() => {
    return localStorage.getItem("pulse-notify-sounds") !== "false";
  });

  const [showChangePassword, setShowChangePassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName || "");
      setBio(user.bio || "");
      setStatusText((user as any).statusText || "");
      setAvatarColor(user.avatarColor || "#3B82F6");
      setAvatarUrl(user.avatarUrl || "");
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const changed =
      displayName !== (user.displayName || "") ||
      bio !== (user.bio || "") ||
      statusText !== ((user as any).statusText || "") ||
      avatarColor !== (user.avatarColor || "#3B82F6") ||
      avatarUrl !== (user.avatarUrl || "");
    setHasChanges(changed);
  }, [displayName, bio, statusText, avatarColor, avatarUrl, user]);

  const handleSave = () => {
    updateMe.mutate(
      { data: { displayName, bio, avatarColor, statusText, avatarUrl: avatarUrl || undefined } as any },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["/api/users/me"] });
          setHasChanges(false);
          setSaved(true);
          setTimeout(() => setSaved(false), 2000);
          toast({ title: "Сохранено", description: "Изменения сохранены." });
        },
        onError: () => {
          toast({ title: "Ошибка", description: "Не удалось сохранить изменения.", variant: "destructive" });
        },
      }
    );
  };

  const handleReduceAnimations = (val: boolean) => {
    setReduceAnimations(val);
    localStorage.setItem("pulse-reduce-animations", String(val));
  };

  const handleNotifyMessages = (val: boolean) => {
    setNotifyMessages(val);
    localStorage.setItem("pulse-notify-messages", String(val));
  };

  const handleNotifySounds = (val: boolean) => {
    setNotifySounds(val);
    localStorage.setItem("pulse-notify-sounds", String(val));
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword) {
      toast({ title: "Ошибка", description: "Заполните все поля пароля.", variant: "destructive" });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: "Ошибка", description: "Новые пароли не совпадают.", variant: "destructive" });
      return;
    }
    if (newPassword.length < 6) {
      toast({ title: "Ошибка", description: "Пароль должен быть не менее 6 символов.", variant: "destructive" });
      return;
    }
    setPwLoading(true);
    try {
      const uid = localStorage.getItem("pulse-user-id");
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(uid ? { "x-user-id": uid } : {}) },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: "Ошибка", description: data.error || "Ошибка смены пароля.", variant: "destructive" });
      } else {
        toast({ title: "Готово", description: "Пароль успешно изменён." });
        setShowChangePassword(false);
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      }
    } catch {
      toast({ title: "Ошибка", description: "Ошибка соединения.", variant: "destructive" });
    }
    setPwLoading(false);
  };

  const avatarPreview = avatarUrl || null;

  return (
    <div className="flex-1 flex flex-col h-full bg-background overflow-hidden relative">
      <header className="h-16 border-b border-border flex items-center px-6 justify-between bg-card/80 backdrop-blur-md z-10 shrink-0">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <SettingsIcon className="text-primary" size={22} /> Настройки
        </h1>
        {hasChanges && (
          <button
            onClick={handleSave}
            disabled={updateMe.isPending}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {saved ? <CheckCircle size={16} /> : <Save size={16} />}
            {saved ? "Сохранено!" : "Сохранить"}
          </button>
        )}
      </header>

      <div className="flex-1 overflow-y-auto p-4 md:p-6 max-w-2xl w-full mx-auto scrollbar-thin space-y-6">
        <section>
          <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-3 px-2 flex items-center gap-2">
            <Edit3 size={14} /> Мой профиль
          </h2>
          <div className="bg-card border border-border rounded-2xl overflow-hidden divide-y divide-border">
            <div className="p-4">
              <div className="flex items-center gap-4 mb-4">
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-2xl shrink-0 shadow-lg overflow-hidden"
                  style={{ backgroundColor: avatarColor }}
                >
                  {avatarPreview ? (
                    <img src={avatarPreview} alt="" className="w-full h-full object-cover" onError={() => setAvatarUrl("")} />
                  ) : (
                    displayName[0]?.toUpperCase() || "?"
                  )}
                </div>
                <div>
                  <p className="font-semibold">{displayName || "Ваше имя"}</p>
                  {statusText && <p className="text-sm text-muted-foreground">{statusText}</p>}
                </div>
              </div>

              <div className="mb-4">
                <Label className="text-xs text-muted-foreground mb-2 block flex items-center gap-1.5">
                  <Link size={12} /> URL аватара (необязательно)
                </Label>
                <Input
                  value={avatarUrl}
                  onChange={e => setAvatarUrl(e.target.value)}
                  placeholder="https://example.com/photo.jpg"
                  className="bg-background text-sm"
                />
                {avatarUrl && (
                  <p className="text-xs text-muted-foreground mt-1">Если URL рабочий, фото отобразится в аватаре</p>
                )}
              </div>

              <div>
                <Label className="text-xs text-muted-foreground mb-2 block">Цвет аватара</Label>
                <div className="flex flex-wrap gap-2">
                  {AVATAR_COLORS.map((color) => (
                    <button
                      key={color}
                      onClick={() => setAvatarColor(color)}
                      className={`w-8 h-8 rounded-full transition-transform hover:scale-110 ${avatarColor === color ? "ring-2 ring-offset-2 ring-offset-card ring-white scale-110" : ""}`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="p-4 space-y-3">
              <div>
                <Label htmlFor="displayName" className="text-sm font-medium mb-1 block">Имя</Label>
                <Input id="displayName" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Ваше имя" className="bg-background" />
              </div>
              <div>
                <Label htmlFor="bio" className="text-sm font-medium mb-1 block">О себе</Label>
                <Textarea id="bio" value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Расскажите о себе..." rows={3} className="bg-background resize-none" />
              </div>
            </div>

            <div className="p-4">
              <Label className="text-sm font-medium mb-2 block">Статус</Label>
              <Input value={statusText} onChange={(e) => setStatusText(e.target.value)} placeholder="Что происходит?" className="bg-background mb-3" />
              <div className="flex flex-wrap gap-2">
                {STATUS_PRESETS.map((preset) => (
                  <button
                    key={preset.text}
                    onClick={() => setStatusText(`${preset.emoji} ${preset.text}`)}
                    className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${statusText === `${preset.emoji} ${preset.text}` ? "bg-primary/10 border-primary text-primary" : "border-border hover:border-primary/50 hover:bg-secondary"}`}
                  >
                    {preset.emoji} {preset.text}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-3 px-2 flex items-center gap-2">
            <Palette size={14} /> Оформление
          </h2>
          <div className="bg-card border border-border rounded-2xl overflow-hidden divide-y divide-border">
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 text-primary rounded-lg">
                  {isDark ? <Moon size={20} /> : <Sun size={20} />}
                </div>
                <div>
                  <Label className="text-base font-medium cursor-pointer" onClick={toggleTheme}>
                    {isDark ? "Тёмная тема" : "Светлая тема"}
                  </Label>
                  <p className="text-sm text-muted-foreground">{isDark ? "Тёмное оформление" : "Светлое оформление"}</p>
                </div>
              </div>
              <Switch checked={isDark} onCheckedChange={toggleTheme} />
            </div>
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500/10 text-green-500 rounded-lg">
                  <Smartphone size={20} />
                </div>
                <div>
                  <Label className="text-base font-medium">Уменьшить анимации</Label>
                  <p className="text-sm text-muted-foreground">Отключить сложные эффекты</p>
                </div>
              </div>
              <Switch checked={reduceAnimations} onCheckedChange={handleReduceAnimations} />
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-3 px-2 flex items-center gap-2">
            <Bell size={14} /> Уведомления
          </h2>
          <div className="bg-card border border-border rounded-2xl overflow-hidden divide-y divide-border">
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/10 text-blue-500 rounded-lg"><Bell size={20} /></div>
                <div>
                  <Label className="text-base font-medium">Push-уведомления</Label>
                  <p className="text-sm text-muted-foreground">Получать сообщения в фоне</p>
                </div>
              </div>
              <Switch checked={notifyMessages} onCheckedChange={handleNotifyMessages} />
            </div>
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-500/10 text-orange-500 rounded-lg"><Bell size={20} /></div>
                <div>
                  <Label className="text-base font-medium">Звуки</Label>
                  <p className="text-sm text-muted-foreground">Звук при получении сообщений</p>
                </div>
              </div>
              <Switch checked={notifySounds} onCheckedChange={handleNotifySounds} />
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-3 px-2 flex items-center gap-2">
            <Lock size={14} /> Безопасность
          </h2>
          <div className="bg-card border border-border rounded-2xl overflow-hidden divide-y divide-border">
            <div
              className="p-4 flex items-center justify-between cursor-pointer hover:bg-secondary transition-colors"
              onClick={() => setShowChangePassword(!showChangePassword)}
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-500/10 text-purple-500 rounded-lg"><Key size={20} /></div>
                <div>
                  <h3 className="text-base font-medium">Сменить пароль</h3>
                  <p className="text-sm text-muted-foreground">Обновить пароль аккаунта</p>
                </div>
              </div>
              <span className="text-muted-foreground">{showChangePassword ? "▲" : "›"}</span>
            </div>

            {showChangePassword && (
              <div className="p-4 space-y-3 bg-background/50">
                <div className="relative">
                  <Label className="text-sm mb-1 block">Текущий пароль</Label>
                  <Input
                    type={showCurrentPw ? "text" : "password"}
                    value={currentPassword}
                    onChange={e => setCurrentPassword(e.target.value)}
                    placeholder="Текущий пароль"
                    className="bg-background pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPw(v => !v)}
                    className="absolute right-3 bottom-2.5 text-muted-foreground hover:text-foreground"
                  >
                    {showCurrentPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <div className="relative">
                  <Label className="text-sm mb-1 block">Новый пароль</Label>
                  <Input
                    type={showNewPw ? "text" : "password"}
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="Минимум 6 символов"
                    className="bg-background pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPw(v => !v)}
                    className="absolute right-3 bottom-2.5 text-muted-foreground hover:text-foreground"
                  >
                    {showNewPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <div>
                  <Label className="text-sm mb-1 block">Подтвердите пароль</Label>
                  <Input
                    type="password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="Повторите новый пароль"
                    className="bg-background"
                  />
                </div>
                <button
                  onClick={handleChangePassword}
                  disabled={pwLoading}
                  className="w-full py-2.5 bg-primary text-primary-foreground rounded-xl font-medium text-sm hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {pwLoading ? "Сохраняем..." : "Сменить пароль"}
                </button>
              </div>
            )}

            <div className="p-4 flex items-center justify-between cursor-pointer hover:bg-secondary transition-colors">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-500/10 text-red-500 rounded-lg"><Shield size={20} /></div>
                <div>
                  <h3 className="text-base font-medium">Заблокированные</h3>
                  <p className="text-sm text-muted-foreground">Управление блокировками</p>
                </div>
              </div>
              <span className="text-muted-foreground">›</span>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-3 px-2 flex items-center gap-2">
            <Database size={14} /> Хранилище
          </h2>
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <div className="p-4 flex items-center justify-between cursor-pointer hover:bg-secondary transition-colors">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-500/10 text-orange-500 rounded-lg"><Database size={20} /></div>
                <div>
                  <h3 className="text-base font-medium">Использование памяти</h3>
                  <p className="text-sm text-muted-foreground">Кэш и медиафайлы</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>124 МБ</span><span>›</span>
              </div>
            </div>
          </div>
        </section>

        <div className="flex justify-center pt-2 pb-12">
          <button
            onClick={() => setShowLogoutDialog(true)}
            className="flex items-center gap-2 text-destructive hover:bg-destructive/10 px-6 py-3 rounded-xl font-bold transition-colors"
          >
            <LogOut size={18} /> Выйти из аккаунта
          </button>
        </div>
      </div>

      <AlertDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Выход из аккаунта</AlertDialogTitle>
            <AlertDialogDescription>Вы уверены, что хотите выйти из Pulse?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction onClick={logout} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Выйти
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
