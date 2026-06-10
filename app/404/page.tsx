import { WebBrainErrorPage } from "@/components/WebBrainErrorPage";
import { getErrorPage } from "@/app/error-pages";

export const metadata = { title: "404 — страница не найдена | WebBrain" };

export default function NotFoundRoutePage() {
  return <WebBrainErrorPage code="404" {...getErrorPage("404")} />;
}

