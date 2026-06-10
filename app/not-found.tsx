import { WebBrainErrorPage } from "@/components/WebBrainErrorPage";
import { getErrorPage } from "@/app/error-pages";

export default function NotFound() {
  return <WebBrainErrorPage code="404" {...getErrorPage("404")} />;
}

