'use client';

/**
 * PRODUCTION CHAT COMPONENT - SUPABASE SEMANTIC SEARCH
 * ====================================================
 * 
 * - Uses pre-computed 384-dim embeddings from Supabase
 * - Works for both logged-in and logged-out users
 * - Built-in safety guardrails
 * - Graceful fallback to keyword search
 */

import { useEffect, useRef, useState } from 'react';
import { hybridSearch, initializeSupabaseSearch } from '@/lib/supabaseSemanticSearch';
import { useEmbedding } from '@/hooks/useEmbedding';
import { assessSafety, getFallbackResponse } from '@/lib/safetyGuardrails2';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

interface ChatComponentProps {
  userId?: string;
  disabled?: boolean;
}

export function SupabaseSemanticChatComponent({ userId, disabled = false }: ChatComponentProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [supabaseReady, setSupabaseReady] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize Supabase on mount
  useEffect(() => {
    const ready = initializeSupabaseSearch();
    setSupabaseReady(ready);
    if (!ready) {
      console.warn('[Chat] Supabase not initialized');
    }
  }, []);

  // Embedding hook (client-side WASM)
  const { embed, isModelReady, isLoading: modelLoading, progress: modelProgress } = useEmbedding();

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!inputValue.trim() || isLoading || disabled) return;

    const userText = inputValue;
    setInputValue('');
    setIsLoading(true);
    setError(null);

    // Add user message
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: userText,
      timestamp: new Date().toISOString(),
    };
    setMessages(prev => [...prev, userMsg]);

    try {
      // STEP 1: Safety check
      const safety = assessSafety(userText);
      if (safety.shouldCallEmergency) {
        const emergencyMsg: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: `🚨 EMERGENCY\n\n${safety.recommendations.join('\n')}\n\nCall emergency services immediately!`,
          timestamp: new Date().toISOString(),
        };
        setMessages(prev => [...prev, emergencyMsg]);
        return;
      }

      // STEP 2: Semantic search (if Supabase ready)
      let semanticContext = '';
      if (supabaseReady) {
        try {
          console.log('[Chat] Searching Supabase...');
          const results = await hybridSearch(userText, {
            minSimilarity: 0.25,
            maxResults: 3,
          });
          
          if (results.length > 0) {
            semanticContext = results
              .map(r => `Q: ${r.question}\nA: ${r.answer}`)
              .join('\n---\n');
            console.log(`[Chat] Found ${results.length} results`);
          }
        } catch (err) {
          console.warn('[Chat] Semantic search failed:', err);
        }
      }

      // STEP 3: Call AI API
      // If client-side embedding model is ready, compute embedding and send it so server can call Supabase RPC directly
      let embeddingToSend: number[] | undefined = undefined;
      if (isModelReady) {
        try {
          const e = await embed(userText, true);
          if (Array.isArray(e) && e.length === 384) {
            embeddingToSend = e;
          } else if (Array.isArray(e)) {
            // If model returns different dim, still allow server fallback via context
            console.warn('[Chat] Generated embedding had unexpected dimension:', e.length);
          }
        } catch (err) {
          console.warn('[Chat] Failed to generate client embedding:', err);
        }
      }

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            ...messages.map(m => ({
              role: m.role,
              content: m.content,
            })),
            { role: 'user', content: userText },
          ],
          context: semanticContext || undefined,
          embedding: embeddingToSend || undefined,
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`);
      }

      const data = await response.json();

      // STEP 4: Add warnings if needed
      let responseText = data.reply || getFallbackResponse(userText);
      
      if (safety.shouldAlertUser && safety.warnings.length > 0) {
        responseText = `${safety.warnings.join('\n')}\n\n${responseText}\n\n${safety.recommendations.join('\n')}`;
      }

      const assistantMsg: ChatMessage = {
        id: (Date.now() + 2).toString(),
        role: 'assistant',
        content: responseText,
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, assistantMsg]);
    } catch (err) {
      console.error('[Chat] Error:', err);
      const errorMsg = err instanceof Error ? err.message : String(err);
      setError(errorMsg);

      const fallbackMsg: ChatMessage = {
        id: (Date.now() + 3).toString(),
        role: 'assistant',
        content: getFallbackResponse(userText),
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, fallbackMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-white to-gray-50 rounded-lg shadow-xl border border-gray-200">
      {/* HEADER */}
      <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
        <h2 className="text-xl font-bold text-gray-900">MomsCare AI Chat</h2>
        <div className="flex items-center space-x-3 mt-1">
          <p className="text-sm text-gray-600">
            {supabaseReady ? '✓ Semantic search enabled' : '◉ Initializing search...'}
          </p>
          {modelLoading ? (
            <div className="flex items-center space-x-2">
              <p className="text-sm text-blue-600 font-semibold">Downloading model (WASM)...</p>
              <div className="w-40 h-2 bg-gray-200 rounded overflow-hidden">
                <div className="h-2 bg-blue-500" style={{ width: `${modelProgress}%` }} />
              </div>
              <p className="text-xs text-gray-600">{modelProgress}%</p>
            </div>
          ) : isModelReady ? (
            <p className="text-sm text-green-600 font-semibold">Model ready</p>
          ) : null}
        </div>
      </div>

      {/* MESSAGES */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-400">
            <p>Ask a health question...</p>
          </div>
        ) : (
          messages.map(msg => (
            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-md px-4 py-3 rounded-lg ${
                  msg.role === 'user'
                    ? 'bg-blue-500 text-white rounded-br-none'
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
            ⚠️ {error}
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
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
          />
          <button
            type="submit"
            disabled={disabled || isLoading || !inputValue.trim()}
            className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-400"
          >
            Send
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          🔒 Your health data is private and secure.
        </p>
      </form>
    </div>
  );
}
