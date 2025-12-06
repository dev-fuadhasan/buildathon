"use client";

import Layout from "@/components/Layout";
import { getLanguage } from "@/lib/i18n";
import { useState } from "react";

export default function OfflinePage() {
  const [lang] = useState(() => getLanguage());
  const isBn = lang === "bn";

  return (
    <Layout>
      <div className="max-w-2xl mx-auto text-center py-16">
        <div className="text-6xl mb-6">📡</div>
        <h1 className="text-4xl font-bold text-slate-800 mb-4">
          {isBn ? "অফলাইন" : "You're Offline"}
        </h1>
        <p className="text-xl text-slate-600 mb-8">
          {isBn
            ? "ইন্টারনেট সংযোগ নেই। অনুগ্রহ করে আপনার সংযোগ পরীক্ষা করুন।"
            : "No internet connection. Please check your connection."}
        </p>
        <button
          onClick={() => window.location.reload()}
          className="btn-primary"
        >
          {isBn ? "পুনরায় চেষ্টা করুন" : "Try Again"}
        </button>
        <div className="mt-8 p-6 bg-yellow-50 rounded-lg border border-yellow-200">
          <p className="text-sm text-yellow-900">
            {isBn
              ? "💡 টিপ: কিছু বৈশিষ্ট্য অফলাইনেও কাজ করতে পারে যদি আপনি আগে সাইটটি পরিদর্শন করে থাকেন।"
              : "💡 Tip: Some features may work offline if you've visited the site before."}
          </p>
        </div>
      </div>
    </Layout>
  );
}

