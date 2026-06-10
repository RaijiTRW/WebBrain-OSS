import { WebBrainErrorPage } from "@/components/WebBrainErrorPage";
import { getErrorPage } from "@/app/error-pages";

export const metadata = { title: "502 — сервис не ответил | WebBrain" };

export default function BadGatewayPage() {
  return <WebBrainErrorPage code="502" {...getErrorPage("502")} />;
}

