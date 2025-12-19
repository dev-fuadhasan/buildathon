"use client";

import { useEffect, useState, useRef } from "react";
import ChatBubble from "@/components/ChatBubble";
import ChatInput from "@/components/ChatInput";
import ChatPrescriptionUpload from "@/components/ChatPrescriptionUpload";
import Layout from "@/components/Layout";
import Icon from "@/components/Icon";
import Link from "next/link";
import { useTranslation } from "@/hooks/useTranslation";
import { getLanguage } from "@/lib/i18n";
import { useEmbedding } from '@/hooks/useEmbedding';

type Message = { role: "user" | "assistant"; content: string; imageUrl?: string };

type ConversationListItem = {
  id: string;
  title: string;
  updatedAt: string;
};

export default function ChatPage() {
  const [lang] = useState(() => getLanguage());
  
  const initialMessage = lang === "bn" 
    ? "হাই! আমি MomsCare AI, আপনার ২৪/৭ গর্ভাবস্থা সহায়ক। আপনার গর্ভাবস্থার যাত্রা সম্পর্কে যেকোনো কিছু জিজ্ঞাসা করুন!"
    : "Hi! I'm MomsCare AI, your 24/7 pregnancy assistant. Ask me anything about your pregnancy journey!";
  
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

  // Embedding hook for browser WASM
  const { embed, isModelReady, isLoading: modelLoading, progress: modelProgress } = useEmbedding();

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
    
    // Add user message with optional image
    const newMessages = [...messages, { 
      role: "user" as const, 
      content: text,
      imageUrl: uploadedImageUrl || undefined
    }];
    setMessages(newMessages);
    setLoading(true);
    
    // Clear attached image after sending
    setAttachedImage(null);
    
    try {
      // Ensure client embedding is available (no server-side embedding)
      if (!isModelReady) {
        const waitingMsg = lang === "bn" ? 'মডেল ডাউনলোড হচ্ছে, অনুগ্রহ করে অপেক্ষা করুন...' : 'Model downloading — please wait...';
        setMessages(prev => [...prev, { role: 'assistant', content: waitingMsg }]);
        setLoading(false);
        return;
      }

      // Generate client embedding (browser WASM)
      let clientEmbedding: number[] | null = null;
      try {
        const e = await embed(text, true);
        if (Array.isArray(e) && e.length === 384) {
          clientEmbedding = e;
        } else {
          throw new Error('Embedding dimension mismatch or null');
        }
      } catch (err) {
        console.error('Embedding generation failed:', err);
        const errMsg = lang === 'bn' ? 'এম্বেডিং তৈরি করা যায়নি, অনুগ্রহ করে আবার চেষ্টা করুন।' : 'Failed to generate embedding, please try again.';
        setMessages(prev => [...prev, { role: 'assistant', content: `❌ ${errMsg}` }]);
        setLoading(false);
        return;
      }
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
          embedding: clientEmbedding, // include required 384-d embedding
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
      
      // Stop loading immediately after showing response
      setLoading(false);
      
      // Save to conversation in background (don't block UI)
      if (isMother && conversationId) {
        saveMessagesToConversation(finalMessages, conversationId).catch((err) => {
          console.error("Background conversation save failed:", err);
          // Silent failure - user already has their response
        });
      }
    } catch (err: any) {
      console.error("Chat error:", err);
      let errorMessage = err.message || "Sorry, something went wrong. Please try again.";
      
      // Better error messages for network issues
      if (err.message === "Failed to fetch" || err.message?.includes("fetch")) {
        errorMessage = lang === "bn" 
          ? "নেটওয়ার্ক ত্রুটি: অনুগ্রহ করে আপনার ইন্টারনেট সংযোগ পরীক্ষা করুন। চ্যাটবটের জন্য ইন্টারনেট প্রয়োজন।"
          : "Network Error: Please check your internet connection. The chatbot needs internet to generate AI responses.";
      }
      
      const errorMessages = [
        ...newMessages,
        { role: "assistant" as const, content: `❌ ${errorMessage}` },
      ];
      setMessages(errorMessages);
      setLoading(false); // Also stop loading on error
    }
  };

  return (
    <Layout>
      <div className="flex h-[calc(100vh-80px)] sm:h-[calc(100vh-120px)] md:h-[calc(100vh-140px)] max-w-7xl mx-auto gap-0 sm:gap-2 px-0 sm:px-2 md:px-4">
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
        <div className="flex-1 flex flex-col min-w-0 gap-1 sm:gap-1.5 px-1 sm:px-0">
          {/* Header - Compact Design */}
          <div className="flex items-center justify-between flex-shrink-0 py-1">
            <div className="flex items-center gap-1.5 sm:gap-2">
              {/* Mobile Menu Button - Only for logged-in mothers */}
              {isMother && (
                <button
                  onClick={() => setShowSidebar(true)}
                  className="lg:hidden p-1.5 hover:bg-slate-100 rounded-md transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
              )}
              <div className="flex items-center gap-1.5 sm:gap-2">
                <h1 className="text-sm sm:text-base md:text-lg font-bold bg-gradient-to-r from-pink-600 to-pink-500 bg-clip-text text-transparent leading-none">
                  MomsCare AI
                </h1>
                <span className="flex items-center gap-1 text-[10px] sm:text-xs text-slate-500 bg-slate-50 px-1.5 py-0.5 rounded-full border border-slate-200">
                  <Icon name={isMother ? "ai" : "chat"} size={10} className="sm:w-3 sm:h-3" />
                  {isMother ? "Personalized" : "Public"}
                </span>
              </div>
            </div>
            {!isMother && (
              <Link href="/mother/login" className="btn-secondary text-[9px] sm:text-xs px-1.5 sm:px-3 py-0.5 sm:py-1 whitespace-nowrap text-center min-w-[40px] sm:min-w-[60px]">
                Login
              </Link>
            )}
          </div>

          {/* Safety Disclaimer - Ultra Compact */}
          <div className="rounded-md bg-yellow-50 border border-yellow-200 px-2 py-1 flex-shrink-0">
            <p className="flex items-start gap-1 text-[10px] sm:text-xs text-yellow-900 leading-tight">
              <Icon name="warning" size={12} className="mt-0.5 flex-shrink-0 opacity-70" />
              <span>
                <strong className="font-semibold">Note:</strong> AI provides general info only. For emergencies, contact your provider.
              </span>
            </p>
          </div>

          {/* Main Chat Container */}
          <div className="flex-1 flex flex-col min-h-0 bg-white rounded-lg sm:rounded-xl shadow-lg border border-slate-200 overflow-hidden">
            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-2 sm:p-3 md:p-4 space-y-2 sm:space-y-3 bg-gradient-to-b from-slate-50 to-white min-h-0">
              {messages.map((msg, idx) => (
                <ChatBubble 
                  key={idx} 
                  role={msg.role} 
                  content={msg.content}
                  imageUrl={msg.imageUrl}
                />
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
              {/* Model download progress (visible to all users) */}
              {modelLoading && (
                <div className="mb-2">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs text-gray-600">Model downloading (WASM)</p>
                    <p className="text-xs text-gray-600">{modelProgress}%</p>
                  </div>
                  <div className="w-full h-2 bg-gray-200 rounded overflow-hidden">
                    <div className="h-2 bg-blue-500" style={{ width: `${modelProgress}%` }} />
                  </div>
                </div>
              )}
              {/* Combined Chat Input with Image Attachment */}
              <ChatInput 
                onSend={sendMessage} 
                disabled={loading}
                onImageSelect={handleImageSelect}
                onImageRemove={handleImageRemove}
                currentImage={attachedImage}
              />
              
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
