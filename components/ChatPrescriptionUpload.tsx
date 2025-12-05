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
    <div className="border-t border-slate-200 pt-3 mt-3">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-sm font-medium text-slate-700">
          {lang === "bn" ? "📄 প্রেসক্রিপশন আপলোড করুন" : "📄 Upload Prescription"}
        </span>
      </div>
      <div className="flex gap-2">
        <input
          id="chat-prescription-input"
          type="file"
          accept=".pdf,.png,.jpg,.jpeg"
          onChange={handleFileChange}
          disabled={uploading || disabled}
          className="input flex-1 text-sm"
        />
        {file && (
          <button
            onClick={handleUpload}
            disabled={uploading || disabled}
            className="btn-primary text-sm px-4 py-2"
          >
            {uploading 
              ? (lang === "bn" ? "আপলোড হচ্ছে..." : "Uploading...")
              : (lang === "bn" ? "আপলোড" : "Upload")
            }
          </button>
        )}
      </div>
      {file && (
        <p className="text-xs text-slate-500 mt-1">
          {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
        </p>
      )}
    </div>
  );
}

