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
    if (!text || sending || disabled) return;
    setSending(true);
    try {
      await onSend(text);
      setValue("");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex gap-2 items-end">
      <div className="flex-1">
        <textarea
          className="input resize-none min-h-[60px] max-h-[120px]"
          placeholder="Type your message... (Press Enter to send, Shift+Enter for new line)"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          disabled={sending || disabled}
          rows={1}
        />
      </div>
      <button
        onClick={handleSend}
        disabled={sending || disabled || !value.trim()}
        className="btn-primary px-6 py-3 h-[60px] flex items-center justify-center"
        title="Send message (Enter)"
      >
        {sending ? (
          <span className="flex items-center gap-2">
            <span className="animate-spin">⏳</span>
            <span>Sending...</span>
          </span>
        ) : (
          <span className="flex items-center gap-2">
            <span>📤</span>
            <span>Send</span>
          </span>
        )}
      </button>
    </div>
  );
}

