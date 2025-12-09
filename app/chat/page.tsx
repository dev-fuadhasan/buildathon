"use client";

import { useEffect, useState, useRef } from "react";
import ChatBubble from "@/components/ChatBubble";
import ChatInput from "@/components/ChatInput";
import ChatPrescriptionUpload from "@/components/ChatPrescriptionUpload";
import ChatImageAttachment from "@/components/ChatImageAttachment";
import Layout from "@/components/Layout";
import Icon from "@/components/Icon";
import Link from "next/link";
import { useTranslation } from "@/hooks/useTranslation";
import { getLanguage } from "@/lib/i18n";

type Message = { role: "user" | "assistant"; content: string };

type ConversationListItem = {
  id: string;
  title: string;
  updatedAt: string;
};

export default function ChatPage() {
  const [lang] = useState(() => getLanguage());
  
  const initialMessage = lang === "bn" 
    ? "হাই! আমি MomsCare, আপনার AI গর্ভাবস্থা সহায়ক। আপনার গর্ভাবস্থার যাত্রা সম্পর্কে যেকোনো কিছু জিজ্ঞাসা করুন!"
    : "Hi! I'm MomsCare, your AI pregnancy assistant. Ask me anything about your pregnancy journey!";
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [isMother, setIsMother] = useState(false);
  const [motherToken, setMotherToken] = useState("");
  const [uploadMessage, setUploadMessage] = useState("");
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<ConversationListItem[]>([]);
  const [showSidebar, setShowSidebar] = useState(false);
  const [attachedImage, setAttachedImage] = useState<{ file: File; preview: string } | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Check if user is logged in
  useEffect(() => {
    const token = localStorage.getItem("motherToken") || "";
    setMotherToken(token);
    setIsMother(!!token);
    
    if (token) {
      loadConversations(token);
    }
    
    // Always start with initial message (fresh chat)
    setMessages([{
      role: "assistant",
      content: initialMessage,
    }]);
  }, []);

  const loadConversations = async (token: string) => {
    try {
      const res = await fetch("/api/mother/conversations", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      if (res.ok) {
        const data = await res.json();
        setConversations(data.conversations || []);
      }
    } catch (err) {
      console.error("Failed to load conversations:", err);
    }
  };

  const loadConversation = async (conversationId: string) => {
    if (!motherToken) return;
    
    try {
      const res = await fetch(`/api/mother/conversations/${conversationId}`, {
        headers: {
          Authorization: `Bearer ${motherToken}`,
        },
      });
      
      if (res.ok) {
        const data = await res.json();
        const conversation = data.conversation;
        
        // Convert stored messages to display format
        const displayMessages = conversation.messages.map((m: any) => ({
          role: m.role,
          content: m.content,
        }));
        
        setMessages(displayMessages);
        setCurrentConversationId(conversationId);
        setShowSidebar(false); // Close sidebar on mobile
      }
    } catch (err) {
      console.error("Failed to load conversation:", err);
    }
  };

  const deleteConversation = async (conversationId: string) => {
    if (!motherToken) return;
    
    if (!confirm(lang === "bn" ? "এই কথোপকথন মুছে ফেলবেন?" : "Delete this conversation?")) {
      return;
    }
    
    try {
      const res = await fetch(`/api/mother/conversations/${conversationId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${motherToken}`,
        },
      });
      
      if (res.ok) {
        // Remove from list
        setConversations(conversations.filter(c => c.id !== conversationId));
        
        // If deleted current conversation, reset to fresh chat
        if (currentConversationId === conversationId) {
          setCurrentConversationId(null);
          setMessages([{
            role: "assistant",
            content: initialMessage,
          }]);
        }
      }
    } catch (err) {
      console.error("Failed to delete conversation:", err);
    }
  };

  const startNewConversation = () => {
    setCurrentConversationId(null);
    setMessages([{
      role: "assistant",
      content: initialMessage,
    }]);
    setShowSidebar(false); // Close sidebar on mobile
  };

  const saveMessagesToConversation = async (msgs: Message[], conversationId: string) => {
    if (!isMother || !motherToken) return;
    
    try {
      const messagesWithTimestamp = msgs.map((m) => ({
        role: m.role,
        content: m.content,
        timestamp: new Date().toISOString(),
      }));
      
      await fetch(`/api/mother/conversations/${conversationId}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${motherToken}`,
        },
        body: JSON.stringify({ messages: messagesWithTimestamp }),
      });
      
      // Reload conversations list to update timestamp
      loadConversations(motherToken);
    } catch (err) {
      console.error("Failed to save messages:", err);
    }
  };

  const getToken = () =>
    localStorage.getItem("motherToken") ||
    localStorage.getItem("doctorToken") ||
    "";

  // Upload image to R2 storage (for both logged-in and logged-out users)
  const uploadImageToStorage = async (file: File): Promise<string | null> => {
    try {
      const formData = new FormData();
      formData.append("file", file);
      
      const endpoint = isMother 
        ? "/api/mother/chat-images" // User-specific folder
        : "/api/chat-images"; // Temporary/guest folder
      
      const res = await fetch(endpoint, {
        method: "POST",
        headers: isMother ? { Authorization: `Bearer ${motherToken}` } : {},
        body: formData,
      });
      
      if (res.ok) {
        const data = await res.json();
        return data.url;
      }
      return null;
    } catch (err) {
      console.error("Image upload failed:", err);
      return null;
    }
  };

  // Handle image selection
  const handleImageSelect = (imageData: { file: File; preview: string }) => {
    setAttachedImage(imageData);
  };

  // Handle image removal
  const handleImageRemove = () => {
    setAttachedImage(null);
    setImageUrl(null);
  };

  const sendMessage = async (text: string) => {
    // Upload image first if attached
    let uploadedImageUrl: string | null = null;
    if (attachedImage) {
      uploadedImageUrl = await uploadImageToStorage(attachedImage.file);
      if (!uploadedImageUrl) {
        alert(lang === "bn" ? "ছবি আপলোড ব্যর্থ হয়েছে" : "Image upload failed");
        return;
      }
    }
    
    const newMessages = [...messages, { role: "user" as const, content: text }];
    setMessages(newMessages);
    setLoading(true);
    
    // Clear attached image after sending
    setAttachedImage(null);
    
    try {
      // If this is first message in new conversation for logged-in mother, create conversation
      let conversationId = currentConversationId;
      
      if (isMother && !conversationId) {
        // Create new conversation with first user message
        const createRes = await fetch("/api/mother/conversations", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${motherToken}`,
          },
          body: JSON.stringify({ firstMessage: text }),
        });
        
        if (createRes.ok) {
          const createData = await createRes.json();
          conversationId = createData.conversation.id;
          setCurrentConversationId(conversationId);
          
          // Reload conversations list
          loadConversations(motherToken);
        }
      }
      
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
        },
        body: JSON.stringify({
          messages: newMessages,
          imageUrl: uploadedImageUrl, // Send image URL with message
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

      const finalMessages = [...newMessages, { role: "assistant" as const, content: data.reply }];
      setMessages(finalMessages);
      
      // Save to conversation if logged in and conversation exists
      if (isMother && conversationId) {
        await saveMessagesToConversation(finalMessages, conversationId);
      }
    } catch (err: any) {
      console.error("Chat error:", err);
      const errorMessage = err.message || "Sorry, something went wrong. Please try again.";
      const errorMessages = [
        ...newMessages,
        { role: "assistant" as const, content: `❌ Error: ${errorMessage}` },
      ];
      setMessages(errorMessages);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="flex h-[calc(100vh-80px)] sm:h-[calc(100vh-120px)] md:h-[calc(100vh-140px)] max-w-7xl mx-auto gap-0 sm:gap-2 md:gap-3 px-0 sm:px-2 md:px-4">
        {/* Conversation History Sidebar - Only for logged-in mothers */}
        {isMother && (
          <>
            {/* Mobile Overlay */}
            {showSidebar && (
              <div
                className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                onClick={() => setShowSidebar(false)}
              />
            )}
            
            {/* Sidebar */}
            <div className={`
              fixed lg:relative top-0 left-0 h-full lg:h-auto
              w-64 sm:w-72 lg:w-80
              bg-white border-r border-slate-200 
              flex flex-col z-50
              transform transition-transform duration-300
              ${showSidebar ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
            `}>
              {/* Sidebar Header */}
              <div className="p-3 sm:p-4 border-b border-slate-200 flex-shrink-0">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-base sm:text-lg font-bold text-slate-800">
                    {lang === "bn" ? "চ্যাট ইতিহাস" : "Chat History"}
                  </h2>
                  <button
                    onClick={() => setShowSidebar(false)}
                    className="lg:hidden p-1.5 hover:bg-slate-100 rounded-lg"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                
                {/* New Chat Button */}
                <button
                  onClick={startNewConversation}
                  className="w-full btn-primary text-sm py-2 flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  {lang === "bn" ? "নতুন চ্যাট" : "New Chat"}
                </button>
              </div>
              
              {/* Conversations List */}
              <div className="flex-1 overflow-y-auto p-2 sm:p-3 space-y-1">
                {conversations.length === 0 ? (
                  <div className="text-center py-8 text-slate-400 text-sm">
                    {lang === "bn" ? "কোন ইতিহাস নেই" : "No history yet"}
                  </div>
                ) : (
                  conversations.map((conv) => (
                    <div
                      key={conv.id}
                      className={`group relative rounded-lg border transition-all ${
                        currentConversationId === conv.id
                          ? 'bg-pink-50 border-pink-200'
                          : 'bg-white border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <button
                        onClick={() => loadConversation(conv.id)}
                        className="w-full text-left p-2.5 sm:p-3"
                      >
                        <div className="flex items-start gap-2">
                          <Icon name="chat" size={16} className="flex-shrink-0 mt-0.5 text-pink-500" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs sm:text-sm font-medium text-slate-800 line-clamp-2 mb-1">
                              {conv.title}
                            </p>
                            <p className="text-xs text-slate-500">
                              {new Date(conv.updatedAt).toLocaleDateString(lang === "bn" ? "bn-BD" : "en-US", {
                                month: "short",
                                day: "numeric",
                              })}
                            </p>
                          </div>
                        </div>
                      </button>
                      
                      {/* Delete Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteConversation(conv.id);
                        }}
                        className="absolute top-2 right-2 p-1.5 rounded-md bg-white/80 hover:bg-red-50 text-slate-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-all"
                        title={lang === "bn" ? "মুছে ফেলুন" : "Delete"}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        )}
        
        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col min-w-0 gap-1 sm:gap-2 md:gap-3 px-1 sm:px-0">
          {/* Header */}
          <div className="flex items-center justify-between flex-shrink-0 py-1 sm:py-2">
            <div className="flex items-center gap-2">
              {/* Mobile Menu Button - Only for logged-in mothers */}
              {isMother && (
                <button
                  onClick={() => setShowSidebar(true)}
                  className="lg:hidden p-2 hover:bg-slate-100 rounded-lg"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
              )}
              <div>
                <h1 className="text-lg sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-pink-600 to-pink-500 bg-clip-text text-transparent">
                  MomsCare AI Chat
                </h1>
                <p className="text-xs sm:text-sm text-slate-600 mt-0.5 hidden sm:block">
                  <span className="flex items-center gap-2">
                    <Icon name={isMother ? "ai" : "chat"} size={16} className="sm:w-5 sm:h-5" />
                    {isMother ? "Personalized" : "Public"}
                  </span>
                </p>
              </div>
            </div>
            {!isMother && (
              <Link href="/mother/login" className="btn-secondary text-xs sm:text-sm px-2 sm:px-4 py-1.5 sm:py-2 hidden sm:inline-flex">
                Login for Personalized
              </Link>
            )}
          </div>

          {/* Safety Disclaimer */}
          <div className="rounded-lg bg-gradient-to-r from-yellow-50 to-amber-50 border border-yellow-200 p-1.5 sm:p-2 md:p-2.5 shadow-sm flex-shrink-0 hidden sm:block">
            <p className="text-xs text-yellow-900 font-medium">
              <span className="flex items-start gap-1.5 sm:gap-2">
                <Icon name="warning" size={16} className="sm:w-5 sm:h-5 mt-0.5 flex-shrink-0" />
                <span className="text-xs sm:text-sm">
                  <strong>Important:</strong> This AI chatbot provides general information and is not a substitute for professional medical advice. For emergencies, contact your healthcare provider immediately.
                </span>
              </span>
            </p>
          </div>

          {/* Main Chat Container */}
          <div className="flex-1 flex flex-col min-h-0 bg-white rounded-xl sm:rounded-2xl shadow-xl sm:shadow-2xl border border-slate-200 overflow-hidden">
            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6 space-y-3 sm:space-y-4 bg-gradient-to-b from-slate-50 to-white min-h-0">
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
                uploadMessage.includes("successfully") || uploadMessage.includes("Success") 
                  ? "bg-green-50 text-green-800 border border-green-200" 
                  : "bg-red-50 text-red-800 border border-red-200"
              }`}>
                <p className="text-sm font-medium">{uploadMessage}</p>
              </div>
            )}

            {/* Input Section */}
            <div className="border-t border-slate-200 bg-white p-2 sm:p-3 flex-shrink-0">
              {/* Image Attachment - For ALL users */}
              <div className="mb-2">
                <ChatImageAttachment
                  onImageSelect={handleImageSelect}
                  onImageRemove={handleImageRemove}
                  currentImage={attachedImage}
                  disabled={loading}
                />
              </div>
              
              <ChatInput onSend={sendMessage} disabled={loading} />
              
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
                        let data: any = {};
                        try {
                          const text = await res.text();
                          data = text ? JSON.parse(text) : {};
                        } catch {
                          // If parsing fails, use empty object
                        }
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
      </div>
    </Layout>
  );
}
