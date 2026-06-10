import { WebBrainErrorPage } from "@/components/WebBrainErrorPage";
import { getErrorPage } from "@/app/error-pages";

export const metadata = { title: "503 — сервис недоступен | WebBrain" };

export default function ServiceUnavailablePage() {
  return <WebBrainErrorPage code="503" {...getErrorPage("503")} />;
}

