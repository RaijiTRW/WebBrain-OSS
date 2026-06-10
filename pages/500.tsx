import Head from "next/head";
import { WebBrainErrorPage } from "@/components/WebBrainErrorPage";
import { getErrorPage } from "@/app/error-pages";

export default function Custom500Page() {
  return (
    <>
      <Head>
        <title>500 — ошибка сервера | WebBrain</title>
      </Head>
      <WebBrainErrorPage code="500" {...getErrorPage("500")} />
    </>
  );
}
