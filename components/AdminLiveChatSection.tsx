"use client";

import { useState, useEffect, useRef } from "react";
import Icon from "./Icon";
import DashboardCard from "./DashboardCard";

type Props = {
  token: string;
};

type Conversation = {
  id: string;
  userId?: string;
  userType?: "mother" | "doctor";
  userName: string;
  userPhone: string;
  userEmail?: string;
  sessionId?: string;
  messages: Message[];
  status: "active" | "closed" | "resolved";
  createdAt: string;
  updatedAt: string;
  lastMessageAt?: string;
};

type Message = {
  id: string;
  senderType: "admin" | "user";
  senderName: string;
  content: string;
  createdAt: string;
  read: boolean;
};

export default function AdminLiveChatSection({ token }: Props) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [inputMessage, setInputMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [searchId, setSearchId] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const headers = () => ({
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  });

  const markMessagesAsRead = async (conversationId: string) => {
    try {
      const res = await fetch(`/api/live-chat/conversations/${conversationId}/mark-read`, {
        method: "POST",
        headers: headers(),
      });
      if (res.ok) {
        // Reload conversation to get updated read status
        loadConversation(conversationId);
        loadConversations();
      }
    } catch (err) {
      console.error("Error marking messages as read:", err);
    }
  };

  useEffect(() => {
    loadConversations();
    // Poll for new conversations and messages
    const interval = setInterval(() => {
      loadConversations();
      if (selectedConversation) {
        loadConversation(selectedConversation.id);
        // Mark messages as read when admin views conversation
        markMessagesAsRead(selectedConversation.id);
      }
    }, 2000); // Every 2 seconds

    return () => clearInterval(interval);
  }, [selectedConversation]);

  // Mark messages as read when conversation is selected
  useEffect(() => {
    if (selectedConversation) {
      markMessagesAsRead(selectedConversation.id);
    }
  }, [selectedConversation?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [selectedConversation?.messages]);

  const loadConversations = async () => {
    try {
      const res = await fetch("/api/live-chat/conversations", { headers: headers() });
      if (res.ok) {
        const data = await res.json();
        const sorted = (data.conversations || []).sort(
          (a: Conversation, b: Conversation) =>
            new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime()
        );
        setConversations(sorted);
        // Don't auto-select - only update if already selected (preserve selection)
        if (selectedConversation) {
          const updated = sorted.find((c: Conversation) => c.id === selectedConversation.id);
          if (updated) {
            // Only update if it's the same conversation (don't change selection)
            setSelectedConversation(prev => {
              if (prev && prev.id === updated.id) {
                return updated; // Update existing selection
              }
              return prev; // Keep current selection
            });
          }
        }
      }
    } catch (err) {
      console.error("Error loading conversations:", err);
    }
  };

  const loadConversation = async (id: string) => {
    try {
      const res = await fetch(`/api/live-chat/conversations/${id}`, { headers: headers() });
      if (res.ok) {
        const data = await res.json();
        // Only update if this is the currently selected conversation
        setSelectedConversation(prev => {
          if (prev && prev.id === id) {
            return data.conversation;
          }
          return prev;
        });
      }
    } catch (err) {
      console.error("Error loading conversation:", err);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || !selectedConversation) return;

    const messageText = inputMessage.trim();
    setInputMessage("");
    setLoading(true);

    try {
      const res = await fetch(`/api/live-chat/conversations/${selectedConversation.id}/messages`, {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({
          content: messageText,
          sessionId: "admin", // Admin doesn't need sessionId but API might expect it
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setSelectedConversation(data.conversation);
        loadConversations(); // Refresh list
      }
    } catch (err) {
      console.error("Error sending message:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchById = async () => {
    if (!searchId.trim()) return;
    try {
      const res = await fetch(`/api/live-chat/conversations?conversationId=${searchId}`, {
        headers: headers(),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.conversation) {
          setSelectedConversation(data.conversation);
        } else {
          alert("Conversation not found");
        }
      }
    } catch (err) {
      console.error("Error searching conversation:", err);
    }
  };

  const activeConversations = conversations.filter(c => c.status === "active");
  const unreadCount = conversations.reduce((count, conv) => {
    return count + conv.messages.filter(m => !m.read && m.senderType === "user").length;
  }, 0);

  return (
    <div className="space-y-6">
      <DashboardCard title={
        <span className="flex items-center gap-2">
          <Icon name="chat" size={24} />
          Live Chat Support
          {unreadCount > 0 && (
            <span className="ml-2 px-2 py-1 bg-red-500 text-white text-xs font-bold rounded-full">
              {unreadCount} unread
            </span>
          )}
        </span>
      }>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[600px]">
          {/* Conversations List */}
          <div className="lg:col-span-1 border-r border-slate-200 pr-4 overflow-y-auto">
            <div className="mb-4">
              <div className="flex gap-2 items-center">
                <input
                  type="text"
                  className="flex-1 text-sm h-9 px-3 rounded-lg border-2 border-neutral-200 bg-white shadow-sm transition-all duration-200 focus:border-pink-400 focus:outline-none focus:ring-2 focus:ring-pink-100 hover:border-neutral-300 placeholder:text-neutral-400"
                  placeholder="Search by Conversation ID..."
                  value={searchId}
                  onChange={(e) => setSearchId(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleSearchById();
                    }
                  }}
                />
                <button
                  onClick={handleSearchById}
                  className="px-3 h-9 rounded-lg bg-white border-2 border-neutral-200 text-neutral-600 hover:bg-pink-50 hover:border-pink-300 transition-all duration-200 flex items-center justify-center min-w-[36px]"
                  title="Search"
                  type="button"
                >
                  <span className="text-lg">🔍</span>
                </button>
              </div>
            </div>

            <div className="space-y-2">
              {activeConversations.length === 0 ? (
                <p className="text-slate-500 text-center py-8">No active conversations</p>
              ) : (
                activeConversations.map((conv) => {
                  const unread = conv.messages.filter(m => !m.read && m.senderType === "user").length;
                  const lastMessage = conv.messages[conv.messages.length - 1];
                  return (
                    <button
                      key={conv.id}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        // Only set if different conversation
                        if (selectedConversation?.id !== conv.id) {
                          setSelectedConversation(conv);
                          // Mark messages as read when conversation is selected
                          markMessagesAsRead(conv.id);
                        }
                      }}
                      className={`w-full text-left p-3 rounded-lg border-2 transition-all ${
                        selectedConversation?.id === conv.id
                          ? "border-pink-500 bg-pink-50"
                          : "border-slate-200 hover:border-pink-300 bg-white"
                      }`}
                    >
                      <div className="flex items-start justify-between mb-1">
                        <p className="font-semibold text-slate-800">{conv.userName}</p>
                        {unread > 0 && (
                          <span className="px-2 py-0.5 bg-red-500 text-white text-xs font-bold rounded-full">
                            {unread}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-600 mb-1">
                        {conv.userType === "mother" ? "👩 Mother" : "👨‍⚕️ Doctor"}
                      </p>
                      {lastMessage && (
                        <p className="text-xs text-slate-500 line-clamp-1">{lastMessage.content}</p>
                      )}
                      <p className="text-xs text-slate-400 mt-1">
                        ID: <span className="font-mono">{conv.id.substring(0, 8)}...</span>
                      </p>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Chat Area */}
          <div className="lg:col-span-2 flex flex-col">
            {selectedConversation ? (
              <>
                {/* Chat Header */}
                <div className="border-b border-slate-200 pb-4 mb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-bold text-slate-800">{selectedConversation.userName}</h3>
                      <p className="text-sm text-slate-600">
                        {selectedConversation.userPhone}
                        {selectedConversation.userEmail && ` • ${selectedConversation.userEmail}`}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        Conversation ID: <span className="font-mono font-semibold">{selectedConversation.id}</span>
                      </p>
                      {selectedConversation.userId && (
                        <p className="text-xs text-slate-500">
                          User ID: <span className="font-mono">{selectedConversation.userId}</span>
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        selectedConversation.status === "active"
                          ? "bg-green-100 text-green-700"
                          : "bg-slate-100 text-slate-700"
                      }`}>
                        {selectedConversation.status}
                      </span>
                      <button
                        onClick={async () => {
                          if (confirm("Are you sure you want to delete this conversation? This action cannot be undone.")) {
                            try {
                              const res = await fetch(`/api/live-chat/conversations/${selectedConversation.id}`, {
                                method: "DELETE",
                                headers: headers(),
                              });
                              if (res.ok) {
                                setSelectedConversation(null);
                                loadConversations();
                              } else {
                                alert("Failed to delete conversation");
                              }
                            } catch (err) {
                              console.error("Error deleting conversation:", err);
                              alert("Failed to delete conversation");
                            }
                          }
                        }}
                        className="px-3 py-1 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-xs font-semibold"
                        title="Delete Conversation"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto space-y-3 mb-4 bg-gradient-to-b from-slate-50 to-white p-4 rounded-lg">
                  {selectedConversation.messages.length === 0 ? (
                    <div className="text-center text-slate-500 py-8">
                      <p>No messages yet. Start the conversation!</p>
                    </div>
                  ) : (
                    selectedConversation.messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex ${msg.senderType === "admin" ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[75%] rounded-lg p-3 ${
                            msg.senderType === "admin"
                              ? "bg-gradient-to-r from-pink-500 to-rose-500 text-white"
                              : "bg-white border border-slate-200"
                          }`}
                        >
                          <p className="text-xs font-semibold mb-1 opacity-75">{msg.senderName}</p>
                          <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                          <p className="text-xs opacity-60 mt-1">
                            {new Date(msg.createdAt).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <form onSubmit={handleSendMessage} className="border-t border-slate-200 pt-4">
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
                      className="btn-primary px-6"
                      disabled={loading || !inputMessage.trim()}
                    >
                      {loading ? "Sending..." : (
                        <span className="flex items-center gap-2">
                          <Icon name="submit" size={18} />
                          Send
                        </span>
                      )}
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-slate-500">
                <div className="text-center">
                  <Icon name="chat" size={48} className="mx-auto mb-4 opacity-50" />
                  <p>Select a conversation to start chatting</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </DashboardCard>
    </div>
  );
}

