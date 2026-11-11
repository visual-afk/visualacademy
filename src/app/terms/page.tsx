import type { Metadata } from "next";
import LegalDoc from "@/components/site/LegalDoc";
import { TERMS_TEXT } from "@/data/legal";

export const metadata: Metadata = { title: "이용약관" };

export default function TermsPage() {
  return <LegalDoc title="이용약관" text={TERMS_TEXT} />;
}
