import offerDocument from "@/content/legal/offer.json";
import privacyDocument from "@/content/legal/privacy.json";

export type LegalDefinition = {
  term: string;
  text: string;
};

export type LegalBlock =
  | {
      type: "paragraph";
      text: string;
    }
  | {
      type: "list";
      items: string[];
    }
  | {
      type: "note";
      text: string;
    }
  | {
      type: "definitions";
      items: LegalDefinition[];
    };

export type LegalSection = {
  id: string;
  title: string;
  blocks: LegalBlock[];
};

export type LegalDocument = {
  slug: "offer" | "privacy";
  title: string;
  shortTitle: string;
  description: string;
  badge: string;
  effectiveDate: string;
  updatedAt: string;
  version: string;
  intro: string[];
  contacts: {
    owner: string;
    inn: string;
    email: string;
    status?: string;
    ogrn?: string;
    address?: string;
  };
  sections: LegalSection[];
};

export const legalDocuments = {
  offer: offerDocument as LegalDocument,
  privacy: privacyDocument as LegalDocument,
};
