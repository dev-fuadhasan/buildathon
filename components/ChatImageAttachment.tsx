"use client";

import { useState } from "react";
import { getLanguage } from "@/lib/i18n";
import Icon from "@/components/Icon";
import Image from "next/image";

type Props = {
  onImageSelect: (imageData: { file: File; preview: string }) => void;
  onImageRemove: () => void;
  currentImage: { file: File; preview: string } | null;
  disabled?: boolean;
};

export default function ChatImageAttachment({ 
  onImageSelect, 
  onImageRemove, 
  currentImage, 
  disabled 
}: Props) {
  const lang = getLanguage();
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // Validate file type
    const validTypes = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
    if (!validTypes.includes(selectedFile.type)) {
      setError(lang === "bn" ? "শুধুমাত্র PNG, JPG বা WEBP ছবি আপলোড করুন" : "Please upload PNG, JPG, or WEBP images only");
      return;
    }

    // Validate file size (5MB max for images)
    if (selectedFile.size > 5 * 1024 * 1024) {
      setError(lang === "bn" ? "ছবির সাইজ 5MB এর কম হতে হবে" : "Image size must be less than 5MB");
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setError(null);
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
    <div className="flex items-center gap-2">
      {/* Image attachment button */}
      {!currentImage && (
        <label 
          htmlFor="chat-image-input" 
          className={`p-2 rounded-lg transition-colors ${
            disabled 
              ? "text-slate-300 cursor-not-allowed" 
              : "text-slate-500 hover:text-pink-600 hover:bg-pink-50 cursor-pointer"
          }`}
          title={lang === "bn" ? "ছবি যুক্ত করুন" : "Attach image"}
        >
          <Icon name="image" size={20} />
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

      {/* Image preview */}
      {currentImage && (
        <div className="flex items-center gap-2 px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg">
          <div className="relative w-10 h-10 rounded overflow-hidden">
            <Image
              src={currentImage.preview}
              alt="Preview"
              fill
              className="object-cover"
            />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-slate-700 truncate">{currentImage.file.name}</p>
            <p className="text-xs text-slate-400">
              {(currentImage.file.size / 1024 / 1024).toFixed(2)} MB
            </p>
          </div>
          <button
            onClick={onImageRemove}
            disabled={disabled}
            className="p-1 text-slate-400 hover:text-red-600 transition-colors"
            title={lang === "bn" ? "মুছে ফেলুন" : "Remove"}
          >
            <Icon name="close" size={16} />
          </button>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="absolute bottom-full left-0 mb-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-xs text-red-600">{error}</p>
        </div>
      )}
    </div>
  );
}

