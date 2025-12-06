"use client";

import { useState, useEffect } from "react";
import { useTranslation } from "@/hooks/useTranslation";
import { getLanguage } from "@/lib/i18n";

type Comment = {
  id: string;
  authorId: string;
  authorRole: "doctor" | "mother";
  content: string;
  createdAt: string;
  replies?: Comment[];
};

type Props = {
  questionId: string;
  userRole: "doctor" | "mother";
  userId: string;
  token: string;
  comments?: Comment[];
  onCommentAdded?: () => void;
};

export default function CommentSection({ questionId, userRole, userId, token, comments: initialComments, onCommentAdded }: Props) {
  const t = useTranslation();
  const lang = getLanguage();
  const [comments, setComments] = useState<Comment[]>(initialComments || []);
  const [newComment, setNewComment] = useState("");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (questionId) {
      loadComments();
    }
  }, [questionId]);

  // Sync with initialComments prop when it changes
  useEffect(() => {
    if (initialComments) {
      setComments(initialComments);
    }
    // Always reload from API to get latest comments when questionId or initialComments change
    if (questionId) {
      loadComments();
    }
  }, [initialComments, questionId]);

  const loadComments = async () => {
    try {
      const res = await fetch(`/api/questions/comments?questionId=${questionId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setComments(data.comments || []);
      }
    } catch (err) {
      console.error("Failed to load comments:", err);
    }
  };

  const submitComment = async () => {
    if (!newComment.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/questions/comments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          questionId,
          content: newComment,
        }),
      });
      if (res.ok) {
        setNewComment("");
        await loadComments();
        onCommentAdded?.();
      }
    } catch (err) {
      console.error("Failed to submit comment:", err);
    } finally {
      setLoading(false);
    }
  };

  const submitReply = async (parentCommentId: string) => {
    if (!replyText.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/questions/comments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          questionId,
          content: replyText,
          parentCommentId,
        }),
      });
      if (res.ok) {
        setReplyText("");
        setReplyingTo(null);
        await loadComments();
        onCommentAdded?.();
      }
    } catch (err) {
      console.error("Failed to submit reply:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <h4 className="font-semibold text-slate-800">
        {lang === "bn" ? "💬 মন্তব্য" : "💬 Comments"}
      </h4>

      {/* Add Comment */}
      <div className="space-y-2">
        <textarea
          className="input w-full h-24"
          placeholder={lang === "bn" ? "আপনার মন্তব্য লিখুন..." : "Write your comment..."}
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          disabled={loading}
        />
        <button
          onClick={submitComment}
          disabled={loading || !newComment.trim()}
          className="btn-primary text-sm"
        >
          {loading ? (lang === "bn" ? "জমা দেওয়া হচ্ছে..." : "Submitting...") : (lang === "bn" ? "মন্তব্য করুন" : "Add Comment")}
        </button>
      </div>

      {/* Comments List */}
      <div className="space-y-4">
        {comments.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-4">
            {lang === "bn" ? "কোন মন্তব্য নেই" : "No comments yet"}
          </p>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="border-l-2 border-blue-200 pl-4 space-y-2">
              <div className="bg-slate-50 rounded-lg p-3">
                <div className="flex items-start justify-between mb-1">
                  <span className="text-xs font-medium text-slate-600">
                    {comment.authorRole === "doctor" ? "👨‍⚕️ Doctor" : "👩 Mother"}
                  </span>
                  <span className="text-xs text-slate-500">
                    {new Date(comment.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-sm text-slate-700">{comment.content}</p>
                {(userRole === "mother" && comment.authorRole === "doctor") || 
                 (userRole === "doctor" && comment.authorRole === "mother") ? (
                  <button
                    onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
                    className="text-xs text-blue-600 hover:text-blue-700 mt-2"
                  >
                    {replyingTo === comment.id 
                      ? (lang === "bn" ? "বাতিল" : "Cancel")
                      : (lang === "bn" ? "↩️ উত্তর দিন" : "↩️ Reply")
                    }
                  </button>
                ) : null}
              </div>

              {/* Reply Input */}
              {replyingTo === comment.id && (
                <div className="ml-4 space-y-2">
                  <textarea
                    className="input w-full h-20 text-sm"
                    placeholder={lang === "bn" ? "আপনার উত্তর লিখুন..." : "Write your reply..."}
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    disabled={loading}
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => submitReply(comment.id)}
                      disabled={loading || !replyText.trim()}
                      className="btn-primary text-xs"
                    >
                      {loading ? (lang === "bn" ? "জমা দেওয়া হচ্ছে..." : "Submitting...") : (lang === "bn" ? "উত্তর দিন" : "Reply")}
                    </button>
                    <button
                      onClick={() => {
                        setReplyingTo(null);
                        setReplyText("");
                      }}
                      className="btn-secondary text-xs"
                    >
                      {lang === "bn" ? "বাতিল" : "Cancel"}
                    </button>
                  </div>
                </div>
              )}

              {/* Replies */}
              {comment.replies && comment.replies.length > 0 && (
                <div className="ml-4 mt-2 space-y-2">
                  {comment.replies.map((reply) => (
                    <div key={reply.id} className="bg-blue-50 rounded-lg p-2 border-l-2 border-blue-300">
                      <div className="flex items-start justify-between mb-1">
                        <span className="text-xs font-medium text-slate-600">
                          {reply.authorRole === "doctor" ? "👨‍⚕️ Doctor" : "👩 Mother"}
                        </span>
                        <span className="text-xs text-slate-500">
                          {new Date(reply.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-xs text-slate-700">{reply.content}</p>
                      {/* Reply button for replies */}
                      {(userRole === "mother" && reply.authorRole === "doctor") || 
                       (userRole === "doctor" && reply.authorRole === "mother") ? (
                        <button
                          onClick={() => setReplyingTo(replyingTo === reply.id ? null : reply.id)}
                          className="text-xs text-blue-600 hover:text-blue-700 mt-2"
                        >
                          {replyingTo === reply.id 
                            ? (lang === "bn" ? "বাতিল" : "Cancel")
                            : (lang === "bn" ? "↩️ উত্তর দিন" : "↩️ Reply")
                          }
                        </button>
                      ) : null}
                      {/* Reply input for replies */}
                      {replyingTo === reply.id && (
                        <div className="ml-4 mt-2 space-y-2">
                          <textarea
                            className="input w-full h-20 text-sm"
                            placeholder={lang === "bn" ? "আপনার উত্তর লিখুন..." : "Write your reply..."}
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            disabled={loading}
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => submitReply(reply.id)}
                              disabled={loading || !replyText.trim()}
                              className="btn-primary text-xs"
                            >
                              {loading ? (lang === "bn" ? "জমা দেওয়া হচ্ছে..." : "Submitting...") : (lang === "bn" ? "উত্তর দিন" : "Reply")}
                            </button>
                            <button
                              onClick={() => {
                                setReplyingTo(null);
                                setReplyText("");
                              }}
                              className="btn-secondary text-xs"
                            >
                              {lang === "bn" ? "বাতিল" : "Cancel"}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

