"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { login, setToken } from "@/lib/api";

export default function LoginForm() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await login(username, password);
      setToken(res.access_token);
      router.push("/admin");
    } catch {
      setError("Invalid credentials. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <label className="text-metadata-sm text-on-surface-variant uppercase">Username</label>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="w-full bg-transparent border-0 border-b border-border-subtle focus:border-primary focus:ring-0 px-0 py-2 text-metadata-sm text-on-surface placeholder:text-outline-variant focus:outline-none"
          placeholder="admin"
          required
        />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-metadata-sm text-on-surface-variant uppercase">Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full bg-transparent border-0 border-b border-border-subtle focus:border-primary focus:ring-0 px-0 py-2 text-metadata-sm text-on-surface placeholder:text-outline-variant focus:outline-none"
          placeholder="••••••••"
          required
        />
      </div>
      {error && <p className="text-metadata-sm text-error">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-primary text-on-primary text-label-caps py-4 hover:bg-primary-container transition-all duration-300 disabled:opacity-50"
      >
        {loading ? "Authenticating..." : "Sign In"}
      </button>
    </form>
  );
}
