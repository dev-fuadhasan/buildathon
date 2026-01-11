"use client";

import Image from "next/image";
import ReactMarkdown from "react-markdown";

type Props = {
  role: "user" | "assistant";
  content: string;
  imageUrl?: string;
};

export default function ChatBubble({ role, content, imageUrl }: Props) {
  const isUser = role === "user";
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
            <ReactMarkdown
              components={{
                // Customize heading styles
                h1: ({node, ...props}) => <h1 className={`text-xl font-bold mb-3 mt-2 first:mt-0 ${isUser ? 'text-white' : 'text-slate-900'}`} {...props} />,
                h2: ({node, ...props}) => <h2 className={`text-lg font-bold mb-2 mt-4 first:mt-0 ${isUser ? 'text-white' : 'text-slate-900'}`} {...props} />,
                h3: ({node, ...props}) => <h3 className={`text-base font-bold mb-2 mt-3 first:mt-0 ${isUser ? 'text-white' : 'text-slate-900'}`} {...props} />,
                h4: ({node, ...props}) => <h4 className={`text-sm font-bold mb-1.5 mt-2 first:mt-0 ${isUser ? 'text-white' : 'text-slate-900'}`} {...props} />,
                // Customize list styles
                ul: ({node, ...props}) => <ul className={`list-disc list-outside mb-3 ml-4 space-y-1.5 ${isUser ? 'text-white' : 'text-slate-800'}`} {...props} />,
                ol: ({node, ...props}) => <ol className={`list-decimal list-outside mb-3 ml-4 space-y-1.5 ${isUser ? 'text-white' : 'text-slate-800'}`} {...props} />,
                li: ({node, ...props}) => <li className={`${isUser ? 'text-white' : 'text-slate-800'}`} {...props} />,
                // Customize paragraph
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
                    <code className={`px-1 py-0.5 rounded bg-opacity-20 ${isUser ? 'bg-white bg-opacity-20 text-white' : 'bg-slate-200 text-slate-900'} text-xs font-mono`} {...props} />
                  ) : (
                    <code className={`block p-2 rounded mb-2 text-xs font-mono overflow-x-auto ${isUser ? 'bg-white bg-opacity-10 text-white' : 'bg-slate-100 text-slate-900'}`} {...props} />
                  );
                },
              }}
            >
              {content}
            </ReactMarkdown>
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

