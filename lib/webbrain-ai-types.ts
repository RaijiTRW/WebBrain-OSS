import type { WebBrainDocument } from "@/lib/webbrain-document";

export type WebBrainArtifactKind =
  | "document_json"
  | "source_file"
  | "api_route"
  | "sql_migration"
  | "env_manifest"
  | "backend_manifest"
  | "test_plan";

export type WebBrainArtifactStatus =
  | "prepared"
  | "needs_connection"
  | "needs_approval"
  | "approved"
  | "applied"
  | "error";

export type WebBrainProjectArtifact = {
  id?: string;
  project_id?: string;
  chat_id?: string | null;
  kind: WebBrainArtifactKind;
  path: string;
  title: string;
  content: string;
  status: WebBrainArtifactStatus;
  metadata?: Record<string, unknown> | null;
  created_at?: string;
  updated_at?: string;
};

export type WebBrainBriefOption = {
  label: string;
  text: string;
  recommended?: boolean;
};

export type WebBrainBriefQuestion = {
  id: string;
  title: string;
  question: string;
  helper?: string;
  required?: boolean;
  options: WebBrainBriefOption[];
};

export type WebBrainBriefStage =
  | "business_qualification"
  | "site_logic"
  | "design_direction"
  | "critical_followup";

export type WebBrainSiteBriefPayload = {
  kind: "site_brief";
  version: 1;
  runId?: string;
  stage?: WebBrainBriefStage;
  stageTitle?: string;
  stageSummary?: string;
  coveredKeys?: string[];
  missingKeys?: string[];
  feedback: string;
  summary?: string;
  questions: WebBrainBriefQuestion[];
};

export type WebBrainPlanSection = {
  id:
    | "research"
    | "business_logic"
    | "design_direction"
    | "frontend"
    | "backend"
    | "data_auth"
    | "effects"
    | "validation"
    | "content";
  title: string;
  items: string[];
};

export type WebBrainBusinessLogicPlan = {
  mainAction?: string;
  userFlow?: string[];
  dataToSave?: string[];
  integrations?: string[];
  safetyNotes?: string[];
};

export type WebBrainDesignDirectionPlan = {
  mood?: string;
  audienceFeeling?: string;
  composition?: string;
  palette?: string[];
  typography?: string;
  signatureElement?: string;
  avoid?: string[];
};

export type WebBrainPremiumSectionBlueprint = {
  title?: string;
  job?: string;
  visualAnchor?: string;
  density?: "compact" | "balanced" | "immersive";
  conversionRole?: string;
  mustNotDo?: string;
};

export type WebBrainPremiumMediaPlan = {
  strategy?: "verified_images" | "user_photos" | "editable_slots" | "no_media_needed";
  slots?: string[];
  mustAvoid?: string[];
};

export type WebBrainPremiumDomainFit = {
  nicheSignals?: string[];
  visitorMotivation?: string;
  nonGenericPromise?: string;
  visualProof?: string;
};

export type WebBrainPremiumLayoutDiscipline = {
  sectionCountTarget?: string;
  spacingBudget?: string;
  repeatedPatternLimit?: string;
  mustStayCompact?: string[];
};

export type WebBrainPremiumArtDirection = {
  designFamily?: string;
  chosenBecause?: string;
  visualLanguage?: string;
  layoutSignature?: string;
  materialSystem?: string;
  interactionTone?: string;
  brandSpecificDetails?: string[];
  mustFeelUnlike?: string[];
  rejectedDefaults?: string[];
};

export type WebBrainPremiumCompositionSystem = {
  heroPattern?: string;
  sectionTransitions?: string;
  informationHierarchy?: string;
  visualAnchors?: string[];
  prohibitedPatterns?: string[];
};

export type WebBrainPremiumAssetPolicy = {
  requiredMedia?: string[];
  fallbackIfMissing?: string;
  prohibitedFallbacks?: string[];
  askUserFor?: string[];
};

export type WebBrainPremiumBlueprint = {
  siteArchetype?:
    | "editorial_media"
    | "boutique_conversion"
    | "asymmetric_catalog"
    | "trust_authority"
    | "spatial_story"
    | "product_gallery";
  domainFit?: WebBrainPremiumDomainFit;
  artDirection?: WebBrainPremiumArtDirection;
  compositionSystem?: WebBrainPremiumCompositionSystem;
  firstViewport?: {
    composition?: string;
    visualCenter?: string;
    primaryAction?: string;
    proofDetail?: string;
    whatToAvoid?: string;
  };
  sectionRhythm?: WebBrainPremiumSectionBlueprint[];
  mediaPlan?: WebBrainPremiumMediaPlan;
  assetPolicy?: WebBrainPremiumAssetPolicy;
  layoutDiscipline?: WebBrainPremiumLayoutDiscipline;
  designRules?: string[];
  antiTemplateChecks?: string[];
};

export type WebBrainSitePlanPayload = {
  kind: "site_plan";
  version: 1;
  runId?: string;
  title: string;
  sections: WebBrainPlanSection[];
  assumptions: string[];
  businessLogic?: WebBrainBusinessLogicPlan;
  designDirection?: WebBrainDesignDirectionPlan;
  premiumBlueprint?: WebBrainPremiumBlueprint;
  requiresBackendApproval: boolean;
  backendApplyStatus: "not_required" | "needs_connection" | "needs_approval" | "prepared";
};

export type WebBrainBackendArtifactsPayload = {
  kind: "backend_artifacts";
  version: 1;
  runId?: string;
  status: "prepared" | "needs_connection";
  title: string;
  summary: string[];
  artifacts: WebBrainProjectArtifact[];
};

export type WebBrainSupabaseGatePayload = {
  kind: "supabase_connection_gate";
  version: 1;
  runId?: string;
  state:
    | "needs_connection"
    | "deferred"
    | "connected"
    | "project_select"
    | "applying"
    | "done"
    | "error";
  title: string;
  summary: string[];
  resumeAction?: "continue_after_supabase_connection" | "connect_database";
  canDefer?: boolean;
  error?: string;
};

export type WebBrainDocumentArtifactPayload = {
  kind: "document_artifact";
  version: 1;
  runId?: string;
  document: WebBrainDocument;
};

export type WebBrainMessagePayload =
  | WebBrainSiteBriefPayload
  | WebBrainSitePlanPayload
  | WebBrainBackendArtifactsPayload
  | WebBrainSupabaseGatePayload
  | WebBrainDocumentArtifactPayload
  | {
      kind: "status";
      version: 1;
      runId?: string;
      [key: string]: unknown;
    };
