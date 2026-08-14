"use client";

import { useEffect, useState } from "react";
import { isAuthenticated, getToken } from "@/lib/api";

interface CommentItem {
  id: number;
  photo_id: number | null;
  article_id: number | null;
  author: string;
  content: string;
  created_at: string;
}

export default function CommentSection({
  photoId,
  articleId,
  title,
}: {
  photoId?: number;
  articleId?: string;
  title: string;
}) {
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [author, setAuthor] = useState("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState("");
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    setAuthed(isAuthenticated());
    const qs = photoId ? `photo_id=${photoId}` : `article_id=${articleId}`;
    fetch(`/api/comments?${qs}`)
      .then((r) => r.json())
      .then(setComments)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [photoId, articleId]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!author.trim() || !content.trim()) {
      setError("Name and comment are required");
      return;
    }
    setPosting(true);
    setError("");
    try {
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          photo_id: photoId ?? null,
          article_id: articleId ?? null,
          author: author.trim(),
          content: content.trim(),
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.detail || "Failed to post comment");
        return;
      }
      const c = await res.json();
      setComments((prev) => [...prev, c]);
      setContent("");
    } catch {
      setError("Failed to post comment");
    } finally {
      setPosting(false);
    }
  };

  const removeComment = async (id: number) => {
    try {
      await fetch(`/api/comments/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      setComments((prev) => prev.filter((c) => c.id !== id));
    } catch {
      // ignore
    }
  };

  return (
    <div className="mt-12 border-t border-border-subtle pt-8">
      <h2 className="text-headline-lg text-primary mb-6">{title}</h2>

      {loading ? (
        <p className="text-metadata-sm text-outline">Loading comments...</p>
      ) : comments.length === 0 ? (
        <p className="text-metadata-sm text-outline mb-6">No comments yet — be the first.</p>
      ) : (
        <div className="flex flex-col gap-4 mb-8">
          {comments.map((c) => (
            <div key={c.id} className="border border-border-subtle bg-surface-container-low p-4 rounded-md">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-label-caps text-primary font-bold">{c.author}</span>
                <div className="flex items-center gap-3">
                  <span className="text-metadata-sm text-outline" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                    {new Date(c.created_at).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
                  </span>
                  {authed && (
                    <button
                      onClick={() => removeComment(c.id)}
                      className="text-metadata-sm text-outline hover:text-error transition-colors"
                      title="Delete comment"
                    >
                      delete
                    </button>
                  )}
                </div>
              </div>
              <p className="text-body-md text-on-surface whitespace-pre-wrap">{c.content}</p>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={submit} className="flex flex-col gap-3 max-w-xl">
        <div className="flex flex-col gap-1">
          <label className="text-label-caps text-outline uppercase">Name</label>
          <input
            type="text"
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            maxLength={50}
            className="w-full border-b border-border-subtle bg-transparent py-2 text-body-md focus:outline-none focus:border-primary"
            placeholder="Your name"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-label-caps text-outline uppercase">Comment</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            maxLength={2000}
            rows={3}
            className="w-full border border-border-subtle bg-surface p-3 text-body-md focus:outline-none focus:border-primary resize-none rounded-md"
            placeholder="Share your thoughts..."
          />
        </div>
        {error && <p className="text-metadata-sm text-error">{error}</p>}
        <button
          type="submit"
          disabled={posting}
          className="btn-primary !py-3 self-start"
        >
          {posting ? "Posting..." : "Post Comment"}
        </button>
      </form>
    </div>
  );
}
