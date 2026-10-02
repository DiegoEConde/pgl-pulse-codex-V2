import { NextResponse, type NextRequest } from "next/server";
import {
  confirmCustomerCollection,
  confirmCustomerDelivery,
  confirmProviderPayment,
  confirmRoutePickup,
  createRoute,
  emptyDeliveryData,
  listDeliveryData,
  markRouteOpenNextDay,
  markRoutePartialRendition,
  startRoute,
} from "@/lib/local-db";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ data: await safeListDeliveryData() });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = await createRoute(body.values ?? {});
    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const action = typeof body.action === "string" ? body.action : "";
    const routeId = typeof body.routeId === "string" ? body.routeId : "";
    const routeItemId = typeof body.routeItemId === "string" ? body.routeItemId : "";

    if (action === "start-route" && routeId) {
      return NextResponse.json({ data: await startRoute(routeId, body.usuarioId ?? null) });
    }

    if (action === "open-next-day" && routeId) {
      return NextResponse.json({ data: await markRouteOpenNextDay(routeId, body.usuarioId ?? null) });
    }

    if (action === "partial-rendition" && routeId) {
      return NextResponse.json({ data: await markRoutePartialRendition(routeId, body.usuarioId ?? null) });
    }

    if (action === "pickup" && routeItemId) {
      return NextResponse.json({ data: await confirmRoutePickup(routeItemId, body.values ?? {}) });
    }

    if (action === "provider-payment" && routeItemId) {
      return NextResponse.json({ data: await confirmProviderPayment(routeItemId, body.values ?? {}) });
    }

    if (action === "customer-delivery" && routeItemId) {
      return NextResponse.json({ data: await confirmCustomerDelivery(routeItemId, body.usuarioId ?? null) });
    }

    if (action === "customer-collection" && routeItemId) {
      return NextResponse.json({ data: await confirmCustomerCollection(routeItemId, body.values ?? {}) });
    }

    throw new Error("Accion de reparto invalida.");
  } catch (error) {
    return errorResponse(error);
  }
}

async function safeListDeliveryData() {
  try {
    return await listDeliveryData();
  } catch {
    return emptyDeliveryData();
  }
}

function errorResponse(error: unknown) {
  return NextResponse.json(
    { error: error instanceof Error ? error.message : "No se pudo guardar la ruta." },
    { status: 400 },
  );
}
