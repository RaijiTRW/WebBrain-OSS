import { WebBrainErrorPage } from "@/components/WebBrainErrorPage";
import { getErrorPage } from "@/app/error-pages";

export const metadata = { title: "403 — доступ закрыт | WebBrain" };

export default function ForbiddenPage() {
  return <WebBrainErrorPage code="403" {...getErrorPage("403")} />;
}

