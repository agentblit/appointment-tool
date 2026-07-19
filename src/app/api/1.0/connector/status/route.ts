import { NextResponse } from "next/server";
import { getByAgentId } from "@/lib/appointment/repo";
import { requireAgentHeaders } from "@/lib/auth/http-connector-auth";

function configurationUrl(request: Request): string {
  const publicBase = process.env.PUBLIC_BASE_URL?.trim().replace(/\/$/, "");
  if (publicBase) {
    return `${publicBase}/setup`;
  }
  const origin = new URL(request.url).origin;
  return `${origin}/setup`;
}

export async function GET(request: Request) {
  let agentId: string;
  try {
    ({ agentId } = requireAgentHeaders(request));
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Missing agent headers",
      },
      { status: 401 },
    );
  }

  const connector = await getByAgentId(agentId);
  return NextResponse.json({
    status: connector ? "configured" : "setup_required",
    configuration_url: configurationUrl(request),
  });
}
