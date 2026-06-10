import { PricingHeader } from "@/components/PricingHeader";
import { PricingPlansShowcase } from "@/components/PricingPlansShowcase";
import { accountSubscriptionPlans as plans } from "@/lib/webbrain-pricing-plans";
import "./pricing-header.css";

export const metadata = {
  title: "Тарифы WebBrain",
  description: "Тарифы WebBrain: Start, Pro, Pro Plus и Business.",
};

export default function PricingPage() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-[#020303] text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_78%_0%,rgba(200,255,94,0.16),transparent_42%),radial-gradient(circle_at_14%_36%,rgba(99,230,255,0.06),transparent_34%),linear-gradient(180deg,#060807_0%,#020303_100%)]" />
      <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(rgba(255,255,255,0.018)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.014)_1px,transparent_1px)] bg-[size:72px_72px] opacity-[0.16]" />

      <PricingHeader />

      <div className="relative mx-auto flex min-h-screen w-full max-w-[1360px] flex-col px-5 pb-5 pt-[8.5rem] md:px-8 md:pt-36">
        <section className="flex flex-1 flex-col justify-center py-6 md:py-8">
          <PricingPlansShowcase plans={plans} />
        </section>
      </div>
    </main>
  );
}
