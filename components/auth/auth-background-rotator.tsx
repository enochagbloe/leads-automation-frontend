"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const AUTH_BACKGROUNDS = [
  "/images/slow_shutter_signin.jpg",
  "/images/slow_shutter_signin2.jpg",
  "/images/slow_shutter_signin3.jpg",
];

type AuthBackgroundRotatorProps = {
  className?: string;
};

export function AuthBackgroundRotator({ className }: AuthBackgroundRotatorProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % AUTH_BACKGROUNDS.length);
    }, 10000);

    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className={cn("absolute inset-0 overflow-hidden", className)} aria-hidden="true">
      {AUTH_BACKGROUNDS.map((src, index) => (
        <Image
          key={src}
          src={src}
          alt=""
          fill
          priority={index === 0}
          sizes="50vw"
          className={cn(
            "absolute inset-0 h-full w-full object-cover transition-opacity duration-1000 ease-out",
            index === activeIndex ? "opacity-100" : "opacity-0",
          )}
        />
      ))}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/85 via-primary/50 to-foreground/60" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_15%,hsl(var(--accent)/0.34),transparent_32%),radial-gradient(circle_at_78%_78%,hsl(var(--primary)/0.38),transparent_36%)]" />
      <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-foreground/62 via-foreground/18 to-transparent" />
      <div className="absolute bottom-8 right-8 flex items-center gap-2">
        {AUTH_BACKGROUNDS.map((src, index) => (
          <span
            key={`${src}-indicator`}
            className={cn(
              "h-1.5 rounded-full bg-primary-foreground/55 transition-all duration-500",
              index === activeIndex ? "w-8 opacity-100" : "w-1.5 opacity-55",
            )}
          />
        ))}
      </div>
    </div>
  );
}
