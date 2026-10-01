import PulseMockup from "@/components/mockup/PulseMockup";
import { getLocalDbStatus, listMasterData } from "@/lib/local-db";

export default async function HomePage() {
  const [localDbStatus, masterData] = await Promise.all([
    getLocalDbStatus(),
    listMasterData(),
  ]);

  return <PulseMockup localDbStatus={localDbStatus} masterData={masterData} />;
}
