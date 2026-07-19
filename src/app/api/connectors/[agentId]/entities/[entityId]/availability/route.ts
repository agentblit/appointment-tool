import { NextResponse } from "next/server";
import { validateAvailabilityRules } from "@/lib/appointment/appointment-utils";
import {
  getEntityForAgent,
  listAvailabilityRulesForEntity,
  replaceAvailabilityRulesForEntity,
} from "@/lib/appointment/repo";
import { appointmentAvailabilityRulesSchema } from "@/lib/appointment/tools";
import { requireConnectorSetupAuth } from "@/lib/auth/require-connector-setup-auth";

type RouteContext = {
  params: Promise<{ agentId: string; entityId: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  const { agentId, entityId } = await context.params;
  const auth = await requireConnectorSetupAuth(request, agentId);
  if (!auth.ok) {
    return auth.response;
  }

  const owned = await getEntityForAgent({ agentId, entityId });
  if (!owned) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }

  const rules = await listAvailabilityRulesForEntity(entityId);
  return NextResponse.json({ ok: true, rules });
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

  const bodyParse = appointmentAvailabilityRulesSchema.safeParse(json);
  if (!bodyParse.success) {
    const issue = bodyParse.error.issues[0];
    return NextResponse.json(
      { ok: false, error: issue?.message ?? "Invalid request body" },
      { status: 400 },
    );
  }

  const owned = await getEntityForAgent({ agentId, entityId });
  if (!owned) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }

  const validationError = validateAvailabilityRules(bodyParse.data.rules);
  if (validationError) {
    return NextResponse.json(
      { ok: false, error: validationError },
      { status: 400 },
    );
  }

  const rules = await replaceAvailabilityRulesForEntity({
    entityId,
    rules: bodyParse.data.rules,
  });

  return NextResponse.json({ ok: true, rules });
}
