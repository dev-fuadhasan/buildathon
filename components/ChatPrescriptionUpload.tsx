"use client";

import { useState } from "react";
import { useTranslation } from "@/hooks/useTranslation";
import { getLanguage } from "@/lib/i18n";

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
    <div className="flex items-center gap-2">
      <label htmlFor="chat-prescription-input" className="text-xs font-medium text-slate-600 cursor-pointer hover:text-pink-600 transition-colors">
        {lang === "bn" ? "📄 প্রেসক্রিপশন" : "📄 Prescription"}
      </label>
      <input
        id="chat-prescription-input"
        type="file"
        accept=".pdf,.png,.jpg,.jpeg"
        onChange={handleFileChange}
        disabled={uploading || disabled}
        className="hidden"
      />
      <label htmlFor="chat-prescription-input" className="flex-1 text-xs text-slate-500 cursor-pointer hover:text-slate-700 transition-colors truncate">
        {file ? file.name : (lang === "bn" ? "ফাইল নির্বাচন করুন" : "Choose file")}
      </label>
      {file && (
        <>
          <span className="text-xs text-slate-400">({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
          <button
            onClick={handleUpload}
            disabled={uploading || disabled}
            className="btn-primary text-xs px-3 py-1.5 h-auto"
          >
            {uploading 
              ? (lang === "bn" ? "..." : "...")
              : (lang === "bn" ? "আপলোড" : "Upload")
            }
          </button>
        </>
      )}
    </div>
  );
}

