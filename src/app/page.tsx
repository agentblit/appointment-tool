import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex max-w-2xl flex-1 flex-col justify-center gap-4 px-6 py-16">
      <h1 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
        Appointment Tool
      </h1>
      <p className="text-sm text-zinc-500">
        HTTP connector service for Agentblit. Use{" "}
        <code className="text-xs font-mono">/api/health</code> for probes and{" "}
        <code className="text-xs font-mono">/api/1.0/*</code> for the connector
        contract.
      </p>
      <Link
        href="/api/health"
        className="cursor-pointer text-sm text-zinc-900 underline dark:text-zinc-50"
      >
        Health check
      </Link>
    </main>
  );
}
