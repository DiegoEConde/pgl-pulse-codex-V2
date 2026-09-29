import AppIntro from "@/components/core/AppIntro/AppIntro";
import AppShell from "@/components/core/AppShell/AppShell";
import ScreenRouter from "@/components/core/ScreenRouter/ScreenRouter";

export default function HomePage() {
  return <AppIntro><AppShell><ScreenRouter /></AppShell></AppIntro>;
}
