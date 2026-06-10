import { WebBrainErrorPage } from "@/components/WebBrainErrorPage";
import { getErrorPage } from "@/app/error-pages";

export const metadata = { title: "400 — неверный запрос | WebBrain" };

export default function BadRequestPage() {
  return <WebBrainErrorPage code="400" {...getErrorPage("400")} />;
}

