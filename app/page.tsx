import PulseMockup from "@/components/mockup/PulseMockup";
import { getLocalDbStatus, listDeliveryData, listMasterData, listPurchaseData, listSalesData, listStockData } from "@/lib/local-db";

export default async function HomePage() {
  const [localDbStatus, masterData, purchaseData, salesData, stockData, deliveryData] = await Promise.all([
    getLocalDbStatus(),
    listMasterData(),
    listPurchaseData(),
    listSalesData(),
    listStockData(),
    listDeliveryData(),
  ]);

  return <PulseMockup localDbStatus={localDbStatus} masterData={masterData} purchaseData={purchaseData} salesData={salesData} stockData={stockData} deliveryData={deliveryData} />;
}
