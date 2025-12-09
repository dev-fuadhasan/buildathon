"use client";

import { useState } from "react";
import { getLanguage } from "@/lib/i18n";
import Icon from "@/components/Icon";
import Image from "next/image";

type Props = {
  onSend: (text: string) => Promise<void> | void;
  disabled?: boolean;
  onImageSelect?: (imageData: { file: File; preview: string }) => void;
  onImageRemove?: () => void;
  currentImage?: { file: File; preview: string } | null;
};

export default function ChatInput({ onSend, disabled, onImageSelect, onImageRemove, currentImage }: Props) {
  const lang = getLanguage();
  const [value, setValue] = useState("");
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    const text = value.trim();
    // Allow sending if there's text OR an image
    if ((!text && !currentImage) || sending || disabled) return;
    setSending(true);
    try {
      await onSend(text || (lang === "bn" ? "ছবি দেখুন" : "See image"));
      setValue("");
    } finally {
      setSending(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile || !onImageSelect) return;

    // Validate file type
    const validTypes = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
    if (!validTypes.includes(selectedFile.type)) {
      alert(lang === "bn" ? "শুধুমাত্র PNG, JPG বা WEBP ছবি আপলোড করুন" : "Please upload PNG, JPG, or WEBP images only");
      return;
    }

    // Validate file size (5MB max for images)
    if (selectedFile.size > 5 * 1024 * 1024) {
      alert(lang === "bn" ? "ছবির সাইজ 5MB এর কম হতে হবে" : "Image size must be less than 5MB");
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      onImageSelect({
        file: selectedFile,
        preview: reader.result as string,
      });
    };
    reader.readAsDataURL(selectedFile);

    // Reset input
    e.target.value = "";
  };

  return (
    <div className="space-y-2">
      {/* Image Preview (above input) */}
      {currentImage && (
        <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg">
          <div className="relative w-12 h-12 sm:w-14 sm:h-14 rounded overflow-hidden flex-shrink-0">
            <Image
              src={currentImage.preview}
              alt="Preview"
              fill
              className="object-cover"
            />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs sm:text-sm text-slate-700 truncate font-medium">{currentImage.file.name}</p>
            <p className="text-xs text-slate-400">
              {(currentImage.file.size / 1024 / 1024).toFixed(2)} MB
            </p>
          </div>
          <button
            onClick={onImageRemove}
            disabled={disabled}
            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title={lang === "bn" ? "মুছে ফেলুন" : "Remove"}
          >
            <Icon name="close" size={18} />
          </button>
        </div>
      )}

      {/* Input Row */}
      <div className="flex gap-2 items-end">
        {/* Image Attachment Button - LEFT SIDE */}
        {onImageSelect && (
          <label 
            htmlFor="chat-image-input" 
            className={`p-3 h-[48px] flex items-center justify-center rounded-lg border-2 transition-all ${
              disabled 
                ? "border-slate-200 text-slate-300 cursor-not-allowed bg-slate-50" 
                : "border-slate-300 text-slate-600 hover:text-pink-600 hover:border-pink-400 hover:bg-pink-50 cursor-pointer"
            }`}
            title={lang === "bn" ? "ছবি যুক্ত করুন" : "Attach image"}
          >
            <Icon name="add" size={22} />
          </label>
        )}
        
        <input
          id="chat-image-input"
          type="file"
          accept="image/png,image/jpeg,image/jpg,image/webp"
          onChange={handleFileChange}
          disabled={disabled}
          className="hidden"
        />

        {/* Text Input */}
        <div className="flex-1 relative">
          <textarea
            className="input resize-none text-sm py-2.5 px-3"
            placeholder={lang === "bn" 
              ? "বার্তা টাইপ করুন... (Enter: পাঠান, Shift+Enter: নতুন লাইন)"
              : "Type message... (Enter: send, Shift+Enter: new line)"}
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
            style={{ height: "48px", minHeight: "48px", maxHeight: "120px", overflowY: "auto" }}
          />
        </div>

        {/* Send Button */}
        <button
          onClick={handleSend}
          disabled={sending || disabled || (!value.trim() && !currentImage)}
          className="btn-primary px-4 py-2.5 h-[48px] flex items-center justify-center min-w-[80px] text-sm shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          title={lang === "bn" ? "পাঠান" : "Send"}
        >
          {sending ? (
            <Icon name="pending" size={18} className="animate-spin brightness-0 invert" />
          ) : (
            <Icon name="upload" size={18} className="brightness-0 invert" />
          )}
        </button>
      </div>
    </div>
  );
}

