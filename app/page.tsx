import PulseMockup from "@/components/mockup/PulseMockup";
import { getLocalDbStatus, listCashData, listDeliveryData, listInsightsData, listMasterData, listPurchaseData, listSalesData, listStockData } from "@/lib/local-db";

export default async function HomePage() {
  const [localDbStatus, masterData, purchaseData, salesData, stockData, deliveryData, cashData, insightsData] = await Promise.all([
    getLocalDbStatus(),
    listMasterData(),
    listPurchaseData(),
    listSalesData(),
    listStockData(),
    listDeliveryData(),
    listCashData(),
    listInsightsData(),
  ]);

  return <PulseMockup localDbStatus={localDbStatus} masterData={masterData} purchaseData={purchaseData} salesData={salesData} stockData={stockData} deliveryData={deliveryData} cashData={cashData} insightsData={insightsData} />;
}
