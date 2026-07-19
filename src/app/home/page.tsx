"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { authClient } from "@/lib/auth-client";

export default function HomePage() {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();

  useEffect(() => {
    if (isPending) return;
    if (!session?.user) {
      router.replace("/login");
    }
  }, [isPending, session, router]);

  async function signOut() {
    await authClient.signOut();
    router.replace("/login");
  }

  if (isPending || !session?.user) {
    return (
      <main className="mx-auto flex max-w-lg flex-1 flex-col justify-center gap-3 px-6 py-16">
        <p className="text-sm text-zinc-500">Loading…</p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex max-w-lg flex-1 flex-col justify-center gap-4 px-6 py-16">
      <h1 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
        Signed in
      </h1>
      <p className="text-sm text-zinc-500">
        You are signed in as{" "}
        <span className="font-medium text-zinc-900 dark:text-zinc-100">
          {session.user.email}
        </span>
        . Open setup from Agentblit (Add tool) to configure appointments for an
        agent.
      </p>
      <button
        type="button"
        onClick={() => void signOut()}
        className="inline-flex h-10 w-fit cursor-pointer items-center justify-center rounded-md border border-zinc-300 bg-transparent px-4 text-sm font-medium text-zinc-900 dark:border-zinc-700 dark:text-zinc-100"
      >
        Sign out
      </button>
    </main>
  );
}
