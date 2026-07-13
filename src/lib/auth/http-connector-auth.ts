import { z } from "zod";

export const AGENT_ID_HEADER = "x-agentblit-agent-id";
export const WORKSPACE_ID_HEADER = "x-agentblit-workspace-id";

const setupContextSchema = z.object({
  workspaceId: z.string().min(1),
  agentId: z.string().min(1),
  connectorKey: z.string().min(1),
});

export type SetupContext = z.infer<typeof setupContextSchema>;

/** Read setup context from query params (no signed token). */
export function requireSetupContext(request: Request): SetupContext {
  const url = new URL(request.url);
  const parsed = setupContextSchema.safeParse({
    workspaceId: url.searchParams.get("workspaceId")?.trim() ?? "",
    agentId: url.searchParams.get("agentId")?.trim() ?? "",
    connectorKey: url.searchParams.get("connectorKey")?.trim() ?? "",
  });
  if (!parsed.success) {
    throw new Error(
      "Missing agentId, workspaceId, or connectorKey query params",
    );
  }
  return parsed.data;
}

export function getAgentIdFromRequest(request: Request): string | null {
  return request.headers.get(AGENT_ID_HEADER)?.trim() || null;
}

export function getWorkspaceIdFromRequest(request: Request): string | null {
  return request.headers.get(WORKSPACE_ID_HEADER)?.trim() || null;
}

export function requireAgentHeaders(request: Request): {
  agentId: string;
  workspaceId: string;
} {
  const agentId = getAgentIdFromRequest(request);
  const workspaceId = getWorkspaceIdFromRequest(request);
  if (!agentId || !workspaceId) {
    throw new Error(
      "Missing X-Agentblit-Agent-Id or X-Agentblit-Workspace-Id header",
    );
  }
  return { agentId, workspaceId };
}
