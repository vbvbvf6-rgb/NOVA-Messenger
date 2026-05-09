import { useState, useCallback, useEffect } from "react";

export type NotificationPermission = "default" | "granted" | "denied";

export function useNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof Notification !== "undefined" ? Notification.permission : "denied"
  );

  useEffect(() => {
    if (typeof Notification === "undefined") return;
    setPermission(Notification.permission);
  }, []);

  const requestPermission = useCallback(async (): Promise<NotificationPermission> => {
    if (typeof Notification === "undefined") return "denied";
    if (Notification.permission === "granted") return "granted";
    if (Notification.permission === "denied") return "denied";
    const result = await Notification.requestPermission();
    setPermission(result);
    return result;
  }, []);

  const notify = useCallback(
    (title: string, options: { body?: string; icon?: string; url?: string; tag?: string } = {}) => {
      if (typeof Notification === "undefined") return;
      if (Notification.permission !== "granted") return;
      if (document.visibilityState === "visible" && document.hasFocus()) return;

      const notifOpts: NotificationOptions = {
        body: options.body || "",
        icon: options.icon || "/favicon.svg",
        badge: "/favicon.svg",
        tag: options.tag || "pulse-message",
        silent: false,
        data: { url: options.url || "/" },
      };

      if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: "show-notification",
          title,
          ...notifOpts,
          url: options.url || "/",
        });
      } else {
        try {
          new Notification(title, notifOpts);
        } catch {}
      }
    },
    []
  );

  const isSupported = typeof Notification !== "undefined";

  return { permission, requestPermission, notify, isSupported };
}
