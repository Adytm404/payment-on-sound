import { useCallback, useEffect, useRef, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

function isMobile() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  // Coarse pointer + small viewport, plus UA check, to target phones/tablets.
  const uaMobile = /Android|iPhone|iPad|iPod|Mobile|Opera Mini|IEMobile/i.test(ua);
  const coarse = typeof window !== "undefined" && window.matchMedia?.("(pointer: coarse)").matches;
  const narrow = typeof window !== "undefined" && window.innerWidth <= 820;
  return uaMobile || (Boolean(coarse) && narrow);
}

function isStandalone() {
  if (typeof window === "undefined") return false;
  const displayStandalone = window.matchMedia?.("(display-mode: standalone)").matches;
  const iosStandalone = (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
  return Boolean(displayStandalone) || iosStandalone;
}

/**
 * Captures the Chromium `beforeinstallprompt` event so we can trigger the
 * native install dialog from our own button. Only reports installable when
 * running on a mobile browser (not already installed/standalone).
 */
export function useInstallPrompt() {
  const deferredRef = useRef<BeforeInstallPromptEvent | null>(null);
  const [canInstall, setCanInstall] = useState(false);
  const [installed, setInstalled] = useState(isStandalone());
  const mobile = isMobile();

  useEffect(() => {
    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      deferredRef.current = e as BeforeInstallPromptEvent;
      setCanInstall(true);
    };
    const onInstalled = () => {
      deferredRef.current = null;
      setCanInstall(false);
      setInstalled(true);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    const evt = deferredRef.current;
    if (!evt) return false;
    await evt.prompt();
    const choice = await evt.userChoice;
    // The event can only be used once.
    deferredRef.current = null;
    setCanInstall(false);
    return choice.outcome === "accepted";
  }, []);

  return {
    // Only surface on mobile browsers that fired the install event and aren't installed yet.
    canInstall: mobile && canInstall && !installed,
    installed,
    promptInstall,
  };
}
