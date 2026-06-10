import { WebBrainErrorPage } from "@/components/WebBrainErrorPage";
import { getErrorPage } from "@/app/error-pages";

export const metadata = { title: "429 — слишком много запросов | WebBrain" };

export default function TooManyRequestsPage() {
  return <WebBrainErrorPage code="429" {...getErrorPage("429")} />;
}

