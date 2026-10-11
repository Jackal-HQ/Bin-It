import type { Metadata } from "next";
import { Em, ProseLink, ProsePage, ProseSection } from "@/components/site/ProsePage";

const YEAR = new Date().getFullYear();

export const metadata: Metadata = {
  title: "Terms — Bin-It",
  description: "The terms for using Bin-It, a civic prototype for reporting overflowing bins.",
};

export default function TermsPage() {
  return (
    <ProsePage eyebrow="Legal" title="Terms of Use" note={`Last updated ${YEAR}.`}>
      <ProseSection title="What Bin-It is">
        Bin-It lets residents photo-report overflowing trash bins and helps city staff see where
        new bins would help most. It is a civic prototype provided as-is, without warranty of any
        kind.
      </ProseSection>
      <ProseSection title="Using the service">
        Report in good faith. Submit photos of actual trash and overflow conditions, not people. Do
        not upload content you do not have the right to share, and do not capture identifiable
        faces or license plates. Do not misuse the service to spam, harass, or submit knowingly
        false reports.
      </ProseSection>
      <ProseSection title="Your content">
        Because photos are served from public URLs for staff review, treat anything you submit as
        public. By submitting a report you allow it to be displayed in the product and used to
        estimate bin placement.
      </ProseSection>
      <ProseSection title="Estimates, not guarantees">
        Rankings and projected improvements are <Em>estimates</Em> derived from models and
        objective proxies. They are decision-support, not a guarantee of any outcome, service
        level, or municipal action.
      </ProseSection>
      <ProseSection title="Availability">
        The service may change, pause, or be discontinued at any time. Reporting an issue in Bin-It
        is not a substitute for your city&apos;s official 311 or emergency services. For
        emergencies, call 911.
      </ProseSection>
      <ProseSection title="Privacy">
        See our <ProseLink href="/privacy">Privacy notice</ProseLink> for how data is handled.
      </ProseSection>
    </ProsePage>
  );
}
