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

type Message = { role: "user" | "assistant"; content: string; imageUrl?: string; riskDetected?: boolean };

type ConversationListItem = {
  id: string;
  title: string;
  updatedAt: string;
};

export default function ChatPage() {
  const [lang] = useState(() => getLanguage());
  
  const initialMessage = lang === "bn" 
    ? "হ্যালো 👋 আমি MomsCare AI। আমি আপনাকে গর্ভাবস্থার লক্ষণ, মিসড পিরিয়ড, ঝুঁকি, পুষ্টি এবং কখন ডাক্তারের সাথে পরামর্শ করতে হবে তা বুঝতে সাহায্য করি।"
    : "Hello 👋 I'm MomsCare AI. I help you understand pregnancy symptoms, missed periods, risks, nutrition, and when to consult a doctor.";
  
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

  const quickStarters = lang === "bn" ? [
    { id: 'period', icon: '🤰', text: 'আমার পিরিয়ড দেরি হয়েছে — আমার কী করা উচিত?' },
    { id: 'symptoms', icon: '🩺', text: 'গর্ভাবস্থার এই লক্ষণগুলো কি স্বাভাবিক?' },
    { id: 'expect', icon: '📅', text: 'এই সপ্তাহে আমার কী আশা করা উচিত?' },
    { id: 'food', icon: '🍎', text: 'গর্ভাবস্থায় কোন খাবার নিরাপদ?' },
    { id: 'doctor', icon: '🚨', text: 'কখন আমার ডাক্তার দেখানো উচিত?' }
  ] : [
    { id: 'period', icon: '🤰', text: 'I think my period is late — what should I do?' },
    { id: 'symptoms', icon: '🩺', text: 'Are these pregnancy symptoms normal?' },
    { id: 'expect', icon: '📅', text: 'What should I expect this week of pregnancy?' },
    { id: 'food', icon: '🍎', text: 'What food is safe during pregnancy?' },
    { id: 'doctor', icon: '🚨', text: 'When should I see a doctor?' }
  ];
  
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

  const limitMessagesForRequest = (msgs: Message[], maxMessages: number) => {
    if (msgs.length <= maxMessages) return msgs;
    const first = msgs[0];
    const startIndex = msgs.length - (maxMessages - 1);
    const tail = msgs.slice(startIndex);
    if (first && first.role === "assistant" && first.content === initialMessage) {
      return [first, ...tail];
    }
    return msgs.slice(-maxMessages);
  };

  const limitMessagesForStorage = (msgs: Message[], maxMessages: number) => {
    return limitMessagesForRequest(msgs, maxMessages);
  };

  const updateChatHistoryStore = async (msgs: Message[]) => {
    if (!isMother || !motherToken) return;
    try {
      const trimmed = limitMessagesForStorage(msgs, 20);
      const messagesWithTimestamp = trimmed.map((m) => ({
        role: m.role,
        content: m.content,
        timestamp: new Date().toISOString(),
      }));
      
      // WAIT for save to complete before dispatching event (fixes race condition!)
      const response = await fetch("/api/mother/chat-history", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${motherToken}`,
        },
        body: JSON.stringify({ messages: messagesWithTimestamp }),
      });

      // Check if save was successful
      if (!response.ok) {
        console.error("[Chat History] ❌ Failed to save:", response.status);
        return; // Don't dispatch event if save failed
      }

      console.log("[Chat History] ✅ Saved successfully, dispatching event...");

      // Now it's safe to notify (chat history is saved!)
      localStorage.setItem("chatHistoryUpdated", Date.now().toString());
      window.dispatchEvent(new Event("chatHistoryUpdated"));
    } catch (err) {
      console.error("[Chat History] ❌ Error:", err);
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

  // Helper to detect risk keywords in user message
  const detectRiskInMessage = (text: string): boolean => {
    const riskKeywords = [
      'bleeding', 'blood', 'pain', 'severe', 'dizzy', 'headache', 'swelling',
      'fever', 'vomiting', 'nausea', 'contractions', 'cramping', 'spotting',
      'discharge', 'pressure', 'burning', 'itching', 'infection', 'symptoms',
      'রক্তপাত', 'ব্যথা', 'মাথাব্যথা', 'জ্বর', 'বমি', 'সংকোচন'
    ];
    const lowerText = text.toLowerCase();
    return riskKeywords.some(keyword => lowerText.includes(keyword.toLowerCase()));
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
    
    // Detect potential risk in user message
    const hasRisk = detectRiskInMessage(text);
    
    // Add user message with optional image
    const newMessages = [...messages, { 
      role: "user" as const, 
      content: text,
      imageUrl: uploadedImageUrl || undefined
    }];
    setMessages(newMessages);
    setLoading(true);

    // Update shared chat history immediately for risk detection
    updateChatHistoryStore(newMessages);
    
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
      const requestMessages = limitMessagesForRequest(newMessages, 15);
      const res = await fetch("/api/chat?stream=true", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "text/event-stream",
          ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
        },
        body: JSON.stringify({
          messages: requestMessages,
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
                          riskDetected: hasRisk, // Add risk flag
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
                      updateChatHistoryStore(finalMessages);
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

      const finalMessages = [...newMessages, { role: "assistant" as const, content: data.reply, riskDetected: hasRisk }];
      setMessages(finalMessages);
      setLoading(false);
      
      if (isMother && conversationId) {
        saveMessagesToConversation(finalMessages, conversationId).catch((err) => {
          console.error("Background conversation save failed:", err);
        });
        updateChatHistoryStore(finalMessages);
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
      <div className="flex h-full w-full max-w-7xl mx-auto gap-0 sm:gap-4 px-0 sm:px-4 overflow-hidden">
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
              fixed lg:relative top-0 left-0 h-full
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
                  className="w-full bg-pink-500 hover:bg-pink-600 text-white py-4 rounded-[1.25rem] flex items-center justify-center gap-3 font-black shadow-xl shadow-pink-100 transition-all active:scale-95 tap-highlight-none border-none group"
                >
                  <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center group-hover:rotate-90 transition-transform duration-500">
                    <Icon name="add" size={18} className="brightness-0 invert" />
                  </div>
                  <span className="uppercase tracking-[0.1em] text-sm">{lang === "bn" ? "নতুন চ্যাট" : "New Chat"}</span>
                </button>
              </div>
              
              {/* Conversations List */}
              <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 scrollbar-hide">
                {conversations.length === 0 ? (
                  <div className="text-center py-16 flex flex-col items-center gap-4 opacity-30">
                    <div className="w-16 h-16 rounded-full bg-neutral-100 flex items-center justify-center">
                      <Icon name="chat" size={32} className="opacity-40" />
                    </div>
                    <p className="text-xs font-black tracking-[0.2em] uppercase text-neutral-500">
                      {lang === "bn" ? "কোন ইতিহাস নেই" : "Empty History"}
                    </p>
                  </div>
                ) : (
                  conversations.map((conv) => (
                    <div
                      key={conv.id}
                      className={`group relative rounded-2xl transition-all duration-500 ${
                        currentConversationId === conv.id
                          ? 'bg-pink-500 shadow-lg shadow-pink-200 ring-4 ring-pink-100'
                          : 'bg-white hover:bg-neutral-50 border border-neutral-100 shadow-sm'
                      }`}
                    >
                      <button
                        onClick={() => loadConversation(conv.id)}
                        className="w-full text-left p-4 tap-highlight-none"
                      >
                        <div className="flex items-start gap-4">
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors duration-500 ${
                            currentConversationId === conv.id ? 'bg-white/20' : 'bg-neutral-100'
                          }`}>
                            <Icon name="chat" size={20} className={currentConversationId === conv.id ? 'brightness-0 invert' : 'opacity-40'} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-black truncate mb-1 transition-colors duration-500 ${
                              currentConversationId === conv.id ? 'text-white' : 'text-neutral-900'
                            }`}>
                              {conv.title}
                            </p>
                            <div className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-widest transition-colors duration-500 ${
                              currentConversationId === conv.id ? 'text-white/60' : 'text-neutral-400'
                            }`}>
                               <Icon name="clock" size={10} className={currentConversationId === conv.id ? 'brightness-0 invert' : ''} />
                               <span>
                              {new Date(conv.updatedAt).toLocaleDateString(lang === "bn" ? "bn-BD" : "en-US", {
                                month: "short",
                                   day: "numeric"
                              })}
                               </span>
                            </div>
                          </div>
                        </div>
                      </button>
                      
                      {/* Delete Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteConversation(conv.id);
                        }}
                        className={`absolute top-1/2 -translate-y-1/2 right-3 p-2.5 rounded-xl transition-all duration-300 opacity-0 group-hover:opacity-100 active:scale-90 tap-highlight-none ${
                          currentConversationId === conv.id 
                            ? 'bg-white/20 hover:bg-white/30 text-white' 
                            : 'bg-white shadow-md hover:bg-red-50 text-red-500 border border-neutral-100'
                        }`}
                        title={lang === "bn" ? "মুছে ফেলুন" : "Delete"}
                      >
                        <Icon name="delete" size={16} className={currentConversationId === conv.id ? 'brightness-0 invert' : ''} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        )}
        
        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col min-w-0 min-h-0 bg-white sm:bg-neutral-50/50 relative overflow-hidden">
          {/* Subtle Background Pattern */}
          <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:24px_24px] opacity-40 pointer-events-none" />

          {/* Header - App-style Design - FIXED */}
          <div className="flex items-center justify-between px-6 py-3 bg-white border-b border-neutral-100 flex-shrink-0 z-10 shadow-sm">
            <div className="flex items-center gap-4">
              {/* Mobile Menu Button - Only for logged-in mothers */}
              {isMother && (
                <button
                  onClick={() => setShowSidebar(true)}
                  className="lg:hidden p-2 rounded-2xl bg-neutral-50 text-neutral-600 hover:bg-pink-50 hover:text-pink-600 active:scale-90 transition-all shadow-sm"
                  aria-label="Open chat history"
                >
                  <Icon name="progress" size={20} />
                </button>
              )}
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <h1 className="text-lg font-black text-neutral-900 tracking-tight leading-none">
                  MomsCare AI
                </h1>
                  <div className="flex items-center gap-1 bg-green-50 px-1.5 py-0.5 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                    <span className="text-[9px] font-black text-green-600 uppercase">Online</span>
                  </div>
                </div>
                <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-[0.15em] mt-1 flex items-center gap-1.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${isMother ? 'bg-pink-400' : 'bg-slate-300'}`}></span>
                  {isMother ? (lang === "bn" ? "মা অ্যাকাউন্ট" : "MomsCare Account") : (lang === "bn" ? "গেস্ট মোড" : "Guest Mode")}
                </p>
              </div>
            </div>
            {!isMother && (
              <Link href="/mother/login" className="px-4 py-2 bg-pink-500 text-white rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-pink-600 hover:shadow-lg hover:shadow-pink-200 transition-all active:scale-95">
                Login
              </Link>
            )}
          </div>

          {/* Chat Messages - SCROLLABLE AREA */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6 space-y-4 bg-transparent min-h-0" style={{ WebkitOverflowScrolling: 'touch' }}>
              {messages.map((msg, idx) => (
                <ChatBubble 
                  key={idx} 
                  role={msg.role} 
                  content={msg.content}
                  imageUrl={msg.imageUrl}
                  riskDetected={msg.riskDetected}
                  isMother={isMother}
                />
              ))}
            
            {/* Quick Start Cards - Only show when there is only the welcome message */}
            {messages.length <= 1 && !loading && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
                {quickStarters.map((starter) => (
                  <button
                    key={starter.id}
                    onClick={() => sendMessage(starter.text)}
                    className="flex items-center gap-3 p-3 bg-white/60 hover:bg-white border border-pink-100 hover:border-pink-300 rounded-2xl text-left transition-all hover:shadow-lg hover:shadow-pink-100/50 group active:scale-[0.98]"
                  >
                    <span className="text-xl group-hover:scale-110 transition-transform duration-300">{starter.icon}</span>
                    <span className="text-xs font-bold text-slate-600 leading-tight">{starter.text}</span>
                  </button>
                ))}
              </div>
            )}

              {loading && (
              <div className="flex items-center gap-3 bg-white/80 backdrop-blur-md px-4 py-2.5 rounded-2xl w-fit shadow-sm border border-neutral-100 animate-in fade-in slide-in-from-left-4 duration-300">
                <div className="flex gap-1">
                  <div className="w-1.5 h-1.5 bg-pink-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-1.5 h-1.5 bg-pink-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-1.5 h-1.5 bg-pink-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
                <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">
                  {lang === "bn" ? "MomsCare টাইপ করছে..." : "AI is crafting response..."}
                </span>
              </div>
            )}
            <div ref={messagesEndRef} className="h-4" />
          </div>

          {/* Floating Model Progress */}
              {modelLoading && (
            <div className="absolute top-20 left-1/2 -translate-x-1/2 z-20 w-72 bg-white/95 backdrop-blur-xl rounded-3xl p-4 shadow-2xl border border-blue-50 animate-in fade-in zoom-in duration-300">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-blue-500 flex items-center justify-center">
                    <Icon name="sync" size={14} className="brightness-0 invert animate-spin" />
                  </div>
                  <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">WASM Neural Engine</p>
                </div>
                <p className="text-[10px] font-black text-blue-600">{modelProgress}%</p>
              </div>
              <div className="w-full h-2 bg-blue-50 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 transition-all duration-700 ease-out shadow-[0_0_8px_rgba(59,130,246,0.5)]" style={{ width: `${modelProgress}%` }} />
              </div>
            </div>
          )}

          {/* Input Section - FIXED AT BOTTOM */}
          <div className="px-4 pb-20 lg:pb-4 pt-2 sm:px-6 bg-white sm:bg-transparent flex-shrink-0 z-10 border-t border-neutral-100/50">
            <div className="max-w-4xl mx-auto space-y-3">
              {/* Upload Message Overlay */}
              {uploadMessage && (
                <div className={`mb-4 rounded-3xl px-6 py-4 flex items-center justify-between animate-in slide-in-from-bottom-4 fade-in duration-500 ${
                  uploadMessage.includes("successfully") 
                    ? "bg-green-600 text-white shadow-lg shadow-green-200" 
                    : "bg-red-600 text-white shadow-lg shadow-red-200"
                }`}>
                  <div className="flex items-center gap-3">
                    <Icon name={uploadMessage.includes("successfully") ? "success" : "error"} size={20} className="brightness-0 invert" />
                    <p className="text-sm font-black">{uploadMessage}</p>
                  </div>
                  <button onClick={() => setUploadMessage("")} className="p-1 hover:bg-white/20 rounded-lg transition-colors">
                    <Icon name="close" size={18} className="brightness-0 invert" />
                  </button>
                </div>
              )}

              <div className="bg-white/95 backdrop-blur-xl rounded-[2rem] shadow-xl shadow-pink-100/30 border border-pink-100/50 p-1.5 sm:p-2.5 relative group focus-within:ring-4 focus-within:ring-pink-100/50 transition-all duration-500">
              {/* Combined Chat Input with Image Attachment */}
              <ChatInput 
                onSend={sendMessage} 
                disabled={loading}
                onImageSelect={handleImageSelect}
                onImageRemove={handleImageRemove}
                currentImage={attachedImage}
              />
              </div>

              {/* Trust & Privacy Indicators - Compact & One line on mobile if possible */}
              <div className="flex items-center justify-center gap-x-4 gap-y-1 px-2 flex-wrap opacity-50 text-[8px] sm:text-[9px] font-black uppercase tracking-widest text-slate-400">
                <div className="flex items-center gap-1 min-w-fit">
                  <Icon name="secure" size={10} className="opacity-60" />
                  <span>{lang === "bn" ? "নিরাপদ" : "Secure"}</span>
                </div>
                <div className="flex items-center gap-1 min-w-fit">
                  <Icon name="warning" size={10} className="opacity-60" />
                  <span>{lang === "bn" ? "ডাক্তারি পরামর্শ নিন" : "Ask Doctor"}</span>
                </div>
                <div className="flex items-center gap-1 min-w-fit">
                  <Icon name="ai" size={10} className="opacity-60" />
                  <span>{lang === "bn" ? "এআই পরামর্শ" : "AI Guide"}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
