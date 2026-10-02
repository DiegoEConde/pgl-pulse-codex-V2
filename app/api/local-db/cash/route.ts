import { NextResponse, type NextRequest } from "next/server";
import {
  closeCash,
  emptyCashData,
  listCashData,
  registerCashAdjustment,
  registerCashSalePayment,
  registerCourierAdvance,
  registerRouteRendition,
  registerSupplierPayment,
} from "@/lib/local-db";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ data: await safeListCashData() });
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const action = typeof body.action === "string" ? body.action : "";

    if (action === "sale-payment" && typeof body.saleId === "string") {
      return NextResponse.json({ data: await registerCashSalePayment(body.saleId, body.values ?? {}) });
    }

    if (action === "supplier-payment") {
      return NextResponse.json({ data: await registerSupplierPayment(body.values ?? {}) });
    }

    if (action === "courier-advance") {
      return NextResponse.json({ data: await registerCourierAdvance(body.values ?? {}) });
    }

    if (action === "route-rendition") {
      return NextResponse.json({ data: await registerRouteRendition(body.values ?? {}) });
    }

    if (action === "adjustment") {
      return NextResponse.json({ data: await registerCashAdjustment(body.values ?? {}) });
    }

    if (action === "close-cash") {
      return NextResponse.json({ data: await closeCash(body.values ?? {}) });
    }

    throw new Error("Accion de caja invalida.");
  } catch (error) {
    return errorResponse(error);
  }
}

async function safeListCashData() {
  try {
    return await listCashData();
  } catch {
    return emptyCashData();
  }
}

function errorResponse(error: unknown) {
  return NextResponse.json(
    { error: error instanceof Error ? error.message : "No se pudo guardar el movimiento." },
    { status: 400 },
  );
}
