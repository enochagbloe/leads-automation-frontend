export function AuthHeading({ eyebrow, title, description }: { eyebrow?: string; title: string; description: string }) {
  return (
    <div>
      {eyebrow && <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-primary">{eyebrow}</p>}
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
    </div>
  );
}
