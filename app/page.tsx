import { Hero } from "@/components/landing/Hero";
import { Features } from "@/components/landing/Features";
import { TemplatesShowcase } from "@/components/landing/TemplatesShowcase";
import { CTA } from "@/components/landing/CTA";
import { SocialProof } from "@/components/landing/SocialProof";

export default function Home() {
  return (
    <>
      <Hero />
      <SocialProof />
      <Features />
      <TemplatesShowcase />
      <CTA />
    </>
  );
}
