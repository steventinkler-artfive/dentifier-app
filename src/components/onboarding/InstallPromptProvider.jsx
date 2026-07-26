import React, { createContext, useContext, useState, useEffect } from "react";

const InstallPromptContext = createContext(null);

export function useInstallPrompt() {
  return useContext(InstallPromptContext);
}

export function InstallPromptProvider({ children }) {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isStandalone, setIsStandalone] = useState(
    typeof window !== "undefined" &&
      (window.matchMedia("(display-mode: standalone)").matches ||
        window.navigator.standalone === true)
  );
  const isMobile =
    typeof window !== "undefined" &&
    (/iPad|iPhone|iPod/.test(window.navigator.userAgent) && !window.MSStream) ||
    /Android/i.test(window.navigator.userAgent);

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const promptInstall = async () => {
    if (!deferredPrompt) return null;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    return outcome;
  };

  return (
    <InstallPromptContext.Provider
      value={{ deferredPrompt, isStandalone, isMobile, promptInstall }}
    >
      {children}
    </InstallPromptContext.Provider>
  );
}