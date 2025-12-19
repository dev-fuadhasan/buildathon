'use client';

/**
 * PRODUCTION CHAT COMPONENT (NEW ARCHITECTURE)
 * ============================================
 * 
 * - Lightweight query embedding (API-based, not WASM)
 * - Semantic search against vector DB
 * - Safety guardrails always active
 * - Graceful fallback when embeddings/vectorDB fail
 * - Optimized for deployed healthcare app
 */

import { useEffect, useRef, useState } from 'react';
import { semanticSearch, initializeVectorDB, SearchOptions } from '@/lib/vectorDB';
import { assessSafety, getFallbackResponse, handleSystemError } from '@/lib/safetyGuardrails2';
import { useEmbedding } from '@/hooks/useEmbedding';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  riskLevel?: string;
}

interface ProductionChatProps {
  userId?: string;
  disabled?: boolean;
  onMessageSent?: (message: string) => void;
}

export function ProductionChatComponent({ userId, disabled = false, onMessageSent }: ProductionChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dbReady, setDbReady] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  // Embedding hook for client-side WASM
  const { embed, isModelReady, isLoading: modelLoading, progress: modelProgress } = useEmbedding();

  // Initialize vector DB on mount
  useEffect(() => {
    const init = async () => {
      console.log('[ProductionChat] Initializing vector DB...');
      const success = initializeVectorDB();
      setDbReady(success);
      if (success) {
        console.log('[ProductionChat] ✓ Vector DB initialized');
      } else {
        console.warn('[ProductionChat] Vector DB initialization failed, will use fallback');
      }
    };

    init();
  }, []);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!inputValue.trim() || isLoading || disabled) {
      return;
    }

    const userMessageText = inputValue;
    setInputValue('');
    setIsLoading(true);
    setError(null);
    onMessageSent?.(userMessageText);

    // Add user message
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: userMessageText,
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMessage]);

    try {
      // ============================================================
      // STEP 1: SAFETY ASSESSMENT (Always runs, regardless of other systems)
      // ============================================================
      const safety = assessSafety(userMessageText);
      console.log(`[ProductionChat] Safety level: ${safety.riskLevel}`);

      // Emergency response takes absolute priority
      if (safety.shouldCallEmergency) {
        const emergencyMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: `🚨 EMERGENCY ALERT\n\n${safety.recommendations.join('\n')}\n\nCall emergency services immediately!`,
          timestamp: new Date().toISOString(),
          riskLevel: 'emergency',
        };

        setMessages(prev => [...prev, emergencyMessage]);
        return;
      }

      // ============================================================
      // STEP 2: SEMANTIC SEARCH (Get context from vector DB)
      // ============================================================
      let semanticContext = '';
      let searchFailed = false;

      if (dbReady) {
        try {
          console.log('[ProductionChat] Searching vector DB...');
          const startTime = performance.now();

          const searchOptions: SearchOptions = {
            minSimilarity: 0.25,
            maxResults: 3,
            timeout: 10000,
          };

          const results = await semanticSearch(userMessageText, searchOptions);
          const searchTime = performance.now() - startTime;

          console.log(`[ProductionChat] Found ${results.length} matches in ${searchTime.toFixed(0)}ms`);

          if (results.length > 0) {
            semanticContext = results
              .map(r => `Q: ${r.question}\nA: ${r.answer}`)
              .join('\n---\n');
          }
        } catch (err) {
          searchFailed = true;
          const errorMsg = err instanceof Error ? err.message : String(err);
          console.warn(`[ProductionChat] Semantic search failed: ${errorMsg}`);
        }
      } else {
        console.log('[ProductionChat] Vector DB not ready, skipping semantic search');
        searchFailed = true;
      }

      // ============================================================
      // STEP 3: SEND TO AI API (with or without semantic context)
      // ============================================================
      console.log('[ProductionChat] Calling AI...');
      const apiStartTime = performance.now();

      // Compute client embedding if model is available (client-side WASM)
      let embeddingToSend: number[] | undefined = undefined;
      if (isModelReady && embed) {
        try {
          const e = await embed(userMessageText, true);
          if (Array.isArray(e) && e.length === 384) embeddingToSend = e;
        } catch (err) {
          console.warn('[ProductionChat] Client embedding generation failed:', err);
        }
      }

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            ...messages.map(m => ({
              role: m.role as 'user' | 'assistant',
              content: m.content,
            })),
            { role: 'user', content: userMessageText },
          ],
          context: semanticContext || undefined,
          embedding: embeddingToSend || undefined,
          riskLevel: safety.riskLevel,
          emergencyContext: safety.riskLevel !== 'normal' ? safety.recommendations : undefined,
        }),
      });

      const apiTime = performance.now() - apiStartTime;
      console.log(`[ProductionChat] AI responded in ${apiTime.toFixed(0)}ms`);

      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      // ============================================================
      // STEP 4: FALLBACK (If AI fails)
      // ============================================================
      let assistantResponse = data.reply || '';

      if (!assistantResponse) {
        console.warn('[ProductionChat] AI returned empty response, using fallback');
        assistantResponse = getFallbackResponse(userMessageText);
      }

      // ============================================================
      // STEP 5: ADD SAFETY WARNINGS IF NEEDED
      // ============================================================
      if (safety.shouldAlertUser && safety.warnings.length > 0) {
        assistantResponse = `${safety.warnings.join('\n')}\n\n${assistantResponse}\n\n${safety.recommendations.join('\n')}`;
      }

      // Add assistant message
      const assistantMessage: ChatMessage = {
        id: (Date.now() + 2).toString(),
        role: 'assistant',
        content: assistantResponse,
        timestamp: new Date().toISOString(),
        riskLevel: safety.riskLevel,
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (err) {
      console.error('[ProductionChat] Error:', err);

      // Determine best fallback response
      const errorHandling = handleSystemError(userMessageText, {
        embeddingFailed: true,
        vectorDBFailed: !dbReady,
        aiFailed: true,
      });

      let fallbackContent = errorHandling.fallbackResponse || getFallbackResponse(userMessageText);

      if (errorHandling.emergencyAlert) {
        fallbackContent = `${errorHandling.emergencyAlert}\n\n${fallbackContent}`;
      }

      const fallbackMessage: ChatMessage = {
        id: (Date.now() + 3).toString(),
        role: 'assistant',
        content: fallbackContent,
        timestamp: new Date().toISOString(),
        riskLevel: 'high',
      };

      setMessages(prev => [...prev, fallbackMessage]);

      const errorMsg = err instanceof Error ? err.message : String(err);
      setError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-white to-gray-50 rounded-lg shadow-xl border border-gray-200">
      {/* HEADER */}
      <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">MomsCare Health Assistant</h2>
            <p className="text-sm text-gray-600 mt-1">
              {dbReady ? '✓ AI-powered with semantic search' : '◉ Using fallback mode'}
            </p>
          </div>
          <div className="text-right flex items-center space-x-2">
            {modelLoading ? (
              <div className="flex items-center space-x-2">
                <span className="inline-block px-3 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded-full">Downloading model</span>
                <div className="w-36 h-2 bg-gray-200 rounded overflow-hidden">
                  <div className="h-2 bg-blue-500" style={{ width: `${modelProgress}%` }} />
                </div>
                <span className="text-xs text-gray-600">{modelProgress}%</span>
              </div>
            ) : isModelReady ? (
              <span className="inline-block px-3 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded-full">
                Model ready
              </span>
            ) : null}

            {dbReady && (
              <span className="inline-block px-3 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded-full">
                Vector DB Ready
              </span>
            )}
          </div>
        </div>
      </div>

      {/* MESSAGES */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-400">
            <div className="text-center">
              <p className="text-lg font-semibold mb-2">Welcome to MomsCare</p>
              <p className="text-sm">Ask any health question. AI is here to help!</p>
            </div>
          </div>
        ) : (
          messages.map(msg => (
            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-md px-4 py-3 rounded-lg ${
                  msg.role === 'user'
                    ? 'bg-blue-500 text-white rounded-br-none'
                    : msg.riskLevel === 'emergency'
                    ? 'bg-red-100 text-red-900 rounded-bl-none border-l-4 border-red-600'
                    : msg.riskLevel === 'high'
                    ? 'bg-yellow-100 text-yellow-900 rounded-bl-none border-l-4 border-yellow-600'
                    : 'bg-gray-200 text-gray-900 rounded-bl-none'
                }`}
              >
                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                <p className="text-xs mt-2 opacity-70">
                  {new Date(msg.timestamp).toLocaleTimeString()}
                </p>
              </div>
            </div>
          ))
        )}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-300 text-gray-900 rounded-lg rounded-bl-none px-4 py-2">
              <div className="flex space-x-2">
                <div className="w-2 h-2 bg-gray-600 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-600 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-gray-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="p-3 bg-orange-100 border border-orange-300 rounded text-orange-700 text-sm">
            ⚠️ Note: Using fallback response. {error}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* INPUT */}
      <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-200 bg-white">
        <div className="flex space-x-2">
          <input
            type="text"
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            placeholder="Ask a health question..."
            disabled={disabled || isLoading}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
          />
          <button
            type="submit"
            disabled={disabled || isLoading || !inputValue.trim()}
            className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium transition"
          >
            {isLoading ? '...' : 'Send'}
          </button>
        </div>

        <p className="text-xs text-gray-500 mt-2">
          💡 Your health data is processed safely with our AI. Always consult your doctor for serious concerns.
        </p>
      </form>
    </div>
  );
}
