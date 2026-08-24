"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { login, register, setToken } from "@/lib/api";

export default function LoginForm() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (mode === "login") {
        const res = await login(username, password);
        setToken(res.access_token);
        router.push("/admin");
      } else {
        await register(username, password);
        setMode("login");
        setPassword("");
        setError("");
        alert("注册成功！账号已提交，等待管理员授权后方可登录。");
      }
    } catch (err: any) {
      try {
        const detail = JSON.parse(err?.message || "{}").detail;
        setError(typeof detail === "string" ? detail : "Invalid credentials. Please try again.");
      } catch {
        setError("Invalid credentials. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <label className="text-metadata-sm text-on-surface-variant uppercase">用户名</label>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="w-full bg-transparent border-0 border-b border-border-subtle focus:border-primary focus:ring-0 px-0 py-2 text-metadata-sm text-on-surface placeholder:text-outline-variant focus:outline-none"
          placeholder="用户名"
          required
        />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-metadata-sm text-on-surface-variant uppercase">密码（至少 6 位）</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full bg-transparent border-0 border-b border-border-subtle focus:border-primary focus:ring-0 px-0 py-2 text-metadata-sm text-on-surface placeholder:text-outline-variant focus:outline-none"
          placeholder="••••••••"
          required
          minLength={6}
        />
      </div>
      {error && <p className="text-metadata-sm text-error">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-primary text-on-primary text-label-caps py-4 hover:bg-primary-container transition-all duration-300 disabled:opacity-50"
      >
        {loading ? (mode === "login" ? "登录中..." : "注册中...") : mode === "login" ? "登 录" : "注 册"}
      </button>

      <div className="flex items-center justify-center gap-2 text-metadata-sm text-outline">
        <span>{mode === "login" ? "还没有账号？" : "已有账号？"}</span>
        <button
          type="button"
          onClick={() => {
            setMode(mode === "login" ? "register" : "login");
            setError("");
          }}
          className="text-primary hover:underline underline-offset-4"
        >
          {mode === "login" ? "注册" : "去登录"}
        </button>
      </div>
    </form>
  );
}
