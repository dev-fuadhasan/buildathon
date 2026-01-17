"use client";

import Image from "next/image";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { preprocessMarkdown, isPlainText, formatPlainText } from "@/lib/markdownPreprocessor";
import { useMemo } from "react";
import Icon from "@/components/Icon";

type Props = {
  role: "user" | "assistant";
  content: string;
  imageUrl?: string;
  riskDetected?: boolean;
  isMother?: boolean;
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

export default function ChatBubble({ role, content, imageUrl, riskDetected, isMother }: Props) {
  const isUser = role === "user";
  
  // Intelligently preprocess content to handle any format
  const processedContent = useMemo(() => {
    if (!content) return "";

    // Preserve user text exactly as typed (avoid auto ":" normalization)
    if (isUser) {
      return content;
    }

    // First, try to preprocess markdown
    let processed = preprocessMarkdown(content);

    // If it's plain text, format it intelligently
    if (isPlainText(processed)) {
      processed = formatPlainText(processed);
    }

    return processed;
  }, [content, isUser]);
  
  return (
    <div className={`flex gap-3 sm:gap-4 ${isUser ? "justify-end" : "justify-start"} items-start mb-6 sm:mb-8 animate-in fade-in slide-in-from-bottom-2 duration-500`}>
      {!isUser && (
        <div className="flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-white flex items-center justify-center shadow-lg border border-pink-100/50 group hover:scale-110 transition-transform duration-300">
          <Icon name="ai" size={28} className="sm:w-[32px] sm:h-[32px]" />
        </div>
      )}
      <div className="flex flex-col gap-2 max-w-[85%] sm:max-w-[80%] md:max-w-[70%]">
      <div
        className={`rounded-3xl transition-all select-text hover:shadow-xl ${
          isUser
            ? "bg-gradient-to-br from-pink-500 to-pink-600 text-white rounded-tr-sm shadow-lg shadow-pink-100/50"
            : "bg-white text-slate-800 border border-slate-100 rounded-tl-sm shadow-lg shadow-slate-200/50"
        }`}
      >
        {/* Image (if present) */}
        {imageUrl && (
          <div className="relative w-full rounded-t-3xl overflow-hidden bg-slate-50 border-b border-slate-100">
            <div className="relative w-full h-40 sm:h-48 md:h-64">
              <Image
                src={imageUrl}
                alt="Attached image"
                fill
                className="object-contain p-2"
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
          <div className={`px-4 sm:px-5 md:px-6 py-3 sm:py-4 text-sm sm:text-base leading-relaxed ${imageUrl ? 'pt-3' : ''} ${isUser ? 'text-white' : 'text-slate-800'}`}>
            <MarkdownRenderer content={processedContent} isUser={isUser} />
          </div>
        )}
      </div>
      
      {/* Risk Detection Indicator - Only for assistant messages when risk is detected */}
      {!isUser && riskDetected && isMother && (
        <div className="flex items-center gap-2 bg-amber-50/90 backdrop-blur-sm border border-amber-200/50 rounded-2xl px-3 py-2 shadow-sm animate-in slide-in-from-bottom-2 fade-in duration-300">
          <div className="flex items-center gap-1.5 flex-1">
            <Icon name="warning" size={14} className="text-amber-600 flex-shrink-0" />
            <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wide">Risk Detected</span>
          </div>
          <Link 
            href="/mother/dashboard?tab=progress" 
            className="bg-amber-600 hover:bg-amber-700 text-white px-2.5 py-1 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all active:scale-95 shadow-sm hover:shadow-md"
          >
            View Report
          </Link>
        </div>
      )}
      </div>
      {isUser && (
        <div className="flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-white flex items-center justify-center shadow-lg border border-blue-100/50 group hover:scale-110 transition-transform duration-300">
          <Icon name="mom" size={28} className="sm:w-[32px] sm:h-[32px]" />
        </div>
      )}
    </div>
  );
}
