'use client';

/**
 * INTEGRATED CHAT COMPONENT WITH CLIENT-SIDE EMBEDDINGS
 * 
 * This component automatically:
 * - Loads the WASM embedding model
 * - Performs semantic search on Q&A database
 * - Sends context to API
 * - No manual integration needed!
 */

import { useEffect, useRef, useState } from 'react';
import { useEmbedding } from '@/hooks/useEmbedding';
import { semanticSearch, loadEmbeddings } from '@/lib/vectorSearchClient';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

interface IntegratedChatProps {
  userId?: string;
  disabled?: boolean;
  onMessageSent?: (message: string) => void;
}

export function IntegratedChatComponent({ userId, disabled = false, onMessageSent }: IntegratedChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // ✅ Initialize embeddings
  const { isModelReady, isLoading: modelLoading } = useEmbedding();
  const [qaDB, setQaDB] = useState<any[]>([]);
  const [dbLoaded, setDbLoaded] = useState(false);

  // Load embeddings database
  useEffect(() => {
    const loadDB = async () => {
      try {
        const data = await loadEmbeddings();
        setQaDB(data);
        setDbLoaded(true);
        console.log('[Integrated Chat] Q&A database loaded:', data.length, 'items');
      } catch (err) {
        console.error('[Integrated Chat] Failed to load embeddings:', err);
        setDbLoaded(true); // Continue anyway with keyboard fallback
      }
    };

    loadDB();
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!inputValue.trim() || isLoading || disabled) {
      return;
    }

    // Add user message
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue,
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);
    setError(null);
    onMessageSent?.(inputValue);

    try {
      // ✅ Perform semantic search (client-side, browser)
      let context = '';
      if (isModelReady && dbLoaded && qaDB.length > 0) {
        console.log('[Integrated Chat] Performing semantic search...');
        const startTime = performance.now();

        const searchResults = await semanticSearch(inputValue, qaDB, 3, 0.3);
        const searchTime = performance.now() - startTime;

        console.log(
          `[Integrated Chat] Found ${searchResults.length} matches in ${searchTime.toFixed(0)}ms`
        );

        if (searchResults.length > 0) {
          context = searchResults
            .map(r => `Q: ${r.question}\nA: ${r.answer}`)
            .join('\n---\n');
        }
      } else {
        console.log('[Integrated Chat] Model not ready or DB not loaded - will use keyword search on server');
      }

      // Prepare messages for API (same format as before)
      const apiMessages = [
        ...messages.map(m => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        })),
        {
          role: 'user' as const,
          content: userMessage.content,
        },
      ];

      // ✅ Compute client embedding (if model ready) and send to API with context
      let embeddingToSend: number[] | undefined = undefined;
      if (isModelReady) {
        try {
          // useEmbedding provides `embed` via hook; import it at top if needed
          // The hook in this component doesn't expose embed directly, so dynamic import to avoid changing hook signature
          const { embedText } = await import('@/lib/embedding.client');
          const e = await embedText(userMessage.content, true);
          if (Array.isArray(e) && e.length === 384) embeddingToSend = e;
        } catch (err) {
          console.warn('[Integrated Chat] Failed to compute client embedding:', err);
        }
      }

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: apiMessages,
          context: context || undefined, // ✅ Include semantic search context
          embedding: embeddingToSend || undefined,
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      // Add assistant response
      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.reply,
        timestamp: new Date().toISOString(),
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Show safety warnings if needed
      if (data.safetyWarning) {
        console.warn('[Safety] Risk level:', data.riskLevel);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send message';
      console.error('[Integrated Chat] Error:', errorMessage);
      setError(errorMessage);

      // Add error message
      const errorMsg: ChatMessage = {
        id: (Date.now() + 2).toString(),
        role: 'assistant',
        content: `Sorry, I encountered an error: ${errorMessage}. Please try again.`,
        timestamp: new Date().toISOString(),
      };

      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-lg shadow-lg">
      {/* Header with Status */}
      <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
        <h2 className="text-xl font-bold text-gray-800">MomsCare Chat</h2>
        <div className="flex items-center mt-2 space-x-4">
          {modelLoading ? (
            <div className="flex items-center space-x-2">
              <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
              <p className="text-sm text-blue-600 font-semibold">Loading WASM model... {dbLoaded ? '(embeddings ready)' : '(also loading DB)'}</p>
            </div>
          ) : isModelReady ? (
            <p className="text-sm text-green-600 font-semibold">✅ AI model ready</p>
          ) : (
            <p className="text-sm text-gray-600">⚠️ Initializing...</p>
          )}
          {dbLoaded && (
            <p className="text-sm text-green-600">✓ {qaDB.length} Q&A loaded</p>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-400">
            <p>Start a conversation...</p>
          </div>
        ) : (
          messages.map(msg => (
            <div
              key={msg.id}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                  msg.role === 'user'
                    ? 'bg-blue-500 text-white rounded-br-none'
                    : 'bg-gray-200 text-gray-900 rounded-bl-none'
                }`}
              >
                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                <p className="text-xs mt-1 opacity-70">
                  {new Date(msg.timestamp).toLocaleTimeString()}
                </p>
              </div>
            </div>
          ))
        )}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-200 text-gray-900 rounded-lg rounded-bl-none px-4 py-2">
              <div className="flex space-x-2">
                <div className="w-2 h-2 bg-gray-600 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-600 rounded-full animate-bounce delay-100"></div>
                <div className="w-2 h-2 bg-gray-600 rounded-full animate-bounce delay-200"></div>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="p-3 bg-red-100 border border-red-300 rounded text-red-700 text-sm">
            Error: {error}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-200">
        <div className="flex space-x-2">
          <input
            type="text"
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            placeholder={modelLoading ? "Loading AI model... (takes ~60s first time)" : "Ask a health question..."}
            disabled={disabled || isLoading}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
          />
          <button
            type="submit"
            disabled={disabled || isLoading || !inputValue.trim()}
            className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-400"
          >
            {isLoading ? '...' : 'Send'}
          </button>
        </div>

        {/* Info */}
        <p className="text-xs text-gray-500 mt-2">
          {modelLoading ? (
            <span className="animate-pulse">⏳ Loading AI model... (first time: 30-60s, then cached)</span>
          ) : isModelReady && dbLoaded ? (
            <span className="text-green-600">✓ AI model ready + semantic search enabled</span>
          ) : (
            <span>◉ Loading semantic search...</span>
          )}
        </p>
      </form>
    </div>
  );
}
