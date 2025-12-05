"use client";

import { useEffect, useState, useRef } from "react";
import ChatBubble from "@/components/ChatBubble";
import ChatInput from "@/components/ChatInput";
import ChatPrescriptionUpload from "@/components/ChatPrescriptionUpload";
import Layout from "@/components/Layout";
import Link from "next/link";
import { useTranslation } from "@/hooks/useTranslation";
import { getLanguage } from "@/lib/i18n";

type Message = { role: "user" | "assistant"; content: string };

export default function ChatPage() {
  const t = useTranslation();
  const [lang] = useState(() => getLanguage());
  
  const initialMessage = lang === "bn" 
    ? "হাই! আমি MomsCare, আপনার AI গর্ভাবস্থা সহায়ক। আপনার গর্ভাবস্থার যাত্রা সম্পর্কে যেকোনো কিছু জিজ্ঞাসা করুন!"
    : "Hi! I'm MomsCare, your AI pregnancy assistant. Ask me anything about your pregnancy journey!";
  
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: initialMessage,
    },
  ]);
  const [loading, setLoading] = useState(false);
  const [isMother, setIsMother] = useState(false);
  const [motherToken, setMotherToken] = useState("");
  const [uploadMessage, setUploadMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const token = localStorage.getItem("motherToken") || "";
    setMotherToken(token);
    setIsMother(!!token);
  }, []);

  const getToken = () =>
    localStorage.getItem("motherToken") ||
    localStorage.getItem("doctorToken") ||
    "";

  const sendMessage = async (text: string) => {
    const newMessages = [...messages, { role: "user" as const, content: text }];
    setMessages(newMessages);
    setLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
        },
        body: JSON.stringify({
          messages: newMessages,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || errorData.error || `HTTP ${res.status}`);
      }

      const data = await res.json();
      if (!data.reply) {
        throw new Error("No reply received from server");
      }

      setMessages([...newMessages, { role: "assistant", content: data.reply }]);
    } catch (err: any) {
      console.error("Chat error:", err);
      const errorMessage = err.message || "Sorry, something went wrong. Please try again.";
      setMessages([
        ...newMessages,
        { role: "assistant", content: `❌ Error: ${errorMessage}` },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="flex flex-col h-[calc(100vh-120px)] max-w-6xl mx-auto gap-3">
        {/* Header - Compact */}
        <div className="flex items-center justify-between flex-shrink-0">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-pink-600 to-pink-500 bg-clip-text text-transparent">
              {t.chat.title}
            </h1>
            <p className="text-sm text-slate-600 mt-0.5">
              {isMother ? `✨ ${t.chat.personalized}` : `💬 ${t.chat.public}`}
            </p>
          </div>
          {!isMother && (
            <Link href="/mother/login" className="btn-secondary text-sm px-4 py-2">
              {t.common.login} {lang === "bn" ? "ব্যক্তিগতকৃত" : "Personalized"}
            </Link>
          )}
        </div>

        {/* Safety Disclaimer - Compact */}
        <div className="rounded-lg bg-gradient-to-r from-yellow-50 to-amber-50 border border-yellow-200 p-2.5 shadow-sm flex-shrink-0">
          <p className="text-xs text-yellow-900 font-medium">
            ⚠️ <strong>{lang === "bn" ? "গুরুত্বপূর্ণ:" : "Important:"}</strong> {t.chat.disclaimer}
          </p>
        </div>

        {/* Main Chat Container - Takes Most Space */}
        <div className="flex-1 flex flex-col min-h-0 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
          {/* Chat Messages - Large Section */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gradient-to-b from-slate-50 to-white min-h-0">
            {messages.map((msg, idx) => (
              <ChatBubble key={idx} role={msg.role} content={msg.content} />
            ))}
            {loading && (
              <div className="flex items-center gap-3 text-slate-500">
                <div className="animate-pulse text-2xl">💭</div>
                <span className="text-sm font-medium">
                  {lang === "bn" ? "MomsCare চিন্তা করছে..." : "MomsCare is thinking..."}
                </span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Upload Message */}
          {uploadMessage && (
            <div className={`mx-4 mb-2 rounded-lg p-3 ${
              uploadMessage.includes("✅") 
                ? "bg-green-50 text-green-800 border border-green-200" 
                : "bg-red-50 text-red-800 border border-red-200"
            }`}>
              <p className="text-sm font-medium">{uploadMessage}</p>
            </div>
          )}

          {/* Input Section - Compact */}
          <div className="border-t border-slate-200 bg-white p-4 flex-shrink-0">
            <ChatInput onSend={sendMessage} disabled={loading} />
            {/* Prescription Upload - Small, Collapsible */}
            {isMother && (
              <div className="mt-2 pt-2 border-t border-slate-100">
                <ChatPrescriptionUpload
                  onUpload={async (file) => {
                    setUploadMessage("");
                    const formData = new FormData();
                    formData.append("file", file);
                    try {
                      const res = await fetch("/api/mother/prescriptions", {
                        method: "POST",
                        headers: {
                          Authorization: `Bearer ${motherToken}`,
                        },
                        body: formData,
                      });
                      const data = await res.json();
                      if (res.ok) {
                        setUploadMessage(lang === "bn" ? "✅ প্রেসক্রিপশন সফলভাবে আপলোড করা হয়েছে!" : "✅ Prescription uploaded successfully!");
                      } else {
                        setUploadMessage(`❌ ${data.error || (lang === "bn" ? "আপলোড ব্যর্থ হয়েছে" : "Upload failed")}`);
                      }
                    } catch (err) {
                      setUploadMessage(`❌ ${lang === "bn" ? "নেটওয়ার্ক ত্রুটি" : "Network error"}`);
                    }
                  }}
                  disabled={loading}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
