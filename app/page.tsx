import PulseMockup from "@/components/mockup/PulseMockup";
import { getLocalDbStatus, listMasterData, listPurchaseData } from "@/lib/local-db";

export default async function HomePage() {
  const [localDbStatus, masterData, purchaseData] = await Promise.all([
    getLocalDbStatus(),
    listMasterData(),
    listPurchaseData(),
  ]);

  return <PulseMockup localDbStatus={localDbStatus} masterData={masterData} purchaseData={purchaseData} />;
}
