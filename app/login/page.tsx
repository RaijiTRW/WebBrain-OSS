import { AuthSplitPage } from "@/components/AuthSplitPage";

export const metadata = {
  title: "Вход в WebBrain",
  description: "Войдите в WebBrain, чтобы продолжить работу над сайтами и проектами.",
};

type LoginPageProps = {
  searchParams?: Promise<{ email?: string | string[] }>;
};

function getInitialEmail(value: string | string[] | undefined) {
  const email = Array.isArray(value) ? value[0] : value;

  if (!email) return "";

  const normalizedEmail = email.trim().toLowerCase().slice(0, 254);

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail) ? normalizedEmail : "";
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const initialEmail = getInitialEmail(params?.email);

  return <AuthSplitPage initialMode="login" initialEmail={initialEmail} />;
}
