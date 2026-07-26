import React from "react";
import { Button } from "@/components/ui/button";
import { Smartphone } from "lucide-react";
import { useInstallPrompt } from "./InstallPromptProvider";

const ShareIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ display: "inline-block", verticalAlign: "middle", margin: "0 2px" }}
  >
    <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
    <polyline points="16 6 12 2 8 6" />
    <line x1="12" y1="2" x2="12" y2="15" />
  </svg>
);

export default function InstallInstructions({ onInstallSuccess }) {
  const { deferredPrompt, promptInstall } = useInstallPrompt();
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

  const handleNativeInstall = async () => {
    const outcome = await promptInstall();
    if (onInstallSuccess) onInstallSuccess(outcome);
  };

  if (isIOS) {
    return (
      <div className="p-4 bg-slate-800 rounded-xl space-y-3 text-left">
        <p className="text-white font-medium text-sm">To add to your Home Screen:</p>
        <ol className="text-slate-300 text-sm space-y-2 list-decimal list-inside">
          <li>
            Tap the <span className="font-semibold text-white">Share</span> button <ShareIcon /> — it's in the toolbar at the bottom of Safari, or tap{" "}
            <span className="font-semibold text-white">•••</span> first if you can't see it
          </li>
          <li>
            Scroll down and tap <span className="font-semibold text-white">"Add to Home Screen"</span>
          </li>
          <li>
            Tap <span className="font-semibold text-white">"Add"</span> in the top right
          </li>
        </ol>
      </div>
    );
  }

  if (deferredPrompt) {
    return (
      <Button
        onClick={handleNativeInstall}
        className="w-full bg-rose-600 hover:bg-rose-700 text-white font-semibold py-3"
      >
        <Smartphone className="w-4 h-4 mr-2" />
        Add to Home Screen
      </Button>
    );
  }

  return (
    <div className="p-4 bg-slate-800 rounded-xl text-left">
      <p className="text-slate-300 text-sm">
        Open Dentifier in your mobile browser and use the browser menu to find{" "}
        <span className="font-semibold text-white">"Add to Home Screen"</span>.
      </p>
    </div>
  );
}