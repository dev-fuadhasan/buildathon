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
import { preprocessMarkdown } from "@/lib/markdownPreprocessor";

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
  
  // Incremental markdown preprocessing for streaming
  const preprocessMarkdownIncremental = (content: string): string => {
    // Apply preprocessing but be gentle with partial markdown
    // Don't break incomplete markdown structures
    try {
      // Pass isStreaming=true to be more lenient with partial content
      return preprocessMarkdown(content, true);
    } catch (error) {
      // If preprocessing fails, return content as-is
      console.error("Markdown preprocessing error:", error);
      return content;
    }
  };

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
      // Try to generate client embedding (browser WASM), but don't block if unavailable
      let clientEmbedding: number[] | null = null;
      let embeddingAvailable = true;
      
      if (!isModelReady && modelLoading) {
        // Model is still loading - wait briefly for it
        const waitingMsg = lang === "bn" ? 'মডেল ডাউনলোড হচ্ছে, অনুগ্রহ করে অপেক্ষা করুন...' : 'Model downloading — please wait...';
        console.log('[Chat] Model not ready yet, skipping embedding generation');
        embeddingAvailable = false;
      } else if (isModelReady) {
        // Model is ready, try to generate embedding
        try {
          const e = await embed(text, true);
          if (Array.isArray(e) && e.length === 384) {
            clientEmbedding = e;
            console.log('[Chat] Generated 384-d embedding successfully');
          } else {
            console.warn('[Chat] Embedding dimension mismatch, received:', e?.length);
            embeddingAvailable = false;
          }
        } catch (err) {
          console.error('[Chat] Embedding generation failed:', err);
          embeddingAvailable = false;
        }
      } else {
        // Model failed to load
        console.warn('[Chat] Embedding model unavailable, proceeding without semantic search');
        embeddingAvailable = false;
      }
      
      if (!embeddingAvailable) {
        console.warn('[Chat] ⚠️ Proceeding with chat without client embeddings (semantic search disabled)');
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
      
      // Use streaming by default
      const res = await fetch("/api/chat?stream=true", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "text/event-stream",
          ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
        },
        body: JSON.stringify({
          messages: newMessages,
          imageUrl: uploadedImageUrl,
          embedding: clientEmbedding || undefined,
        }),
      });

      if (!res.ok) {
        // Try to parse error as JSON, fallback to text
        const errorText = await res.text();
        let errorData: any = {};
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { error: errorText || `HTTP ${res.status}` };
        }
        throw new Error(errorData.message || errorData.error || `HTTP ${res.status}`);
      }

      // Check if response is streaming
      const contentType = res.headers.get("content-type");
      const isStreaming = contentType?.includes("text/event-stream");

      if (isStreaming) {
        // STREAMING MODE: Process chunks as they arrive
        const reader = res.body?.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let accumulatedContent = "";
        
        // Add assistant message placeholder that will be updated
        const assistantMessageId = Date.now();
        setMessages([...newMessages, { 
          role: "assistant" as const, 
          content: "",
          _isStreaming: true,
          _id: assistantMessageId
        } as any]);
        
        if (!reader) {
          throw new Error("No response body");
        }
        
        let streamComplete = false;
        try {
          while (true) {
            const { done, value } = await reader.read();
            
            if (done) break;
            
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n\n");
            buffer = lines.pop() || ""; // Keep incomplete line in buffer
            
            for (const line of lines) {
              if (line.startsWith("data: ")) {
                try {
                  const data = JSON.parse(line.slice(6));
                  
                  if (data.error) {
                    throw new Error(data.error);
                  }
                  
                  if (data.chunk) {
                    accumulatedContent += data.chunk;
                    
                    // Update the assistant message with accumulated content
                    // Apply incremental markdown preprocessing
                    const processedContent = preprocessMarkdownIncremental(accumulatedContent);
                    
                    setMessages(prev => {
                      const updated = [...prev];
                      const assistantIndex = updated.findIndex((m: any) => m._id === assistantMessageId);
                      if (assistantIndex >= 0) {
                        updated[assistantIndex] = {
                          ...updated[assistantIndex],
                          content: processedContent,
                        };
                      }
                      return updated;
                    });
                    
                    // Auto-scroll to bottom as content streams in
                    setTimeout(() => scrollToBottom(), 50);
                  }
                  
                  if (data.done) {
                    // Streaming complete - finalize message
                    streamComplete = true;
                    setMessages(prev => {
                      const updated = [...prev];
                      const assistantIndex = updated.findIndex((m: any) => m._id === assistantMessageId);
                      if (assistantIndex >= 0) {
                        const final = updated[assistantIndex];
                        delete (final as any)._isStreaming;
                        delete (final as any)._id;
                        updated[assistantIndex] = {
                          role: "assistant",
                          content: accumulatedContent.trim(),
                        };
                      }
                      return updated;
                    });
                    
                    setLoading(false);
                    
                    // Save to conversation in background
                    if (isMother && conversationId) {
                      const finalMessages = [...newMessages, { 
                        role: "assistant" as const, 
                        content: accumulatedContent.trim() 
                      }];
                      saveMessagesToConversation(finalMessages, conversationId).catch((err) => {
                        console.error("Background conversation save failed:", err);
                      });
                    }
                    
                    break; // Exit inner loop
                  }
                } catch (parseError) {
                  console.error("Failed to parse SSE data:", parseError);
                }
              }
            }
            
            // Exit outer loop if streaming is complete
            if (streamComplete) break;
          }
        } catch (streamError: any) {
          console.error("Streaming error:", streamError);
          setLoading(false);
          
          // Show error message
          const errorMessages = [
            ...newMessages,
            { role: "assistant" as const, content: `❌ ${streamError.message || "Streaming error occurred"}` },
          ];
          setMessages(errorMessages);
        } finally {
          reader.releaseLock();
        }
      } else {
        // NON-STREAMING MODE (fallback)
        const data = await res.json();
        if (!data.reply) {
          throw new Error("No reply received from server");
        }

        const finalMessages = [...newMessages, { role: "assistant" as const, content: data.reply }];
        setMessages(finalMessages);
        setLoading(false);
        
        if (isMother && conversationId) {
          saveMessagesToConversation(finalMessages, conversationId).catch((err) => {
            console.error("Background conversation save failed:", err);
          });
        }
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
      <div className="flex h-[calc(100vh-56px)] sm:h-[calc(100vh-80px)] md:h-[calc(100vh-100px)] max-w-7xl mx-auto gap-0 sm:gap-4 px-0 sm:px-4 no-select overflow-hidden">
        {/* Conversation History Sidebar - Only for logged-in mothers */}
        {isMother && (
          <>
            {/* Mobile Overlay */}
            {showSidebar && (
              <div
                className="fixed inset-0 bg-black/60 z-[60] lg:hidden backdrop-blur-md animate-fade-in"
                onClick={() => setShowSidebar(false)}
              />
            )}
            
            {/* Sidebar */}
            <div className={`
              fixed lg:relative top-0 left-0 h-full lg:h-auto
              w-[280px] sm:w-72 lg:w-80
              bg-white border-r border-slate-200 
              flex flex-col z-[70] lg:z-10
              transform transition-transform duration-500 cubic-bezier(0.4, 0, 0.2, 1)
              shadow-2xl lg:shadow-none
              ${showSidebar ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
            `}>
              {/* Sidebar Header */}
              <div className="p-4 sm:p-6 border-b border-slate-100 flex-shrink-0 bg-white">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-black text-neutral-900 tracking-tight">
                    {lang === "bn" ? "চ্যাট ইতিহাস" : "Chat History"}
                  </h2>
                  <button
                    onClick={() => setShowSidebar(false)}
                    className="lg:hidden p-2 hover:bg-neutral-50 rounded-2xl transition-all active:scale-90 tap-highlight-none"
                    aria-label="Close sidebar"
                  >
                    <Icon name="close" size={24} className="opacity-40" />
                  </button>
                </div>
                
                {/* New Chat Button */}
                <button
                  onClick={startNewConversation}
                  className="w-full btn-primary py-3.5 rounded-2xl flex items-center justify-center gap-3 font-black shadow-pink-100 active:scale-95 tap-highlight-none"
                >
                  <Icon name="add" size={20} className="brightness-0 invert" />
                  {lang === "bn" ? "নতুন চ্যাট" : "New Chat"}
                </button>
              </div>
              
              {/* Conversations List */}
              <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2 scrollbar-hide">
                {conversations.length === 0 ? (
                  <div className="text-center py-12 flex flex-col items-center gap-4 opacity-30">
                    <Icon name="chat" size={48} className="brightness-0" />
                    <p className="text-sm font-bold tracking-widest uppercase">
                    {lang === "bn" ? "কোন ইতিহাস নেই" : "No history yet"}
                    </p>
                  </div>
                ) : (
                  conversations.map((conv) => (
                    <div
                      key={conv.id}
                      className={`group relative rounded-2xl transition-all duration-300 ${
                        currentConversationId === conv.id
                          ? 'bg-pink-50 ring-2 ring-pink-500/20'
                          : 'bg-white hover:bg-neutral-50'
                      }`}
                    >
                      <button
                        onClick={() => loadConversation(conv.id)}
                        className="w-full text-left p-4 tap-highlight-none"
                      >
                        <div className="flex items-start gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                            currentConversationId === conv.id ? 'bg-pink-500 text-white' : 'bg-neutral-100'
                          }`}>
                            <Icon name="chat" size={18} className={currentConversationId === conv.id ? 'brightness-0 invert' : 'opacity-40'} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-bold truncate mb-1 ${
                              currentConversationId === conv.id ? 'text-pink-700' : 'text-neutral-900'
                            }`}>
                              {conv.title}
                            </p>
                            <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">
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
                        className="absolute top-1/2 -translate-y-1/2 right-3 p-2 rounded-xl bg-white shadow-sm hover:bg-red-50 text-red-500 opacity-0 group-hover:opacity-100 transition-all active:scale-90 tap-highlight-none border border-neutral-100"
                        title={lang === "bn" ? "মুছে ফেলুন" : "Delete"}
                      >
                        <Icon name="delete" size={16} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        )}
        
        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col min-w-0 bg-neutral-50">
          {/* Header - App-style Design */}
          <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-neutral-100 flex-shrink-0">
            <div className="flex items-center gap-3">
              {/* Mobile Menu Button - Only for logged-in mothers */}
              {isMother && (
                <button
                  onClick={() => setShowSidebar(true)}
                  className="lg:hidden p-2 rounded-xl bg-neutral-50 text-neutral-600 hover:bg-pink-50 hover:text-pink-600 active:scale-90 transition-all tap-highlight-none"
                  aria-label="Open chat history"
                >
                  <Icon name="progress" size={24} />
                </button>
              )}
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <h1 className="text-lg font-black text-neutral-900 tracking-tight leading-none">
                  MomsCare AI
                </h1>
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                </div>
                <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mt-1">
                  {isMother ? "Personalized Care" : "Standard Mode"}
                </p>
              </div>
            </div>
            {!isMother && (
              <Link href="/mother/login" className="px-4 py-2 bg-pink-50 text-pink-600 rounded-xl text-xs font-black uppercase tracking-wider active:scale-95 tap-highlight-none">
                Login
              </Link>
            )}
          </div>

          {/* Safety Disclaimer - Integrated and Subtle */}
          <div className="px-4 py-2 bg-yellow-50/50 backdrop-blur-sm border-b border-yellow-100/50 flex-shrink-0">
            <p className="flex items-center gap-2 text-[10px] font-bold text-yellow-800 uppercase tracking-tight">
              <Icon name="warning" size={12} className="opacity-60" />
              <span>Note: AI information only. For emergencies, contact a professional.</span>
            </p>
          </div>

          {/* Main Chat Container */}
          <div className="flex-1 flex flex-col min-h-0 relative">
            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-transparent scrollbar-hide">
              {messages.map((msg, idx) => (
                <ChatBubble 
                  key={idx} 
                  role={msg.role} 
                  content={msg.content}
                  imageUrl={msg.imageUrl}
                />
              ))}
              {loading && (
                <div className="flex items-center gap-3 bg-white/80 backdrop-blur-md px-4 py-3 rounded-2xl w-fit shadow-sm border border-neutral-100">
                  <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 bg-pink-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                    <span className="w-1.5 h-1.5 bg-pink-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                    <span className="w-1.5 h-1.5 bg-pink-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                  </div>
                  <span className="text-xs font-bold text-neutral-400 uppercase tracking-widest">
                    {lang === "bn" ? "MomsCare লিখছে..." : "AI is typing..."}
                  </span>
                </div>
              )}
              <div ref={messagesEndRef} className="h-4" />
            </div>

            {/* Floating Model Progress */}
            {modelLoading && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 w-64 bg-white/90 backdrop-blur-md rounded-2xl p-3 shadow-xl border border-blue-50 animate-fade-in">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">WASM Loader</p>
                  <p className="text-[10px] font-black text-blue-600">{modelProgress}%</p>
                </div>
                <div className="w-full h-1.5 bg-blue-50 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 transition-all duration-500 ease-out" style={{ width: `${modelProgress}%` }} />
                </div>
              </div>
            )}

            {/* Input Section - Floating App style */}
            <div className="p-4 sm:p-6 bg-gradient-to-t from-neutral-50 via-neutral-50 to-transparent flex-shrink-0">
              <div className="max-w-3xl mx-auto space-y-4">
                {/* Upload Message Overlay */}
                {uploadMessage && (
                  <div className={`rounded-2xl px-4 py-3 flex items-center justify-between animate-slide-up ${
                    uploadMessage.includes("successfully") 
                      ? "bg-green-500 text-white shadow-green-100" 
                      : "bg-red-500 text-white shadow-red-100"
                  } shadow-lg`}>
                    <p className="text-xs font-bold">{uploadMessage}</p>
                    <button onClick={() => setUploadMessage("")} className="active:scale-90">
                      <Icon name="close" size={16} className="brightness-0 invert" />
                    </button>
                </div>
              )}

                <div className="bg-white rounded-3xl shadow-2xl border border-neutral-200/50 p-2 sm:p-3 relative">
              {/* Combined Chat Input with Image Attachment */}
              <ChatInput 
                onSend={sendMessage} 
                disabled={loading}
                onImageSelect={handleImageSelect}
                onImageRemove={handleImageRemove}
                currentImage={attachedImage}
              />
                </div>
              
              {isMother && (
                  <div className="flex justify-center">
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
                          } catch { }
                        if (res.ok) {
                            setUploadMessage(lang === "bn" ? "✅ সফলভাবে আপলোড করা হয়েছে!" : "✅ Uploaded successfully!");
                        } else {
                            setUploadMessage(`❌ ${data.error || "Failed"}`);
                        }
                      } catch (err) {
                          setUploadMessage(`❌ ${lang === "bn" ? "নেটওয়ার্ক ত্রুটি" : "Error"}`);
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
      </div>
    </Layout>
  );
}
