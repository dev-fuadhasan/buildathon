"use client";

import { useState } from "react";
import { useTranslation } from "@/hooks/useTranslation";
import { getLanguage } from "@/lib/i18n";
import Icon from "@/components/Icon";

type Props = {
  onUpload: (file: File) => Promise<void>;
  disabled?: boolean;
};

export default function ChatPrescriptionUpload({ onUpload, disabled }: Props) {
  const t = useTranslation();
  const lang = getLanguage();
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      const validTypes = ["application/pdf", "image/png", "image/jpeg", "image/jpg"];
      if (!validTypes.includes(selectedFile.type)) {
        alert(lang === "bn" ? "PDF, PNG বা JPG ফাইল আপলোড করুন" : "Please upload PDF, PNG, or JPG files only");
        return;
      }
      if (selectedFile.size > 10 * 1024 * 1024) {
        alert(lang === "bn" ? "ফাইল সাইজ 10MB এর কম হতে হবে" : "File size must be less than 10MB");
        return;
      }
      setFile(selectedFile);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    try {
      await onUpload(file);
      setFile(null);
      const input = document.getElementById("chat-prescription-input") as HTMLInputElement;
      if (input) input.value = "";
    } catch (err) {
      console.error("Upload error:", err);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
      <label htmlFor="chat-prescription-input" className="text-xs sm:text-xs font-medium text-slate-600 cursor-pointer hover:text-pink-600 transition-colors flex items-center gap-1.5 touch-manipulation min-h-[36px] sm:min-h-0">
        <Icon name="prescription" size={16} className="sm:w-4 sm:h-4" />
        <span>{lang === "bn" ? "প্রেসক্রিপশন" : "Prescription"}</span>
      </label>
      <input
        id="chat-prescription-input"
        type="file"
        accept=".pdf,.png,.jpg,.jpeg"
        onChange={handleFileChange}
        disabled={uploading || disabled}
        className="hidden"
      />
      <label htmlFor="chat-prescription-input" className="flex-1 text-xs text-slate-500 cursor-pointer hover:text-slate-700 transition-colors truncate px-2 py-1.5 sm:py-0 border border-slate-200 rounded-lg sm:border-0 sm:rounded-none touch-manipulation min-h-[36px] sm:min-h-0 flex items-center">
        {file ? file.name : (lang === "bn" ? "ফাইল নির্বাচন করুন" : "Choose file")}
      </label>
      {file && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 hidden sm:inline">({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
          <button
            onClick={handleUpload}
            disabled={uploading || disabled}
            className="btn-primary text-xs px-3 sm:px-3 py-2 sm:py-1.5 h-auto touch-manipulation min-h-[36px] sm:min-h-0 flex-1 sm:flex-initial"
          >
            {uploading 
              ? (lang === "bn" ? "..." : "...")
              : (lang === "bn" ? "আপলোড" : "Upload")
            }
          </button>
        </div>
      )}
    </div>
  );
}

