import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Loader2, X } from "lucide-react";

export default function EmailModal({
  isOpen,
  onClose,
  initialTo,
  initialSubject,
  initialMessage,
  onSend,
  isSending,
  docType,
  contactEmail,
}) {
  const [to, setTo] = useState(initialTo || "");
  const [cc, setCc] = useState("");
  const [subject, setSubject] = useState(initialSubject || "");
  const [message, setMessage] = useState(initialMessage || "");

  useEffect(() => {
    if (isOpen) {
      setTo(initialTo || "");
      setSubject(initialSubject || "");
      setMessage(initialMessage || "");
      setCc("");
    }
  }, [isOpen, initialTo, initialSubject, initialMessage]);

  if (!isOpen) return null;

  const handleSend = () => {
    onSend(to, cc, subject, message);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: "rgba(0,0,0,0.75)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-slate-900 border border-slate-700 rounded-t-2xl sm:rounded-xl w-full sm:max-w-lg shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700">
          <h2 className="text-white text-lg font-semibold">
            Email {docType === "invoice" ? "Invoice" : "Quote"}
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors p-1 rounded-full hover:bg-slate-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* To */}
          <div className="space-y-1.5">
            <Label className="text-slate-400 text-sm">To</Label>
            <Input
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="bg-slate-800 border-slate-600 text-white focus:border-blue-500"
              placeholder="recipient@example.com"
            />
            {contactEmail && (
              <p className="text-slate-500 text-xs">A copy of this email will be sent to {contactEmail}</p>
            )}
          </div>

          {/* CC */}
          <div className="space-y-1.5">
            <Label className="text-slate-400 text-sm">CC <span className="text-slate-500 font-normal">(optional, comma-separated)</span></Label>
            <Input
              value={cc}
              onChange={(e) => setCc(e.target.value)}
              className="bg-slate-800 border-slate-600 text-white focus:border-blue-500"
              placeholder="cc@example.com, another@example.com"
            />
          </div>

          {/* Subject */}
          <div className="space-y-1.5">
            <Label className="text-slate-400 text-sm">Subject</Label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="bg-slate-800 border-slate-600 text-white focus:border-blue-500"
            />
          </div>

          {/* Message */}
          <div className="space-y-1.5">
            <Label className="text-slate-400 text-sm">Message</Label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={10}
              className="bg-slate-800 border-slate-600 text-white focus:border-blue-500 resize-none font-mono text-sm"
            />
          </div>

          <p className="text-slate-500 text-xs">
            The PDF will be automatically attached when you click Send.
          </p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-slate-700 bg-slate-900">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isSending}
            className="bg-transparent border-slate-600 text-slate-300 hover:bg-slate-800 hover:text-white"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSend}
            disabled={isSending || !to.trim() || !subject.trim()}
            className="bg-blue-600 hover:bg-blue-700 text-white min-w-[80px]"
          >
            {isSending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              "Send"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}