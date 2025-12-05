"use client";

import { useEffect, useState } from "react";
import ChatBubble from "@/components/ChatBubble";
import ChatInput from "@/components/ChatInput";
import Layout from "@/components/Layout";

type Message = { role: "user" | "assistant"; content: string };

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Hi! I'm MomsCare. Ask me anything about your pregnancy.",
    },
  ]);
  const [loading, setLoading] = useState(false);

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
      const data = await res.json();
      setMessages([...newMessages, { role: "assistant", content: data.reply }]);
    } catch (err) {
      setMessages([
        ...newMessages,
        { role: "assistant", content: "Sorry, something went wrong." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setMessages((prev) =>
      prev.length
        ? prev
        : [
            {
              role: "assistant",
              content: "Hi! I'm MomsCare. Ask me anything about your pregnancy.",
            },
          ],
    );
  }, []);

  return (
    <Layout>
      <div className="flex flex-col gap-4">
        <h1 className="text-3xl font-bold">MomsCare Chat</h1>
        <p className="text-slate-600">
          Public chat works for everyone. Mothers who are logged in receive personalized answers based on their profile.
        </p>
        <div className="card h-[60vh] overflow-y-auto space-y-4">
          {messages.map((msg, idx) => (
            <ChatBubble key={idx} role={msg.role} content={msg.content} />
          ))}
          {loading && <p className="text-sm text-slate-500">Thinking...</p>}
        </div>
        <ChatInput onSend={sendMessage} disabled={loading} />
      </div>
    </Layout>
  );
}

