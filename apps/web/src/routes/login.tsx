import { LockKey, SignIn } from "@phosphor-icons/react";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";

import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { loginFn } from "../lib/server-api";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
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
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-xl">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
            <LockKey className="h-5 w-5" weight="fill" />
          </div>
          <h1 className="text-base font-semibold tracking-tight text-foreground">
            Kynos Console
          </h1>
          <p className="mt-1 text-xs text-muted-foreground">
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
              className="font-mono text-xs"
            />
          </div>

          {error && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/15 px-3 py-2 font-mono text-xs text-destructive">
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
