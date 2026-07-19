import { z } from "zod";

const setupContextSchema = z.object({
  agentId: z.string().min(1),
  connectorKey: z.string().min(1),
});

export type SetupContext = z.infer<typeof setupContextSchema>;

/** Read setup context from query params (no signed token). */
export function requireSetupContext(request: Request): SetupContext {
  const url = new URL(request.url);
  const parsed = setupContextSchema.safeParse({
    agentId: url.searchParams.get("agentId")?.trim() ?? "",
    connectorKey: url.searchParams.get("connectorKey")?.trim() ?? "",
  });
  if (!parsed.success) {
    throw new Error("Missing agentId or connectorKey query params");
  }
  return parsed.data;
}

export const AGENT_ID_HEADER = "x-agentblit-agent-id";

export function getAgentIdFromRequest(request: Request): string | null {
  return request.headers.get(AGENT_ID_HEADER)?.trim() || null;
}

export function requireAgentHeaders(request: Request): {
  agentId: string;
} {
  const agentId = getAgentIdFromRequest(request);
  if (!agentId) {
    throw new Error("Missing X-Agentblit-Agent-Id header");
  }
  return { agentId };
}
