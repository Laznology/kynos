import { LockKey, SignIn } from "@phosphor-icons/react";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";

import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { loginFn } from "../lib/server-api";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

const LoginPage = () => {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const pwd = (formData.get("password") as string)?.trim() || password.trim();
    if (!pwd) {
      setError("Enter admin password");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await loginFn(pwd);
      if (res.ok) {
        await router.invalidate();
        window.location.href = "/";
        return;
      }
      setError(res.error || "Incorrect password");
    } catch {
      setError("Failed to connect to server");
    }
    setLoading(false);
  };

  return (
    <div className="flex h-full w-full items-center justify-center p-4">
      <div className="border-border bg-card w-full max-w-sm rounded-2xl border p-6 shadow-xl">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="bg-primary text-primary-foreground mb-3 flex h-11 w-11 items-center justify-center rounded-xl shadow-sm">
            <LockKey className="h-5 w-5" weight="fill" />
          </div>
          <h1 className="text-foreground text-base font-semibold tracking-tight">
            Kynos Console
          </h1>
          <p className="text-muted-foreground mt-1 text-xs">
            Restricted access. Enter admin password.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Input
              autoFocus
              id="password"
              name="password"
              type="password"
              placeholder="Admin Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="font-mono text-xs"
            />
          </div>

          {error && (
            <div className="border-destructive/30 bg-destructive/15 text-destructive rounded-xl border px-3 py-2 font-mono text-xs">
              {error}
            </div>
          )}

          <Button
            type="submit"
            disabled={loading}
            className="w-full gap-2 text-xs"
          >
            <SignIn className="h-4 w-4" />
            {loading ? "Verifying..." : "Sign In"}
          </Button>
        </form>
      </div>
    </div>
  );
};
