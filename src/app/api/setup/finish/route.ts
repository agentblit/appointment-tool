import { NextResponse } from "next/server";
import { APPOINTMENT_CONNECTOR_KEY } from "@/lib/appointment/tools";
import { requireSetupContext } from "@/lib/auth/http-connector-auth";
import { authErrorResponse } from "@/lib/auth/http";
import { requireAuth } from "@/lib/auth/requireAuth";

export async function GET(request: Request) {
  try {
    await requireAuth(request);
  } catch (error) {
    return (
      authErrorResponse(error) ??
      NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
    );
  }

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

  const redirectTo = `${appUrl}/api/http-connectors/setup-complete?agentId=${encodeURIComponent(claims.agentId)}&connectorKey=${encodeURIComponent(APPOINTMENT_CONNECTOR_KEY)}`;
  return NextResponse.redirect(redirectTo);
}
