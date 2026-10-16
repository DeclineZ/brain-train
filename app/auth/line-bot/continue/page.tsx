import { Suspense } from "react";
import ClaimContent from "./content";

export const metadata = {
  title: "เข้าสู่ระบบ RunJump",
  referrer: "no-referrer",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

export default function OaContinuePage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-cream" />}>
      <ClaimContent />
    </Suspense>
  );
}
