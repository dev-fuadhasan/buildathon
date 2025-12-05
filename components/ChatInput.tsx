"use client";

import { useState } from "react";

type Props = {
  onSend: (text: string) => Promise<void> | void;
  disabled?: boolean;
};

export default function ChatInput({ onSend, disabled }: Props) {
  const [value, setValue] = useState("");
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    const text = value.trim();
    if (!text) return;
    setSending(true);
    await onSend(text);
    setValue("");
    setSending(false);
  };

  return (
    <div className="space-y-2">
      <p className="text-xs text-slate-500">
        MomsCare is not a substitute for professional medical advice.
      </p>
      <div className="flex gap-2">
        <input
          className="input"
          placeholder="Type your message..."
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          disabled={sending || disabled}
        />
        <button
          onClick={handleSend}
          disabled={sending || disabled}
          className="btn-primary"
        >
          {sending ? "Sending..." : "Send"}
        </button>
      </div>
    </div>
  );
}

