import { NextResponse } from "next/server";
import { APPOINTMENT_CONNECTOR_KEY } from "@/lib/appointment/tools";
import {
  requireSetupContext,
  type SetupContext,
} from "@/lib/auth/http-connector-auth";

export async function requireConnectorSetupAuth(
  request: Request,
  agentIdFromPath: string,
): Promise<
  | { ok: true; claims: SetupContext }
  | { ok: false; response: NextResponse }
> {
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

  return { ok: true, claims };
}
