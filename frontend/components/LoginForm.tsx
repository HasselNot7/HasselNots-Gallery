"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, Button, TextField, Input, FieldError } from "@heroui/react";
import { login, register, setToken } from "@/lib/api";

export default function LoginForm() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const resetMessages = () => {
    setError("");
    setSuccess("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();
    if (mode === "register" && password !== confirmPassword) {
      setError("两次输入的密码不一致");
      return;
    }
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
        setConfirmPassword("");
        setSuccess("注册成功！账号已提交，等待管理员授权后方可登录。");
      }
    } catch (err: any) {
      try {
        const detail = JSON.parse(err?.message || "{}").detail;
        setError(
          typeof detail === "string"
            ? detail === "Invalid credentials"
              ? "账号或密码错误，请重试"
              : detail
            : "出错了，请稍后再试"
        );
      } catch {
        setError("出错了，请稍后再试");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {mode === "register" && success && (
        <Alert status="success">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Description>{success}</Alert.Description>
          </Alert.Content>
        </Alert>
      )}
      {error && (
        <Alert status="danger">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Description>{error}</Alert.Description>
          </Alert.Content>
        </Alert>
      )}

      <TextField
        name="username"
        value={username}
        onChange={(v) => {
          setUsername(v);
          resetMessages();
        }}
      >
        <label className="text-metadata-sm text-on-surface-variant uppercase">用户名</label>
        <Input
          type="text"
          autoComplete="username"
          placeholder="用户名"
          className="rounded-none border-0 border-b border-border-subtle bg-transparent shadow-none focus:ring-0"
        />
      </TextField>

      <TextField
        name="password"
        type="password"
        value={password}
        onChange={(v) => {
          setPassword(v);
          resetMessages();
        }}
      >
        <label className="text-metadata-sm text-on-surface-variant uppercase">
          {mode === "register" ? "密码（至少 6 位）" : "密码"}
        </label>
        <Input
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          placeholder="••••••••"
          minLength={6}
          className="rounded-none border-0 border-b border-border-subtle bg-transparent shadow-none focus:ring-0"
        />
      </TextField>

      {mode === "register" && (
        <TextField
          name="confirmPassword"
          type="password"
          value={confirmPassword}
          onChange={(v) => {
            setConfirmPassword(v);
            resetMessages();
          }}
        >
          <label className="text-metadata-sm text-on-surface-variant uppercase">确认密码</label>
          <Input
            autoComplete="new-password"
            placeholder="••••••••"
            minLength={6}
            className="rounded-none border-0 border-b border-border-subtle bg-transparent shadow-none focus:ring-0"
          />
          <FieldError>两次输入的密码不一致</FieldError>
        </TextField>
      )}

      <Button type="submit" isDisabled={loading} fullWidth className="mt-2 py-4">
        {loading ? (mode === "login" ? "登录中..." : "注册中...") : mode === "login" ? "登 录" : "注 册"}
      </Button>

      <div className="flex items-center justify-center gap-2 text-metadata-sm text-outline">
        <span>{mode === "login" ? "还没有账号？" : "已有账号？"}</span>
        <button
          type="button"
          onClick={() => {
            setMode(mode === "login" ? "register" : "login");
            resetMessages();
            setConfirmPassword("");
          }}
          className="text-primary hover:underline underline-offset-4"
        >
          {mode === "login" ? "注册" : "去登录"}
        </button>
      </div>
    </form>
  );
}
