import { LegalDocumentPage } from "@/components/LegalDocumentPage";
import { legalDocuments } from "@/lib/legal-documents";
import "../pricing/pricing-header.css";

const document = legalDocuments.offer;

export const metadata = {
  title: `${document.title} WebBrain`,
  description: document.description,
};

export default function OfferPage() {
  return <LegalDocumentPage document={document} />;
}
