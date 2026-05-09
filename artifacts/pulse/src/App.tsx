import { useState } from "react";
import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppProvider } from "@/contexts/AppContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { AddAccountDialog } from "@/components/layout/AddAccountDialog";
import { getSavedAccounts, saveAccount, removeAccount, SavedAccount } from "@/lib/accounts";
import { ScreenLock } from "@/components/ScreenLock";

import Home from "@/pages/Home";
import Calls from "@/pages/Calls";
import Contacts from "@/pages/Contacts";
import Gifts from "@/pages/Gifts";
import Stories from "@/pages/Stories";
import Profile from "@/pages/Profile";
import Settings from "@/pages/Settings";
import UserProfile from "@/pages/UserProfile";
import Feed from "@/pages/Feed";
import Wallet from "@/pages/Wallet";
import Admin from "@/pages/Admin";
import Prime from "@/pages/Prime";
import Bots from "@/pages/Bots";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import ForgotPassword from "@/pages/ForgotPassword";
import NotFound from "@/pages/not-found";

let queryClient = new QueryClient();

interface MainAppProps {
  onLogout: () => void;
  onSwitchAccount: (userId: number) => void;
  onRemoveAccount: (userId: number) => void;
  onOpenAddAccount: () => void;
}

function MainApp({ onLogout, onSwitchAccount, onRemoveAccount, onOpenAddAccount }: MainAppProps) {
  return (
    <LanguageProvider>
    <AppProvider
      onLogout={onLogout}
      onSwitchAccount={onSwitchAccount}
      onRemoveAccount={onRemoveAccount}
      onOpenAddAccount={onOpenAddAccount}
    >
      <TooltipProvider>
        <ScreenLock>
          <AppLayout>
            <Switch>
              <Route path="/" component={Home} />
              <Route path="/calls" component={Calls} />
              <Route path="/feed" component={Feed} />
              <Route path="/contacts" component={Contacts} />
              <Route path="/gifts" component={Gifts} />
              <Route path="/stories" component={Stories} />
              <Route path="/wallet" component={Wallet} />
              <Route path="/admin" component={Admin} />
              <Route path="/prime" component={Prime} />
              <Route path="/bots" component={Bots} />
              <Route path="/profile" component={Profile} />
              <Route path="/settings" component={Settings} />
              <Route path="/user/:userId" component={UserProfile} />
              <Route component={NotFound} />
            </Switch>
          </AppLayout>
        </ScreenLock>
        <Toaster />
      </TooltipProvider>
    </AppProvider>
    </LanguageProvider>
  );
}

function AuthPages({ onLogin }: { onLogin: (userId: number) => void }) {
  const [, navigate] = useLocation();

  const handleLogin = (userId: number) => {
    navigate("/");
    onLogin(userId);
  };

  return (
    <Switch>
      <Route path="/register" component={() => <Register onLogin={handleLogin} />} />
      <Route path="/forgot-password" component={ForgotPassword} />
      <Route component={() => <Login onLogin={handleLogin} />} />
    </Switch>
  );
}

function App() {
  const [userId, setUserId] = useState<number | null>(() => {
    const stored = localStorage.getItem("pulse-user-id");
    if (!stored) return null;
    const id = Number(stored);
    const accounts = getSavedAccounts();
    if (!accounts.some(a => a.userId === id)) {
      const user = (() => { try { return JSON.parse(localStorage.getItem("pulse-user") || "{}"); } catch { return {}; } })();
      if (user.displayName || user.username) {
        saveAccount({
          userId: id,
          displayName: user.displayName || "User",
          username: user.username || "",
          avatarUrl: user.avatarUrl || null,
          avatarColor: user.avatarColor || "#3B82F6",
        });
      }
    }
    return id;
  });
  const [addingAccount, setAddingAccount] = useState(false);

  const persistAndSwitch = (id: number) => {
    queryClient.clear();
    setUserId(id);
  };

  const handleLogin = (id: number) => {
    const user = (() => { try { return JSON.parse(localStorage.getItem("pulse-user") || "{}"); } catch { return {}; } })();
    saveAccount({
      userId: id,
      displayName: user.displayName || "User",
      username: user.username || "",
      avatarUrl: user.avatarUrl || null,
      avatarColor: user.avatarColor || "#3B82F6",
    });
    persistAndSwitch(id);
  };

  const handleSwitchAccount = (id: number) => {
    const accounts = getSavedAccounts();
    const acc = accounts.find(a => a.userId === id);
    if (!acc) return;
    if (acc.token) {
      localStorage.setItem("pulse-token", acc.token);
    } else {
      localStorage.removeItem("pulse-token");
    }
    localStorage.setItem("pulse-user-id", String(id));
    localStorage.setItem("pulse-user", JSON.stringify({
      id: acc.userId,
      displayName: acc.displayName,
      username: acc.username,
      avatarUrl: acc.avatarUrl,
      avatarColor: acc.avatarColor,
    }));
    persistAndSwitch(id);
  };

  const handleRemoveAccount = (id: number) => {
    removeAccount(id);
    if (id === userId) {
      const remaining = getSavedAccounts();
      if (remaining.length > 0) {
        handleSwitchAccount(remaining[0].userId);
      } else {
        localStorage.removeItem("pulse-user-id");
        localStorage.removeItem("pulse-user");
        localStorage.removeItem("pulse-token");
        queryClient.clear();
        setUserId(null);
      }
    }
  };

  const handleLogout = () => {
    const currentId = userId;
    if (currentId) removeAccount(currentId);
    localStorage.removeItem("pulse-user-id");
    localStorage.removeItem("pulse-user");
    localStorage.removeItem("pulse-token");
    const remaining = getSavedAccounts();
    if (remaining.length > 0) {
      const acc = remaining[0];
      if (acc.token) {
        localStorage.setItem("pulse-token", acc.token);
      }
      localStorage.setItem("pulse-user-id", String(acc.userId));
      localStorage.setItem("pulse-user", JSON.stringify({
        id: acc.userId,
        displayName: acc.displayName,
        username: acc.username,
        avatarUrl: acc.avatarUrl,
        avatarColor: acc.avatarColor,
      }));
      persistAndSwitch(acc.userId);
    } else {
      queryClient.clear();
      setUserId(null);
    }
  };

  const handleAccountAdded = (id: number) => {
    setAddingAccount(false);
    persistAndSwitch(id);
  };

  return (
    <QueryClientProvider client={queryClient}>
      <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
        {userId ? (
          <>
            <MainApp
              onLogout={handleLogout}
              onSwitchAccount={handleSwitchAccount}
              onRemoveAccount={handleRemoveAccount}
              onOpenAddAccount={() => setAddingAccount(true)}
            />
            <AddAccountDialog
              open={addingAccount}
              onClose={() => setAddingAccount(false)}
              onAccountAdded={handleAccountAdded}
            />
          </>
        ) : (
          <AuthPages onLogin={handleLogin} />
        )}
      </WouterRouter>
    </QueryClientProvider>
  );
}

export default App;
