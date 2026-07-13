import { NextResponse } from "next/server";
import { toOpenAiToolsList } from "@/lib/appointment/tools";

export async function GET() {
  return NextResponse.json(toOpenAiToolsList());
}
