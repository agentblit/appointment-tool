import { NextResponse } from "next/server";
import { APPOINTMENT_CONNECTOR_KEY } from "@/lib/appointment/tools";
import { requireSetupContext } from "@/lib/auth/http-connector-auth";

export async function GET(request: Request) {
  let claims;
  try {
    claims = requireSetupContext(request);
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unauthorized",
      },
      { status: 401 },
    );
  }

  if (claims.connectorKey !== APPOINTMENT_CONNECTOR_KEY) {
    return NextResponse.json(
      { ok: false, error: "connectorKey mismatch" },
      { status: 403 },
    );
  }

  const appUrl = process.env.AGENTBLIT_APP_URL?.trim().replace(/\/$/, "");
  if (!appUrl) {
    return NextResponse.json(
      { ok: false, error: "Missing AGENTBLIT_APP_URL" },
      { status: 500 },
    );
  }

  const redirectTo = `${appUrl}/workspace/${encodeURIComponent(claims.workspaceId)}/agent/${encodeURIComponent(claims.agentId)}?connector_setup=${APPOINTMENT_CONNECTOR_KEY}`;
  return NextResponse.redirect(redirectTo);
}
