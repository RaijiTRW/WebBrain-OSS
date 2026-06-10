import { AppAuthGate } from "@/components/AppAuthGate";
import { WebBrainAppShell } from "@/components/WebBrainAppShell";

export const metadata = {
  title: "WebBrain App",
  description: "Локальный чат WebBrain для сборки сайтов."
};

export default function AppPage() {
  return (
    <AppAuthGate>
      <WebBrainAppShell />
    </AppAuthGate>
  );
}
