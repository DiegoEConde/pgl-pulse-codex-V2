import PulseMockup from "@/components/mockup/PulseMockup";
import { getLocalDbStatus, listCashData, listDeliveryData, listMasterData, listPurchaseData, listSalesData, listStockData } from "@/lib/local-db";

export default async function HomePage() {
  const [localDbStatus, masterData, purchaseData, salesData, stockData, deliveryData, cashData] = await Promise.all([
    getLocalDbStatus(),
    listMasterData(),
    listPurchaseData(),
    listSalesData(),
    listStockData(),
    listDeliveryData(),
    listCashData(),
  ]);

  return <PulseMockup localDbStatus={localDbStatus} masterData={masterData} purchaseData={purchaseData} salesData={salesData} stockData={stockData} deliveryData={deliveryData} cashData={cashData} />;
}
