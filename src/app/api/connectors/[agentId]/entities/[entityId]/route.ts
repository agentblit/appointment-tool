import { NextResponse } from "next/server";
import {
  deleteEntity,
  getEntityForWorkspace,
  getForWorkspaceAgent,
  updateEntity,
} from "@/lib/appointment/repo";
import { appointmentEntitySchema } from "@/lib/appointment/tools";
import { requireConnectorSetupAuth } from "@/lib/auth/require-connector-setup-auth";

type RouteContext = {
  params: Promise<{ agentId: string; entityId: string }>;
};

async function assertEntityOwnedByAgent(options: {
  workspaceId: string;
  agentId: string;
  entityId: string;
}) {
  const connector = await getForWorkspaceAgent({
    workspaceId: options.workspaceId,
    agentId: options.agentId,
  });
  if (!connector) {
    return null;
  }

  const row = await getEntityForWorkspace({
    workspaceId: options.workspaceId,
    entityId: options.entityId,
  });
  if (!row || row.connector.id !== connector.id) {
    return null;
  }
  return row;
}

export async function PUT(request: Request, context: RouteContext) {
  const { agentId, entityId } = await context.params;
  const auth = await requireConnectorSetupAuth(request, agentId);
  if (!auth.ok) {
    return auth.response;
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

  const owned = await assertEntityOwnedByAgent({
    workspaceId: auth.claims.workspaceId,
    agentId,
    entityId,
  });
  if (!owned) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }

  try {
    const updated = await updateEntity({
      entityId,
      name: bodyParse.data.name,
      description: bodyParse.data.description,
    });
    return NextResponse.json({ ok: true, entity: updated });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update entity";
    if (message.includes("unique")) {
      return NextResponse.json(
        { ok: false, error: "An entity with this name already exists" },
        { status: 400 },
      );
    }
    throw error;
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  const { agentId, entityId } = await context.params;
  const auth = await requireConnectorSetupAuth(request, agentId);
  if (!auth.ok) {
    return auth.response;
  }

  const owned = await assertEntityOwnedByAgent({
    workspaceId: auth.claims.workspaceId,
    agentId,
    entityId,
  });
  if (!owned) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }

  await deleteEntity(entityId);
  return NextResponse.json({ ok: true });
}
