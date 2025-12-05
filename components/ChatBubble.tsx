"use client";

type Props = {
  role: "user" | "assistant";
  content: string;
};

export default function ChatBubble({ role, content }: Props) {
  const isUser = role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-xl whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-relaxed shadow ${
          isUser
            ? "bg-pink-500 text-white"
            : "bg-white text-slate-800 border border-slate-100"
        }`}
      >
        {content}
      </div>
    </div>
  );
}

