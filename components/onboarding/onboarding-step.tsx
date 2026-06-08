"use client";

import gsap from "gsap";
import { useLayoutEffect, useRef } from "react";

export function OnboardingStep({ eyebrow, title, description, stepKey, children }: { eyebrow: string; title: string; description: string; stepKey: number; children: React.ReactNode }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const context = gsap.context(() => {
      gsap.fromTo(containerRef.current, { autoAlpha: 0, x: 18 }, { autoAlpha: 1, x: 0, duration: 0.28, ease: "power2.out" });
    }, containerRef);
    return () => context.revert();
  }, [stepKey]);

  return (
    <div ref={containerRef} className="w-full">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">{eyebrow}</p>
      <h1 className="mt-3 text-2xl font-bold tracking-tight sm:text-4xl">{title}</h1>
      <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground sm:text-base">{description}</p>
      <div className="mt-8">{children}</div>
    </div>
  );
}
