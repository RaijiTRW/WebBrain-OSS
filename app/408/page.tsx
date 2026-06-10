import { WebBrainErrorPage } from "@/components/WebBrainErrorPage";
import { getErrorPage } from "@/app/error-pages";

export const metadata = { title: "408 — время запроса истекло | WebBrain" };

export default function RequestTimeoutPage() {
  return <WebBrainErrorPage code="408" {...getErrorPage("408")} />;
}

