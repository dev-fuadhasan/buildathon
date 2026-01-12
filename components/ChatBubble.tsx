"use client";

import Image from "next/image";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { preprocessMarkdown, isPlainText, formatPlainText } from "@/lib/markdownPreprocessor";
import { useMemo } from "react";

type Props = {
  role: "user" | "assistant";
  content: string;
  imageUrl?: string;
};

// Separate component for markdown rendering with error handling
function MarkdownRenderer({ content, isUser }: { content: string; isUser: boolean }) {
  try {
    return (
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[]}
        skipHtml={false}
        components={{
          // Customize heading styles
          h1: ({node, ...props}) => <h1 className={`text-xl font-bold mb-3 mt-2 first:mt-0 ${isUser ? 'text-white' : 'text-slate-900'}`} {...props} />,
          h2: ({node, ...props}) => <h2 className={`text-lg font-bold mb-2 mt-4 first:mt-0 ${isUser ? 'text-white' : 'text-slate-900'}`} {...props} />,
          h3: ({node, ...props}) => <h3 className={`text-base font-bold mb-2 mt-3 first:mt-0 ${isUser ? 'text-white' : 'text-slate-900'}`} {...props} />,
          h4: ({node, ...props}) => <h4 className={`text-sm font-bold mb-1.5 mt-2 first:mt-0 ${isUser ? 'text-white' : 'text-slate-900'}`} {...props} />,
          // Customize list styles
          ul: ({node, ...props}) => <ul className={`list-disc list-outside mb-3 ml-4 sm:ml-6 space-y-1.5 ${isUser ? 'text-white marker:text-white' : 'text-slate-800 marker:text-slate-800'}`} {...props} />,
          ol: ({node, ...props}) => <ol className={`list-decimal list-outside mb-3 ml-4 sm:ml-6 space-y-1.5 ${isUser ? 'text-white marker:text-white' : 'text-slate-800 marker:text-slate-800'}`} {...props} />,
          li: ({node, ...props}) => <li className={`${isUser ? 'text-white' : 'text-slate-800'}`} {...props} />,
          // Customize paragraph - let markdown handle line breaks
          p: ({node, ...props}) => <p className={`mb-2 last:mb-0 ${isUser ? 'text-white' : 'text-slate-800'}`} {...props} />,
          // Customize strong/bold
          strong: ({node, ...props}) => <strong className={`font-bold ${isUser ? 'text-white' : 'text-slate-900'}`} {...props} />,
          // Customize emphasis/italic
          em: ({node, ...props}) => <em className={`italic ${isUser ? 'text-white' : 'text-slate-800'}`} {...props} />,
          // Horizontal rule
          hr: ({node, ...props}) => <hr className={`my-3 border-0 border-t ${isUser ? 'border-pink-400' : 'border-slate-300'}`} {...props} />,
          // Code blocks
          code: ({node, className, ...props}: any) => {
            const isInline = !className;
            return isInline ? (
              <code className={`px-1.5 py-0.5 rounded bg-opacity-20 ${isUser ? 'bg-white bg-opacity-20 text-white' : 'bg-slate-200 text-slate-900'} text-xs font-mono`} {...props} />
            ) : (
              <code className={`block p-3 rounded-lg mb-2 text-xs font-mono overflow-x-auto ${isUser ? 'bg-white bg-opacity-10 text-white' : 'bg-slate-100 text-slate-900'}`} {...props} />
            );
          },
          // Tables (from remark-gfm)
          table: ({node, ...props}) => (
            <div className="overflow-x-auto my-3">
              <table className={`min-w-full border-collapse ${isUser ? 'border-pink-400' : 'border-slate-300'}`} {...props} />
            </div>
          ),
          thead: ({node, ...props}) => <thead className={`${isUser ? 'bg-pink-500/30' : 'bg-slate-100'}`} {...props} />,
          tbody: ({node, ...props}) => <tbody {...props} />,
          tr: ({node, ...props}) => <tr className={`border-b ${isUser ? 'border-pink-400/30' : 'border-slate-200'}`} {...props} />,
          th: ({node, ...props}) => <th className={`px-3 py-2 text-left font-bold text-sm ${isUser ? 'text-white' : 'text-slate-900'}`} {...props} />,
          td: ({node, ...props}) => <td className={`px-3 py-2 text-sm ${isUser ? 'text-white' : 'text-slate-800'}`} {...props} />,
          // Blockquote
          blockquote: ({node, ...props}) => (
            <blockquote className={`border-l-4 pl-4 my-3 italic ${isUser ? 'border-pink-300 text-pink-100' : 'border-slate-300 text-slate-600'}`} {...props} />
          ),
          // Links
          a: ({node, ...props}: any) => (
            <a 
              className={`underline ${isUser ? 'text-pink-100 hover:text-white' : 'text-pink-600 hover:text-pink-700'}`}
              target="_blank"
              rel="noopener noreferrer"
              {...props}
            />
          ),
          // Line breaks
          br: ({node, ...props}) => <br {...props} />,
          // Text node - handle any unprocessed text gracefully
          text: ({node, ...props}: any) => {
            const text = String(props.children || '');
            // If text contains newlines, preserve them
            if (text.includes('\n')) {
              return text.split('\n').map((line: string, i: number, arr: string[]) => (
                <span key={i}>
                  {line}
                  {i < arr.length - 1 && <br />}
                </span>
              ));
            }
            return <span {...props} />;
          },
        }}
      >
        {content}
      </ReactMarkdown>
    );
  } catch (error) {
    // Fallback to plain text rendering if markdown parsing fails
    console.error("Markdown rendering error:", error);
    return (
      <div className={`whitespace-pre-wrap ${isUser ? 'text-white' : 'text-slate-800'}`}>
        {content}
      </div>
    );
  }
}

export default function ChatBubble({ role, content, imageUrl }: Props) {
  const isUser = role === "user";
  
  // Intelligently preprocess content to handle any format
  const processedContent = useMemo(() => {
    if (!content) return '';
    
    // First, try to preprocess markdown
    let processed = preprocessMarkdown(content);
    
    // If it's plain text, format it intelligently
    if (isPlainText(processed)) {
      processed = formatPlainText(processed);
    }
    
    return processed;
  }, [content]);
  
  return (
    <div className={`flex gap-2 sm:gap-3 ${isUser ? "justify-end" : "justify-start"} items-start mb-3 sm:mb-4`}>
      {!isUser && (
        <div className="flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-pink-400 to-pink-600 flex items-center justify-center text-white font-bold text-xs sm:text-sm shadow-md sm:shadow-lg ring-2 ring-pink-200">
          AI
        </div>
      )}
      <div
        className={`max-w-[85%] sm:max-w-[80%] md:max-w-[70%] rounded-2xl sm:rounded-2xl shadow-md sm:shadow-lg transition-all ${
          isUser
            ? "bg-gradient-to-br from-pink-500 to-pink-600 text-white rounded-br-sm"
            : "bg-white text-slate-800 border-2 border-slate-100 rounded-bl-sm"
        }`}
      >
        {/* Image (if present) */}
        {imageUrl && (
          <div className="relative w-full rounded-t-2xl overflow-hidden bg-slate-50">
            <div className="relative w-full h-40 sm:h-48 md:h-64">
              <Image
                src={imageUrl}
                alt="Attached image"
                fill
                className="object-contain"
                unoptimized={imageUrl.includes('?') || imageUrl.includes('X-Amz')} // Unoptimized for signed URLs
                onError={(e) => {
                  console.error("Image load error:", imageUrl);
                  // Fallback to showing broken image icon
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            </div>
          </div>
        )}
        
        {/* Text Content with Markdown Support */}
        {content && (
          <div className={`px-3 sm:px-4 md:px-5 py-2.5 sm:py-3 text-sm sm:text-sm md:text-base leading-relaxed ${imageUrl ? 'pt-2 sm:pt-3' : ''} ${isUser ? 'text-white' : 'text-slate-800'}`}>
            <MarkdownRenderer content={processedContent} isUser={isUser} />
          </div>
        )}
      </div>
      {isUser && (
        <div className="flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold text-xs sm:text-sm shadow-md sm:shadow-lg ring-2 ring-blue-200">
          <span className="text-[10px] sm:text-xs">You</span>
        </div>
      )}
    </div>
  );
}
