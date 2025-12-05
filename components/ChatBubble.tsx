"use client";

type Props = {
  role: "user" | "assistant";
  content: string;
};

export default function ChatBubble({ role, content }: Props) {
  const isUser = role === "user";
  return (
    <div className={`flex gap-2 ${isUser ? "justify-end" : "justify-start"} items-start`}>
      {!isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-pink-400 to-pink-600 flex items-center justify-center text-white font-bold text-sm shadow-md">
          AI
        </div>
      )}
      <div
        className={`max-w-[75%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-md transition-all ${
          isUser
            ? "bg-gradient-to-br from-pink-500 to-pink-600 text-white rounded-br-sm"
            : "bg-white text-slate-800 border border-slate-200 rounded-bl-sm"
        }`}
      >
        <div className="prose prose-sm max-w-none">
          {content.split('\n').map((line, idx) => (
            <p key={idx} className={idx > 0 ? 'mt-2' : ''}>{line || '\u00A0'}</p>
          ))}
        </div>
      </div>
      {isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold text-sm shadow-md">
          You
        </div>
      )}
    </div>
  );
}

