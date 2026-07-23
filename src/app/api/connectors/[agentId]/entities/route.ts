import { NextResponse } from "next/server";
import { createEntity, listEntities } from "@/lib/appointment/repo";
import { appointmentEntitySchema } from "@/lib/appointment/tools";
import {
  requireConnectorOwner,
  requireConnectorSetupAuth,
} from "@/lib/auth/require-connector-setup-auth";

type RouteContext = {
  params: Promise<{ agentId: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  const { agentId } = await context.params;
  const auth = await requireConnectorSetupAuth(request, agentId);
  if (!auth.ok) {
    return auth.response;
  }

  const ownership = await requireConnectorOwner(agentId, auth.userId);
  if (!ownership.ok) {
    return ownership.response;
  }
  if (!ownership.connector) {
    return NextResponse.json(
      { ok: false, error: "Appointment connector is not configured" },
      { status: 400 },
    );
  }

  const entities = await listEntities(ownership.connector.id);
  return NextResponse.json({
    ok: true,
    entityLabel: ownership.connector.entityLabel,
    entities,
  });
}

export async function POST(request: Request, context: RouteContext) {
  const { agentId } = await context.params;
  const auth = await requireConnectorSetupAuth(request, agentId);
  if (!auth.ok) {
    return auth.response;
  }

  const ownership = await requireConnectorOwner(agentId, auth.userId);
  if (!ownership.ok) {
    return ownership.response;
  }
  if (!ownership.connector) {
    return NextResponse.json(
      { ok: false, error: "Save connector settings before adding entities" },
      { status: 400 },
    );
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const bodyParse = appointmentEntitySchema.safeParse(json);
  if (!bodyParse.success) {
    const issue = bodyParse.error.issues[0];
    return NextResponse.json(
      { ok: false, error: issue?.message ?? "Invalid request body" },
      { status: 400 },
    );
  }

  try {
    const entity = await createEntity({
      connectorId: ownership.connector.id,
      name: bodyParse.data.name,
      description: bodyParse.data.description,
      tags: bodyParse.data.tags,
    });
    return NextResponse.json({ ok: true, entity });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create entity";
    if (message.includes("unique")) {
      return NextResponse.json(
        { ok: false, error: "An entity with this name already exists" },
        { status: 400 },
      );
    }
    throw error;
  }
}
