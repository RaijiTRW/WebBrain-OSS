import { AuthSplitPage } from "@/components/AuthSplitPage";

export const metadata = {
  title: "Регистрация WebBrain",
  description: "Создайте аккаунт WebBrain, чтобы собирать сайты из чата и публиковать проекты.",
};

type SignupPageProps = {
  searchParams?: Promise<{ email?: string | string[] }>;
};

function getInitialEmail(value: string | string[] | undefined) {
  const email = Array.isArray(value) ? value[0] : value;

  if (!email) return "";

  const normalizedEmail = email.trim().toLowerCase().slice(0, 254);

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail) ? normalizedEmail : "";
}

export default async function SignupPage({ searchParams }: SignupPageProps) {
  const params = await searchParams;
  const initialEmail = getInitialEmail(params?.email);

  return <AuthSplitPage initialMode="signup" initialEmail={initialEmail} />;
}
