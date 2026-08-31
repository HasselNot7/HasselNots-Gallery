"use client";

import { useEffect, useState } from "react";
import { Alert, Button, Card, Input, Label, TextArea, TextField } from "@heroui/react";
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
      .then((d) => {
        if (Array.isArray(d)) setComments(d);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [photoId, articleId]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!author.trim() || !content.trim()) {
      setError("请填写昵称和评论内容");
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
        setError(d.detail || "评论发送失败");
        return;
      }
      const c = await res.json();
      setComments((prev) => [...prev, c]);
      setContent("");
    } catch {
      setError("评论发送失败");
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
      <h2 className="text-headline-lg text-primary mb-6" style={{ fontFamily: "'JetBrains Mono', 'Noto Serif SC', monospace" }}>{title}</h2>

      {loading ? (
        <p className="text-metadata-sm text-outline">加载评论中...</p>
      ) : comments.length === 0 ? (
        <p className="text-metadata-sm text-outline mb-6">还没有评论 — 来抢沙发。</p>
      ) : (
        <div className="flex flex-col gap-4 mb-8">
          {comments.map((c) => (
            <Card key={c.id} className="p-4">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-label-caps text-primary font-bold">{c.author}</span>
                <div className="flex items-center gap-3">
                  <span className="text-metadata-sm text-outline" style={{ fontFamily: "'JetBrains Mono', 'Noto Serif SC', monospace" }}>
                    {new Date(c.created_at).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
                  </span>
                  {authed && (
                    <Button size="sm" variant="ghost" className="text-outline hover:text-[var(--danger)]" onPress={() => removeComment(c.id)} aria-label="删除评论">
                      <span className="material-symbols-outlined text-[16px]">delete</span>
                    </Button>
                  )}
                </div>
              </div>
              <p className="text-body-md text-on-surface whitespace-pre-wrap">{c.content}</p>
            </Card>
          ))}
        </div>
      )}

      <form onSubmit={submit} className="flex flex-col gap-3 max-w-xl">
        <TextField className="w-full" value={author} onChange={setAuthor}>
          <Label className="text-label-caps text-outline">昵称</Label>
          <Input maxLength={50} placeholder="你的昵称" variant="secondary" />
        </TextField>
        <TextField className="w-full" value={content} onChange={setContent}>
          <Label className="text-label-caps text-outline">评论内容</Label>
          <TextArea maxLength={2000} rows={3} placeholder="说点什么…" />
        </TextField>
        {error && (
          <Alert status="danger">
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Description>{error}</Alert.Description>
            </Alert.Content>
          </Alert>
        )}
        <Button type="submit" isPending={posting} isDisabled={posting} className="self-start px-6">
          {posting ? "发送中..." : "发表评论"}
        </Button>
      </form>
    </div>
  );
}
