import { NextResponse, type NextRequest } from "next/server";
import {
  createMasterRecord,
  emptyMasterData,
  listMasterData,
  updateMasterRecord,
  type MasterKind,
} from "@/lib/local-db";

export const dynamic = "force-dynamic";

const masterKinds: MasterKind[] = ["productos", "clientes", "proveedores"];

export async function GET() {
  return NextResponse.json({ data: await safeListMasterData() });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const kind = parseKind(body.kind);
    await createMasterRecord(kind, body.values ?? {});

    return NextResponse.json({ data: await listMasterData() }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const kind = parseKind(body.kind);
    const id = typeof body.id === "string" ? body.id : "";
    if (!id) throw new Error("ID obligatorio.");

    await updateMasterRecord(kind, id, body.values ?? {});

    return NextResponse.json({ data: await listMasterData() });
  } catch (error) {
    return errorResponse(error);
  }
}

async function safeListMasterData() {
  try {
    return await listMasterData();
  } catch {
    return emptyMasterData();
  }
}

function parseKind(value: unknown): MasterKind {
  if (typeof value === "string" && masterKinds.includes(value as MasterKind)) {
    return value as MasterKind;
  }

  throw new Error("Tipo de maestro invalido.");
}

function errorResponse(error: unknown) {
  return NextResponse.json(
    { error: error instanceof Error ? error.message : "No se pudo guardar el registro." },
    { status: 400 },
  );
}
