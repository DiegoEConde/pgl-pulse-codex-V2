import { NextResponse, type NextRequest } from "next/server";
import {
  deliverUnit,
  emptyStockData,
  finalizeUnit,
  listStockData,
  moveUnitToWarranty,
  receivePurchaseItem,
  updateUnitIdentity,
} from "@/lib/local-db";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ data: await safeListStockData() });
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();

    if (body.action === "receive-item") {
      return NextResponse.json({ data: await receivePurchaseItem(body.values ?? {}) });
    }

    const unitId = typeof body.unitId === "string" ? body.unitId : "";
    if (!unitId) throw new Error("Unidad obligatoria.");

    if (body.action === "update-identity") {
      return NextResponse.json({ data: await updateUnitIdentity(unitId, body.values ?? {}) });
    }

    if (body.action === "deliver-unit") {
      return NextResponse.json({ data: await deliverUnit(unitId, body.usuarioId ?? null) });
    }

    if (body.action === "finalize-unit") {
      return NextResponse.json({ data: await finalizeUnit(unitId, body.usuarioId ?? null) });
    }

    if (body.action === "warranty-unit") {
      return NextResponse.json({ data: await moveUnitToWarranty(unitId, body.values ?? {}) });
    }

    throw new Error("Accion de stock invalida.");
  } catch (error) {
    return errorResponse(error);
  }
}

async function safeListStockData() {
  try {
    return await listStockData();
  } catch {
    return emptyStockData();
  }
}

function errorResponse(error: unknown) {
  return NextResponse.json(
    { error: error instanceof Error ? error.message : "No se pudo guardar el stock." },
    { status: 400 },
  );
}
