import PulseMockup from "@/components/mockup/PulseMockup";
import { getLocalDbStatus, listMasterData, listPurchaseData, listSalesData } from "@/lib/local-db";

export default async function HomePage() {
  const [localDbStatus, masterData, purchaseData, salesData] = await Promise.all([
    getLocalDbStatus(),
    listMasterData(),
    listPurchaseData(),
    listSalesData(),
  ]);

  return <PulseMockup localDbStatus={localDbStatus} masterData={masterData} purchaseData={purchaseData} salesData={salesData} />;
}
