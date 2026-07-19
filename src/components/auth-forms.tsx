"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { authClient } from "@/lib/auth-client";

const inputClassName =
  "h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-base text-zinc-900 outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50";
const labelClassName =
  "mb-1.5 block text-sm font-semibold text-zinc-900 dark:text-zinc-100";
const buttonPrimaryClassName =
  "inline-flex h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-md bg-zinc-900 px-4 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900";

export type AuthFormMode = "login" | "signup";

type AuthFormsProps = {
  mode?: AuthFormMode;
  nextPath?: string | null;
  queryError?: string | null;
};

function resolveAfterAuth(nextPath: string | null | undefined): string {
  if (nextPath?.startsWith("/")) {
    return nextPath;
  }
  return "/home";
}

export function AuthForms({
  mode = "login",
  nextPath = null,
  queryError = null,
}: AuthFormsProps) {
  const router = useRouter();
  const { data: session, isPending: sessionPending } = authClient.useSession();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [loading, setLoading] = useState(false);
  const error = submitError || queryError || "";

  useEffect(() => {
    if (sessionPending || !session?.user) return;
    router.replace(resolveAfterAuth(nextPath));
  }, [sessionPending, session, nextPath, router]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitError("");
    setLoading(true);
    try {
      if (mode === "signup") {
        const result = await authClient.signUp.email({
          name: name.trim() || email,
          email,
          password,
        });
        if (result.error) {
          setSubmitError(result.error.message ?? "Couldn't create account");
          return;
        }
      } else {
        const result = await authClient.signIn.email({
          email,
          password,
        });
        if (result.error) {
          setSubmitError(result.error.message ?? "Couldn't sign in");
          return;
        }
      }

      router.push(resolveAfterAuth(nextPath));
    } catch {
      setSubmitError("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  }

  if (sessionPending || session?.user) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
        <p className="text-sm text-zinc-500">Loading…</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-md rounded-md border border-zinc-300 bg-white p-8 dark:border-zinc-700 dark:bg-zinc-950 sm:p-10">
        <h1 className="mb-1 text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          {mode === "login" ? "Welcome back" : "Create account"}
        </h1>
        <p className="mb-6 text-sm text-zinc-500">
          {mode === "login"
            ? "Sign in to use the appointment tool."
            : "Sign up to configure appointment booking."}
        </p>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          {error ? (
            <div
              className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300"
              role="alert"
            >
              {error}
            </div>
          ) : null}
          {mode === "signup" ? (
            <div>
              <label htmlFor="auth-name" className={labelClassName}>
                Name
              </label>
              <input
                id="auth-name"
                type="text"
                autoComplete="name"
                className={inputClassName}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Jane Doe"
              />
            </div>
          ) : null}
          <div>
            <label htmlFor="auth-email" className={labelClassName}>
              Email
            </label>
            <input
              id="auth-email"
              type="email"
              autoComplete="email"
              className={inputClassName}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label htmlFor="auth-password" className={labelClassName}>
              Password{" "}
              {mode === "signup" ? (
                <span className="font-normal text-zinc-500">
                  (8+ characters)
                </span>
              ) : null}
            </label>
            <input
              id="auth-password"
              type="password"
              autoComplete={
                mode === "login" ? "current-password" : "new-password"
              }
              className={inputClassName}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
            />
          </div>
          <button
            type="submit"
            className={buttonPrimaryClassName}
            disabled={loading}
          >
            {loading
              ? mode === "login"
                ? "Signing in…"
                : "Creating…"
              : mode === "login"
                ? "Sign in"
                : "Create account"}
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-zinc-500">
          {mode === "login" ? (
            <>
              No account?{" "}
              <Link
                href={
                  nextPath
                    ? `/signup?next=${encodeURIComponent(nextPath)}`
                    : "/signup"
                }
                className="font-medium text-zinc-900 underline dark:text-zinc-50"
              >
                Sign up
              </Link>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <Link
                href={
                  nextPath
                    ? `/login?next=${encodeURIComponent(nextPath)}`
                    : "/login"
                }
                className="font-medium text-zinc-900 underline dark:text-zinc-50"
              >
                Sign in
              </Link>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
