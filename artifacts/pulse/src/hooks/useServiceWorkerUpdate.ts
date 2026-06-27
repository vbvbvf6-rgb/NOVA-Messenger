import { useEffect, useState } from "react";

const CHECK_INTERVAL_MS = 30 * 60 * 1000; // check every 30 min

export function useServiceWorkerUpdate() {
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);
  const [updateAvailable, setUpdateAvailable] = useState(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    let reg: ServiceWorkerRegistration | null = null;

    const markWaiting = (sw: ServiceWorker) => {
      setWaitingWorker(sw);
      setUpdateAvailable(true);
    };

    const watchInstalling = (installing: ServiceWorker) => {
      installing.addEventListener("statechange", () => {
        if (installing.state === "installed" && navigator.serviceWorker.controller) {
          markWaiting(installing);
        }
      });
    };

    navigator.serviceWorker.getRegistration().then((r) => {
      if (!r) return;
      reg = r;

      if (r.waiting && navigator.serviceWorker.controller) {
        markWaiting(r.waiting);
      }
      if (r.installing) watchInstalling(r.installing);

      r.addEventListener("updatefound", () => {
        if (r.installing) watchInstalling(r.installing);
      });
    });

    // Poll for updates periodically so the banner shows while app is open
    const interval = setInterval(() => {
      reg?.update().catch(() => {});
    }, CHECK_INTERVAL_MS);

    // Also check when user returns to the tab
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        reg?.update().catch(() => {});
      }
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  const applyUpdate = () => {
    waitingWorker?.postMessage({ type: "skip-waiting" });
    setUpdateAvailable(false);
    // Give SW a moment to activate, then reload to get the new bundle
    setTimeout(() => window.location.reload(), 300);
  };

  return { updateAvailable, applyUpdate };
}
