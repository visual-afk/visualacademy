import type { Metadata } from "next";
import LegalDoc from "@/components/site/LegalDoc";
import { PRIVACY_TEXT } from "@/data/legal";

export const metadata: Metadata = { title: "개인정보처리방침" };

export default function PrivacyPage() {
  return <LegalDoc title="개인정보처리방침" text={PRIVACY_TEXT} />;
}
