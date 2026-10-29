import { LockKey, SignIn } from "@phosphor-icons/react";
import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { useState } from "react";

import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { loginFn } from "../lib/server-api";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setError("Masukkan password admin");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await loginFn(password);
      if (res.ok) {
        window.location.href = "/";
      } else {
        setError(res.error || "Password salah");
      }
    } catch {
      setError("Gagal menghubungi server");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-full w-full items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-lg border border-white/10 bg-[#0c0c0e] p-6 shadow-2xl">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-md border border-white/15 bg-white/[0.05] text-zinc-100">
            <LockKey className="h-5 w-5" weight="fill" />
          </div>
          <h1 className="text-base font-semibold tracking-tight text-zinc-100">
            Kynos Console
          </h1>
          <p className="mt-1 font-mono text-xs text-zinc-500">
            Akses dibatasi. Masukkan password admin.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Input
              autoFocus
              type="password"
              placeholder="Admin Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-black/40 border-white/10 text-xs font-mono"
            />
          </div>

          {error && (
            <div className="rounded border border-red-500/20 bg-red-500/10 px-2.5 py-1.5 font-mono text-[11px] text-red-400">
              {error}
            </div>
          )}

          <Button
            type="submit"
            disabled={loading}
            className="w-full gap-2 text-xs"
          >
            <SignIn className="h-4 w-4" />
            {loading ? "Memverifikasi..." : "Masuk"}
          </Button>
        </form>
      </div>
    </div>
  );
}
