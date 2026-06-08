import type { Metadata } from "next";
import { OnboardingFlow } from "@/components/onboarding/onboarding-flow";

export const metadata: Metadata = { title: "Create business" };

export default function CreateBusinessPage() {
  return <OnboardingFlow mode="create-business" />;
}
