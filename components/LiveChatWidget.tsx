"use client";

import { useState, useEffect, useRef } from "react";
import Icon from "./Icon";

type Props = {
  onClose: () => void;
};

type Message = {
  id: string;
  senderType: "admin" | "user";
  senderName: string;
  content: string;
  createdAt: string;
};

type ConversationForm = {
  userType: "mother" | "doctor" | "";
  name: string;
  phone: string;
  email: string;
};

export default function LiveChatWidget({ onClose }: Props) {
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [adminOnline, setAdminOnline] = useState(false);
  const [formData, setFormData] = useState<ConversationForm>({
    userType: "",
    name: "",
    phone: "",
    email: "",
  });
  const [showForm, setShowForm] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [sessionId, setSessionId] = useState<string>("");

  // Get or create session ID and initialize conversation
  useEffect(() => {
    const initializeChat = async () => {
      let sid = localStorage.getItem("liveChatSessionId");
      if (!sid) {
        // Generate a unique session ID
        sid = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}-${Math.random().toString(36).substring(2, 15)}`;
        localStorage.setItem("liveChatSessionId", sid);
      }
      setSessionId(sid);

      // Check if user is logged in
      const motherToken = localStorage.getItem("motherToken");
      const doctorToken = localStorage.getItem("doctorToken");
      
      if (motherToken || doctorToken) {
        // User is logged in - auto-create or load conversation
        try {
          const token = motherToken || doctorToken || "";
          const payload = JSON.parse(atob(token.split('.')[1]));
          const userType = motherToken ? "mother" : "doctor";
          
          // First, check for existing conversation
          const hasConversation = await checkExistingConversation(sid, payload.id);
          
          if (!hasConversation) {
            // No existing conversation - create one automatically
            await createConversationForLoggedInUser(sid, payload.id, userType, token);
          }
          // If conversation exists, checkExistingConversation already loaded it
        } catch (err) {
          console.error("Error initializing chat for logged-in user:", err);
          // If error, show form as fallback
          setShowForm(true);
        }
      } else {
        // Not logged in - check for existing conversation by session
        const hasConversation = await checkExistingConversation(sid);
        if (!hasConversation) {
          // No conversation found, show form
          setShowForm(true);
        }
      }
    };

    initializeChat();
  }, []);

  const createConversationForLoggedInUser = async (sid: string, userId: string, userType: "mother" | "doctor", token: string) => {
    try {
      setLoading(true);
      const res = await fetch("/api/live-chat/conversations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          userType,
          sessionId: sid,
          // For logged-in users, API will get name/phone/email from profile
          name: "",
          phone: "",
          email: "",
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setConversationId(data.conversation.id);
        setMessages(data.conversation.messages || []);
        setShowForm(false);
        await checkAdminStatus();
        // Load messages to ensure we have the latest
        await loadMessages(data.conversation.id);
      } else {
        const errorData = await res.json().catch(() => ({}));
        console.error("Error creating conversation:", errorData);
        // On error, show form as fallback
        setShowForm(true);
      }
    } catch (err) {
      console.error("Error creating conversation:", err);
      // On error, show form as fallback
      setShowForm(true);
    } finally {
      setLoading(false);
    }
  };

  const checkExistingConversation = async (sid: string, userId?: string): Promise<boolean> => {
    try {
      const token = localStorage.getItem("motherToken") || localStorage.getItem("doctorToken") || "";
      const headers: HeadersInit = { "Content-Type": "application/json" };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      
      const res = await fetch(`/api/live-chat/conversations?sessionId=${sid}${userId ? `&userId=${userId}` : ""}`, {
        headers,
      });
      
      if (res.ok) {
        const data = await res.json();
        if (data.conversations && data.conversations.length > 0) {
          // Use most recent conversation
          const conv = data.conversations.sort((a: any, b: any) => 
            new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime()
          )[0];
          setConversationId(conv.id);
          setMessages(conv.messages || []);
          setShowForm(false);
          await loadMessages(conv.id);
          await checkAdminStatus();
          return true;
        }
      }
      return false;
    } catch (err) {
      console.error("Error checking conversation:", err);
      return false;
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Poll for new messages and admin status
  useEffect(() => {
    if (!conversationId) return;

    const interval = setInterval(async () => {
      await loadMessages(conversationId);
      await checkAdminStatus();
    }, 2000); // Check every 2 seconds

    return () => clearInterval(interval);
  }, [conversationId]);

  const checkAdminStatus = async () => {
    try {
      const res = await fetch("/api/live-chat/admin-status");
      if (res.ok) {
        const data = await res.json();
        setAdminOnline(data.online || false);
      }
    } catch (err) {
      console.error("Error checking admin status:", err);
    }
  };

  const loadMessages = async (convId: string) => {
    try {
      const res = await fetch(`/api/live-chat/conversations/${convId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.conversation) {
          setMessages(data.conversation.messages || []);
        }
      }
    } catch (err) {
      console.error("Error loading messages:", err);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.userType || !formData.name || !formData.phone) {
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/live-chat/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          sessionId,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setConversationId(data.conversation.id);
        setMessages(data.conversation.messages || []);
        setShowForm(false);
        await checkAdminStatus();
      }
    } catch (err) {
      console.error("Error creating conversation:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || !conversationId) return;

    const messageText = inputMessage.trim();
    setInputMessage("");
    setLoading(true);

    try {
      const token = localStorage.getItem("motherToken") || localStorage.getItem("doctorToken") || "";
      const headers: HeadersInit = { "Content-Type": "application/json" };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const res = await fetch(`/api/live-chat/conversations/${conversationId}/messages`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          content: messageText,
          sessionId,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setMessages(data.conversation.messages || []);
        // Reload messages to ensure sync
        if (conversationId) {
          await loadMessages(conversationId);
        }
      } else {
        const errorData = await res.json().catch(() => ({}));
        console.error("Error sending message:", errorData);
        alert("Failed to send message. Please try again.");
        // Restore message text on error
        setInputMessage(messageText);
      }
    } catch (err) {
      console.error("Error sending message:", err);
      alert("Failed to send message. Please try again.");
      // Restore message text on error
      setInputMessage(messageText);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 w-96 h-[600px] bg-white rounded-2xl shadow-2xl border-2 border-pink-200 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-pink-500 to-rose-500 text-white p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon name="chat" size={20} className="brightness-0 invert" />
          <div>
            <h3 className="font-semibold text-white">Live Chat Support</h3>
            <p className="text-xs opacity-90">
              {adminOnline ? (
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 bg-green-300 rounded-full animate-pulse"></span>
                  Admin Online
                </span>
              ) : (
                "We'll respond as soon as possible"
              )}
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-white hover:bg-white/20 rounded-full p-1 transition-colors w-8 h-8 flex items-center justify-center"
          aria-label="Close chat"
        >
          <span className="text-xl font-bold">×</span>
        </button>
      </div>

      {/* Form or Chat */}
      {showForm ? (
        <div className="flex-1 p-4 overflow-y-auto">
          <form onSubmit={handleFormSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                I am a *
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, userType: "mother" })}
                  className={`flex-1 px-4 py-2 rounded-lg border-2 transition-colors ${
                    formData.userType === "mother"
                      ? "bg-pink-100 border-pink-500 text-pink-700"
                      : "border-slate-300 text-slate-700 hover:border-pink-300"
                  }`}
                >
                  Mother
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, userType: "doctor" })}
                  className={`flex-1 px-4 py-2 rounded-lg border-2 transition-colors ${
                    formData.userType === "doctor"
                      ? "bg-blue-100 border-blue-500 text-blue-700"
                      : "border-slate-300 text-slate-700 hover:border-blue-300"
                  }`}
                >
                  Doctor
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Name *
              </label>
              <input
                type="text"
                className="input w-full"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                placeholder="Your name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Contact Number *
              </label>
              <input
                type="tel"
                className="input w-full"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                required
                placeholder="+880 1234 567890"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Email (Optional)
              </label>
              <input
                type="email"
                className="input w-full"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="your@email.com"
              />
            </div>

            <button
              type="submit"
              className="btn-primary w-full"
              disabled={loading || !formData.userType || !formData.name || !formData.phone}
            >
              {loading ? "Starting..." : "Start Chat"}
            </button>
          </form>
        </div>
      ) : (
        <>
          {/* Conversation ID Display and New Conversation Button */}
          {conversationId && (
            <div className="px-4 py-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <p className="text-xs text-slate-600">
                Conversation ID: <span className="font-mono font-semibold">{conversationId}</span>
              </p>
              <button
                onClick={() => {
                  setConversationId(null);
                  setMessages([]);
                  setShowForm(true);
                }}
                className="text-xs px-3 py-1 bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition-colors"
              >
                New Conversation
              </button>
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-gradient-to-b from-slate-50 to-white">
            {messages.length === 0 && conversationId ? (
              <div className="text-center text-slate-500 py-8">
                <p className="mb-4">No messages yet. Start the conversation!</p>
                <button
                  onClick={() => {
                    setShowForm(true);
                    setConversationId(null);
                    setMessages([]);
                  }}
                  className="px-4 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition-colors"
                >
                  Start New Conversation
                </button>
              </div>
            ) : messages.length === 0 ? (
              <div className="text-center text-slate-500 py-8">
                <p className="mb-4">No conversation started yet.</p>
                <button
                  onClick={() => {
                    setShowForm(true);
                  }}
                  className="px-4 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition-colors"
                >
                  Start New Conversation
                </button>
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.senderType === "admin" ? "justify-start" : "justify-end"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg p-3 ${
                      msg.senderType === "admin"
                        ? "bg-white border border-slate-200"
                        : "bg-gradient-to-r from-pink-500 to-rose-500 text-white"
                    }`}
                  >
                    <p className="text-xs font-semibold mb-1 opacity-75">{msg.senderName}</p>
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    <p className="text-xs opacity-60 mt-1">
                      {new Date(msg.createdAt).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form onSubmit={handleSendMessage} className="p-4 border-t border-slate-200 bg-white">
            <div className="flex gap-2">
              <input
                type="text"
                className="input flex-1"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Type your message..."
                disabled={loading}
              />
              <button
                type="submit"
                className="btn-primary px-4"
                disabled={loading || !inputMessage.trim()}
              >
                      <Icon name="submit" size={20} />
              </button>
            </div>
          </form>
        </>
      )}
    </div>
  );
}

