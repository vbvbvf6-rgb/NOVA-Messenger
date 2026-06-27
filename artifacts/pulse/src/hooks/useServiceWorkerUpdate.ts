import { useEffect, useState } from "react";

const CHECK_INTERVAL_MS = 30 * 60 * 1000;
const JUST_UPDATED_KEY = "aura-just-updated";
const JUST_UPDATED_TTL_MS = 10_000;

function wasJustUpdated(): boolean {
  const ts = Number(sessionStorage.getItem(JUST_UPDATED_KEY) ?? "0");
  return ts > 0 && Date.now() - ts < JUST_UPDATED_TTL_MS;
}

export function useServiceWorkerUpdate() {
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);
  const [updateAvailable, setUpdateAvailable] = useState(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    // Suppress banner if the user just triggered an update reload
    if (wasJustUpdated()) {
      sessionStorage.removeItem(JUST_UPDATED_KEY);
      return;
    }

    let reg: ServiceWorkerRegistration | null = null;
    let applied = false;

    const markWaiting = (sw: ServiceWorker) => {
      if (applied) return;
      setWaitingWorker(sw);
      setUpdateAvailable(true);
    };

    const watchInstalling = (installing: ServiceWorker) => {
      installing.addEventListener("statechange", () => {
        if (applied) return;
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

    const interval = setInterval(() => {
      reg?.update().catch(() => {});
    }, CHECK_INTERVAL_MS);

    const onVisible = () => {
      if (document.visibilityState === "visible" && !applied) {
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
    if (!waitingWorker) return;
    setUpdateAvailable(false);
    sessionStorage.setItem(JUST_UPDATED_KEY, String(Date.now()));

    const onControllerChange = () => {
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);

    waitingWorker.postMessage({ type: "skip-waiting" });

    // Fallback reload if controllerchange never fires within 2s
    setTimeout(() => {
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
      window.location.reload();
    }, 2000);
  };

  return { updateAvailable, applyUpdate };
}
