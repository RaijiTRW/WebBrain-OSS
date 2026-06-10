import { NextRequest, NextResponse } from "next/server";
import { getApiErrorMessage } from "@/lib/api-error";
import {
  getPublicationForSite,
  publishSite,
  updatePublicationStatus,
  type WebBrainPublishedSite,
  type WebBrainPublishPlanKey,
} from "@/lib/webbrain-publication-store";
import { validateRequestClientId } from "@/lib/webbrain-chat-store";

type RouteContext = {
  params: Promise<{
    siteId: string;
  }>;
};

function jsonError(error: unknown, status = 500) {
  const message = getApiErrorMessage(error);

  return NextResponse.json({ error: message }, { status });
}

function normalizePlanKey(value: unknown): WebBrainPublishPlanKey {
  if (value === "basic" || value === "standard" || value === "business" || value === "custom") return value;

  return "standard";
}

function normalizePublicationStatus(value: unknown): WebBrainPublishedSite["status"] {
  if (value === "active" || value === "suspended" || value === "draft") return value;

  throw new Error("Unknown publication status");
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const clientId = await validateRequestClientId(request);
    const { siteId } = await context.params;
    const publication = await getPublicationForSite(clientId, siteId);

    return NextResponse.json(publication ?? { publication: null, publicUrl: null, usage: null });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const clientId = await validateRequestClientId(request);
    const { siteId } = await context.params;
    const body = (await request.json().catch(() => ({}))) as {
      planKey?: WebBrainPublishPlanKey;
      slug?: string;
      settings?: Record<string, unknown>;
    };
    const result = await publishSite(clientId, siteId, {
      planKey: normalizePlanKey(body.planKey),
      slug: typeof body.slug === "string" ? body.slug : undefined,
      settings: body.settings && typeof body.settings === "object" ? body.settings : {},
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const clientId = await validateRequestClientId(request);
    const { siteId } = await context.params;
    const body = (await request.json().catch(() => ({}))) as {
      status?: string;
    };
    const result = await updatePublicationStatus(clientId, siteId, normalizePublicationStatus(body.status));

    return NextResponse.json(result);
  } catch (error) {
    return jsonError(error);
  }
}
