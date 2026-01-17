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
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
      <div className="flex-1 flex items-center gap-2">
        <label 
          htmlFor="chat-prescription-input" 
          className={`flex-1 flex items-center gap-3 px-4 py-2.5 rounded-2xl border-2 border-dashed transition-all cursor-pointer ${
            file 
              ? "border-pink-500 bg-pink-50 text-pink-700 shadow-md shadow-pink-100" 
              : "border-slate-200 hover:border-pink-300 hover:bg-slate-50 text-slate-500"
          }`}
        >
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${file ? 'bg-pink-500 text-white' : 'bg-slate-100'}`}>
            <Icon name="prescription" size={16} className={file ? 'brightness-0 invert' : ''} />
          </div>
          <span className="text-xs font-black uppercase tracking-widest truncate">
            {file ? file.name : (lang === "bn" ? "প্রেসক্রিপশন আপলোড" : "Upload Prescription")}
          </span>
        </label>
        <input
          id="chat-prescription-input"
          type="file"
          accept=".pdf,.png,.jpg,.jpeg"
          onChange={handleFileChange}
          disabled={uploading || disabled}
          className="hidden"
        />
      </div>

      {file && (
        <button
          onClick={handleUpload}
          disabled={uploading || disabled}
          className="bg-pink-500 text-white px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-[0.1em] shadow-lg shadow-pink-200 hover:bg-pink-600 active:scale-95 transition-all disabled:opacity-50"
        >
          {uploading 
            ? <Icon name="pending" size={16} className="animate-spin brightness-0 invert" />
            : (lang === "bn" ? "আপলোড" : "Confirm")
          }
        </button>
      )}
    </div>
  );
}

