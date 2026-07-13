import { NextResponse } from "next/server";
import {
  deleteConnectorByAgentId,
  getForWorkspaceAgent,
} from "@/lib/appointment/repo";
import { requireAgentHeaders } from "@/lib/auth/http-connector-auth";

export async function POST(request: Request) {
  let agentId: string;
  let workspaceId: string;
  try {
    ({ agentId, workspaceId } = requireAgentHeaders(request));
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Missing agent headers",
      },
      { status: 401 },
    );
  }

  const connector = await getForWorkspaceAgent({ agentId, workspaceId });
  if (connector) {
    await deleteConnectorByAgentId(agentId);
  }
  return NextResponse.json({ ok: true });
}
