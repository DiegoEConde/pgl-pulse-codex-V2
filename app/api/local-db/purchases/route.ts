import { NextResponse, type NextRequest } from "next/server";
import { cancelPurchaseItem, createPurchase, emptyPurchaseData, listPurchaseData } from "@/lib/local-db";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ data: await safeListPurchaseData() });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = await createPurchase(body.values ?? {});
    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    if (body.action === "cancel-item" && typeof body.itemId === "string") {
      return NextResponse.json({ data: await cancelPurchaseItem(body.itemId) });
    }

    throw new Error("Accion de compra invalida.");
  } catch (error) {
    return errorResponse(error);
  }
}

async function safeListPurchaseData() {
  try {
    return await listPurchaseData();
  } catch {
    return emptyPurchaseData();
  }
}

function errorResponse(error: unknown) {
  return NextResponse.json(
    { error: error instanceof Error ? error.message : "No se pudo guardar la compra." },
    { status: 400 },
  );
}
