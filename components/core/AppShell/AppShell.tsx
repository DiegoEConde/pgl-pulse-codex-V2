import Header from "../Header/Header";

export default function AppShell({ children }: { children: React.ReactNode }) {
  return <div className="app-shell"><Header /><main className="workspace program-workspace">{children}</main></div>;
}
