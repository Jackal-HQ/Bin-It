import type { Metadata } from "next";
import { Em, ProsePage, ProseSection } from "@/components/site/ProsePage";

const YEAR = new Date().getFullYear();

export const metadata: Metadata = {
  title: "Privacy — Bin-It",
  description: "How Bin-It handles photos, location, and the fact that it uses no accounts.",
};

export default function PrivacyPage() {
  return (
    <ProsePage eyebrow="Legal" title="Privacy" note={`How Bin-It handles your data. Last updated ${YEAR}.`}>
      <ProseSection title="No accounts, no names">
        Bin-It has no sign-up and never asks for your name, email, or phone number. The mobile app
        stores a random anonymous device identifier on your phone so duplicate reports can be
        grouped; it is not tied to your identity and never leaves your device except as an opaque
        token on your own reports.
      </ProseSection>
      <ProseSection title="Photos">
        A report includes a photo you take or choose. Photos are stored and served from public URLs
        so city staff can review them, so treat them as public. We strip camera metadata (EXIF)
        before publishing, except the coordinates needed to place the report on the map. Please
        avoid capturing identifiable faces or license plates.
      </ProseSection>
      <ProseSection title="Location">
        Each report is tagged with the location where it was taken, so staff know where the
        overflow is. The app only reads your location while you are using it and only to attach it
        to a report.
      </ProseSection>
      <ProseSection title="Demo data">
        Some reports shown in the product are synthetic seed data used for demonstrations. These
        are clearly labeled &ldquo;demo data&rdquo; in the interface and are never presented as
        real resident reports.
      </ProseSection>
      <ProseSection title="What we do not do">
        We do not sell data, run third-party advertising trackers, or build profiles of
        individuals. Reports are used to estimate where new bins would help most; projected
        improvements are shown as <Em>estimates</Em>, never measured outcomes.
      </ProseSection>
      <ProseSection title="Contact">
        Bin-It is a civic prototype. For questions about a specific report or this notice, contact
        your city&apos;s sanitation or 311 service.
      </ProseSection>
    </ProsePage>
  );
}
