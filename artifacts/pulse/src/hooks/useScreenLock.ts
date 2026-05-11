function hashPin(pin: string): string {
  let h = 5381;
  for (let i = 0; i < pin.length; i++) h = ((h << 5) + h) ^ pin.charCodeAt(i);
  return String(h >>> 0);
}

export function useScreenLock() {
  const isEnabled = () => localStorage.getItem("pulse-screen-lock-enabled") === "true";
  const getPinHash = () => localStorage.getItem("pulse-screen-lock-pin") || "";
  const isSessionUnlocked = () => sessionStorage.getItem("pulse-unlocked") === "true";

  const getPinLength = () => Number(localStorage.getItem("pulse-screen-lock-pin-length") || "4");

  const enablePin = (pin: string) => {
    localStorage.setItem("pulse-screen-lock-pin", hashPin(pin));
    localStorage.setItem("pulse-screen-lock-pin-length", String(pin.length));
    localStorage.setItem("pulse-screen-lock-enabled", "true");
  };

  const disablePin = (pin: string): boolean => {
    if (hashPin(pin) !== getPinHash()) return false;
    localStorage.removeItem("pulse-screen-lock-pin");
    localStorage.removeItem("pulse-screen-lock-pin-length");
    localStorage.setItem("pulse-screen-lock-enabled", "false");
    sessionStorage.removeItem("pulse-unlocked");
    return true;
  };

  const verifyPin = (pin: string): boolean => hashPin(pin) === getPinHash();

  const lock = () => {
    sessionStorage.removeItem("pulse-unlocked");
    window.dispatchEvent(new CustomEvent("pulse-lock"));
  };

  return { isEnabled, verifyPin, enablePin, disablePin, isSessionUnlocked, lock, getPinLength };
}
