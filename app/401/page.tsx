import { WebBrainErrorPage } from "@/components/WebBrainErrorPage";
import { getErrorPage } from "@/app/error-pages";

export const metadata = { title: "401 — нужен вход | WebBrain" };

export default function UnauthorizedPage() {
  return <WebBrainErrorPage code="401" {...getErrorPage("401")} />;
}

