"use client";

import { useEffect, useState, useRef } from "react";
import ChatBubble from "@/components/ChatBubble";
import ChatInput from "@/components/ChatInput";
import Layout from "@/components/Layout";
import Link from "next/link";

type Message = { role: "user" | "assistant"; content: string };

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Hi! I'm MomsCare, your AI pregnancy assistant. Ask me anything about your pregnancy journey!",
    },
  ]);
  const [loading, setLoading] = useState(false);
  const [isMother, setIsMother] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const motherToken = localStorage.getItem("motherToken");
    setIsMother(!!motherToken);
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
      <div className="flex flex-col h-[calc(100vh-200px)] max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-pink-600 mb-2">MomsCare AI Chat</h1>
          <div className="flex items-center gap-4">
            <p className="text-slate-600">
              {isMother 
                ? "✨ You're logged in! I'll provide personalized answers based on your profile."
                : "💬 Public chat - Log in as a mother for personalized guidance."}
            </p>
            {!isMother && (
              <Link href="/mother/login" className="btn-secondary text-sm">
                Login for Personalized Chat
              </Link>
            )}
          </div>
        </div>

        {/* Safety Disclaimer */}
        <div className="mb-4 rounded-lg bg-yellow-50 border border-yellow-200 p-3">
          <p className="text-sm text-yellow-800">
            ⚠️ <strong>Important:</strong> MomsCare is not a substitute for professional medical advice. 
            Always consult with your healthcare provider for medical concerns and emergencies.
          </p>
        </div>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto rounded-lg border border-slate-200 bg-white p-6 space-y-4 mb-4">
          {messages.map((msg, idx) => (
            <ChatBubble key={idx} role={msg.role} content={msg.content} />
          ))}
          {loading && (
            <div className="flex items-center gap-2 text-slate-500">
              <div className="animate-pulse">💭</div>
              <span className="text-sm">MomsCare is thinking...</span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Chat Input */}
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <ChatInput onSend={sendMessage} disabled={loading} />
        </div>
      </div>
    </Layout>
  );
}
