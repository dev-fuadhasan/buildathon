"use client";

import Image from "next/image";

type Props = {
  role: "user" | "assistant";
  content: string;
  imageUrl?: string;
};

export default function ChatBubble({ role, content, imageUrl }: Props) {
  const isUser = role === "user";
  return (
    <div className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"} items-start mb-4`}>
      {!isUser && (
        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-pink-400 to-pink-600 flex items-center justify-center text-white font-bold text-sm shadow-lg ring-2 ring-pink-200">
          AI
        </div>
      )}
      <div
        className={`max-w-[80%] md:max-w-[70%] rounded-2xl shadow-lg transition-all ${
          isUser
            ? "bg-gradient-to-br from-pink-500 to-pink-600 text-white rounded-br-sm"
            : "bg-white text-slate-800 border-2 border-slate-100 rounded-bl-sm"
        }`}
      >
        {/* Image (if present) */}
        {imageUrl && (
          <div className="relative w-full rounded-t-2xl overflow-hidden">
            <div className="relative w-full h-48 sm:h-64">
              <Image
                src={imageUrl}
                alt="Attached image"
                fill
                className="object-contain bg-slate-50"
              />
            </div>
          </div>
        )}
        
        {/* Text Content */}
        {content && (
          <div className={`px-5 py-3.5 text-base leading-relaxed whitespace-pre-wrap ${imageUrl ? 'pt-3' : ''}`}>
            <div className="prose prose-sm max-w-none">
              {content.split('\n').map((line, idx) => (
                <p key={idx} className={idx > 0 ? 'mt-2' : ''}>{line || '\u00A0'}</p>
              ))}
            </div>
          </div>
        )}
      </div>
      {isUser && (
        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold text-sm shadow-lg ring-2 ring-blue-200">
          You
        </div>
      )}
    </div>
  );
}

