import { NextResponse } from "next/server";
import { getByAgentId } from "@/lib/appointment/repo";
import { APPOINTMENT_CONNECTOR_KEY } from "@/lib/appointment/tools";
import {
  requireSetupContext,
  type SetupContext,
} from "@/lib/auth/http-connector-auth";
import { authErrorResponse } from "@/lib/auth/http";
import { requireAuth } from "@/lib/auth/requireAuth";

export async function requireConnectorSetupAuth(
  request: Request,
  agentIdFromPath: string,
): Promise<
  | { ok: true; claims: SetupContext; userId: string }
  | { ok: false; response: NextResponse }
> {
  let userId: string;
  try {
    userId = await requireAuth(request);
  } catch (error) {
    return {
      ok: false,
      response:
        authErrorResponse(error) ??
        NextResponse.json(
          { ok: false, error: "Unauthorized" },
          { status: 401 },
        ),
    };
  }

  let claims: SetupContext;
  try {
    claims = requireSetupContext(request);
  } catch (error) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          ok: false,
          error:
            error instanceof Error ? error.message : "Unauthorized",
        },
        { status: 401 },
      ),
    };
  }

  if (claims.agentId !== agentIdFromPath) {
    return {
      ok: false,
      response: NextResponse.json(
        { ok: false, error: "agentId mismatch" },
        { status: 403 },
      ),
    };
  }

  if (claims.connectorKey !== APPOINTMENT_CONNECTOR_KEY) {
    return {
      ok: false,
      response: NextResponse.json(
        { ok: false, error: "connectorKey mismatch" },
        { status: 403 },
      ),
    };
  }

  return { ok: true, claims, userId };
}

/** When a connector already exists, only its owner may manage it. */
export async function requireConnectorOwner(
  agentId: string,
  userId: string,
): Promise<
  | {
      ok: true;
      connector: Awaited<ReturnType<typeof getByAgentId>>;
    }
  | { ok: false; response: NextResponse }
> {
  const connector = await getByAgentId(agentId);
  if (connector && connector.userId !== userId) {
    return {
      ok: false,
      response: NextResponse.json(
        { ok: false, error: "Forbidden" },
        { status: 403 },
      ),
    };
  }
  return { ok: true, connector };
}
