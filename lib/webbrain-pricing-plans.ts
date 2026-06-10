import pricingPlansJson from "@/public/webbrain-landing/pricing-plans.json";

export type WebBrainPricingPlanKey = "start" | "pro" | "pro-plus" | "business";
export type WebBrainPricingPlanTone = "quiet" | "standard" | "featured" | "business";
export type WebBrainBillingPeriod = "monthly" | "yearly";

export type WebBrainPricingBillingOption = {
  price: string;
  priceLabel: string;
  priceTitle: string;
  suffix: string;
  currencySymbol?: string;
  caption: string;
  features: string[];
};

export type WebBrainPricingPlan = {
  key: WebBrainPricingPlanKey;
  tierId: "start" | "pro" | "pro_plus" | "business";
  name: string;
  price: string;
  priceLabel: string;
  suffix: string;
  currencySymbol?: string;
  billing: Record<WebBrainBillingPeriod, WebBrainPricingBillingOption>;
  note: string;
  cta: {
    landing: string;
    pricing: string;
    settings: string;
  };
  href: string;
  tone: WebBrainPricingPlanTone;
  badge?: string;
  comingSoon?: boolean;
  features: string[];
  advantages: string[];
  limits: {
    credits: number;
    creditsLabel: string;
    periodLimit: string;
    sites: number;
    sitesLabel: string;
    aiModel: string;
    reasoning: string;
    publishing: string;
    support: string;
    workspace: string;
    database: string;
    api: string;
  };
};

export type AccountSubscriptionPlanKey = WebBrainPricingPlanKey;
export type AccountSubscriptionPlan = WebBrainPricingPlan & {
  featured: boolean;
  description: string;
};

export const webBrainPricingPlans = pricingPlansJson.plans as WebBrainPricingPlan[];

export const accountSubscriptionPlans: AccountSubscriptionPlan[] = webBrainPricingPlans.map((plan) => ({
  ...plan,
  featured: plan.tone === "featured",
  description: plan.note,
}));

export function getWebBrainPricingPlan(key: WebBrainPricingPlanKey | string | null | undefined) {
  return accountSubscriptionPlans.find((plan) => plan.key === key) ?? accountSubscriptionPlans[0];
}
