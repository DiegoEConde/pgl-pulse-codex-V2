import { NextResponse, type NextRequest } from "next/server";
import { createSale, emptySalesData, listSalesData, registerSalePayment, upsertReceipt } from "@/lib/local-db";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ data: await safeListSalesData() });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = await createSale(body.values ?? {});
    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const saleId = typeof body.saleId === "string" ? body.saleId : "";
    if (!saleId) throw new Error("Venta obligatoria.");

    if (body.action === "payment") {
      return NextResponse.json({ data: await registerSalePayment(saleId, body.values ?? {}) });
    }

    if (body.action === "receipt") {
      await upsertReceipt(saleId, { paidIfSettled: true });
      return NextResponse.json({ data: await listSalesData() });
    }

    throw new Error("Accion de venta invalida.");
  } catch (error) {
    return errorResponse(error);
  }
}

async function safeListSalesData() {
  try {
    return await listSalesData();
  } catch {
    return emptySalesData();
  }
}

function errorResponse(error: unknown) {
  return NextResponse.json(
    { error: error instanceof Error ? error.message : "No se pudo guardar la venta." },
    { status: 400 },
  );
}
