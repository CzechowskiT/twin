"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { Button, Card, Input, Label, Shell } from "@/components/ui";
import { apiFetch } from "@/lib/api";
import { setToken } from "@/lib/auth";

type TokenResponse = { access_token: string };

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = new FormData(e.currentTarget);
    const gdpr = form.get("gdpr") === "on";
    if (!gdpr) {
      setError("You must accept the privacy policy.");
      return;
    }
    setLoading(true);
    try {
      await apiFetch("/api/v1/auth/register", {
        method: "POST",
        body: JSON.stringify({
          email: form.get("email"),
          password: form.get("password"),
          gdpr_consent: true,
        }),
      });
      const token = await apiFetch<TokenResponse>("/api/v1/auth/login/json", {
        method: "POST",
        body: JSON.stringify({
          email: form.get("email"),
          password: form.get("password"),
        }),
      });
      setToken(token.access_token);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Shell>
      <Card>
        <h1 className="mb-6 text-2xl font-semibold">Create account</h1>
        <form onSubmit={onSubmit}>
          <Label>Email</Label>
          <Input name="email" type="email" required autoComplete="email" />
          <Label>Password</Label>
          <Input name="password" type="password" required minLength={8} autoComplete="new-password" />
          <label className="mb-6 flex items-start gap-2 text-sm">
            <input name="gdpr" type="checkbox" className="mt-1" required />
            <span>
              I accept the{" "}
              <Link href="/privacy" className="underline" target="_blank">
                Privacy Policy
              </Link>{" "}
              and consent to processing my data for job matching (GDPR).
            </span>
          </label>
          {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
          <Button type="submit" disabled={loading}>
            {loading ? "Creating…" : "Register"}
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-zinc-500">
          Already have an account? <Link href="/login">Log in</Link>
        </p>
      </Card>
    </Shell>
  );
}
