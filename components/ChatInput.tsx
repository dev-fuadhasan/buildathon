"use client";

import { useState } from "react";
import { getLanguage } from "@/lib/i18n";
import Icon from "@/components/Icon";

type Props = {
  onSend: (text: string) => Promise<void> | void;
  disabled?: boolean;
};

export default function ChatInput({ onSend, disabled }: Props) {
  const lang = getLanguage();
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
      <div className="flex-1 relative">
        <textarea
          className="input resize-none min-h-[48px] max-h-[120px] pr-10 text-sm py-2.5"
          placeholder={lang === "bn" 
            ? "আপনার বার্তা টাইপ করুন... (প্রেরণ করতে Enter, নতুন লাইনের জন্য Shift+Enter)"
            : "Type your message... (Press Enter to send, Shift+Enter for new line)"}
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
        className="btn-primary px-4 py-2.5 h-[48px] flex items-center justify-center min-w-[80px] text-sm shadow-md hover:shadow-lg transition-all"
        title="Send message (Enter)"
      >
        {sending ? (
          <Icon name="pending" size={18} className="animate-spin" />
        ) : (
          <Icon name="upload" size={18} />
        )}
      </button>
    </div>
  );
}

