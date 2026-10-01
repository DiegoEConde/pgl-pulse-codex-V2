import PulseMockup from "@/components/mockup/PulseMockup";
import { getLocalDbStatus } from "@/lib/local-db";

export default async function HomePage() {
  const localDbStatus = await getLocalDbStatus();

  return <PulseMockup localDbStatus={localDbStatus} />;
}
