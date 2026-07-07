"use client";

import gsap from "gsap";
import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  Bold,
  CheckCircle2,
  Clock3,
  Code2,
  Image,
  Italic,
  Link2,
  List,
  ListChecks,
  ListOrdered,
  Monitor,
  Quote,
  Save,
  Sparkles,
  Table2,
  Underline,
  X,
} from "lucide-react";
import { AppButton } from "@/components/app-button";
import { AppSelect } from "@/components/app-select";
import { Dialog, DialogContent, DialogDescription, DialogOverlay, DialogPortal, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { BusinessService } from "@/types/business-service";
import type { KnowledgeArticle, KnowledgeDraftStreamHandlers, KnowledgeVisibility } from "@/types/knowledge";

type EditorTab = "editor" | "preview";

export type KnowledgeEditorValue = {
  title: string;
  summary: string;
  body: string;
  category: string;
  tags: string;
  visibility: KnowledgeVisibility;
  relatedServiceIds: string[];
};

type KnowledgeEditorDialogProps = {
  open: boolean;
  article: KnowledgeArticle | null;
  services: BusinessService[];
  saving: boolean;
  drafting?: boolean;
  publishing?: boolean;
  canDraftWithAi?: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (value: KnowledgeEditorValue) => void;
  onDraft?: (value: KnowledgeEditorValue, handlers: KnowledgeDraftStreamHandlers) => void;
  onPublish?: () => void;
};


function valueFromArticle(article: KnowledgeArticle | null): KnowledgeEditorValue {
  return {
    title: article?.title ?? "",
    summary: article?.summary ?? "",
    body: article?.body ?? "",
    category: article?.category ?? "",
    tags: article?.tags.join(", ") ?? "",
    visibility: article?.visibility ?? "CLIENT_SENDABLE",
    relatedServiceIds: article?.relatedServiceIds ?? [],
  };
}

// function wordCount(value: string) {
//   return value.trim().split(/\s+/).filter(Boolean).length;
// }

// function readMinutes(value: string) {
//   return Math.max(1, Math.ceil(wordCount(value) / 180));
// }

function isWhitespace(value: string) {
  return /^\s+$/.test(value);
}

function AnimatedDraftText({
  value,
  emptyText,
  className,
  inline = false,
}: {
  value: string;
  emptyText: string;
  className?: string;
  inline?: boolean;
}) {
  const containerRef = useRef<HTMLElement | null>(null);
  const previousWordCount = useRef(0);
  const parts = useMemo(() => value.split(/(\s+)/).filter(Boolean), [value]);
  const wordCount = useMemo(() => parts.filter((part) => !isWhitespace(part)).length, [parts]);

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const words = gsap.utils.toArray<HTMLElement>("[data-draft-word]", container);
    if (words.length < previousWordCount.current) previousWordCount.current = 0;
    const newWords = words.slice(previousWordCount.current);
    previousWordCount.current = words.length;
    if (!newWords.length) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) {
      gsap.set(newWords, { autoAlpha: 1, y: 0, filter: "blur(0px)" });
      return;
    }

    gsap.fromTo(
      newWords,
      { autoAlpha: 0, filter: "blur(2px)" },
      { autoAlpha: 1, filter: "blur(0px)", duration: 0.22, stagger: 0.01, ease: "sine.out", overwrite: true },
    );
  }, [value, wordCount]);

  if (!value) {
    return inline
      ? <span className={cn("text-muted-foreground", className)}>{emptyText}</span>
      : <p className={cn("text-muted-foreground", className)}>{emptyText}</p>;
  }

  const content = parts.map((part, index) => isWhitespace(part)
    ? <span key={`${part}-${index}`}>{part}</span>
    : <span key={`${part}-${index}`} data-draft-word className="will-change-[opacity,filter]">{part}</span>);

  if (inline) {
    return (
      <span ref={(node) => { containerRef.current = node; }} className={className}>
        {content}
      </span>
    );
  }

  return (
    <div ref={(node) => { containerRef.current = node; }} className={className}>
      {content}
    </div>
  );
}

type MarkdownBlock =
  | { type: "heading"; level: 1 | 2 | 3; text: string }
  | { type: "paragraph"; text: string }
  | { type: "list"; ordered: boolean; items: string[] };

type InlineMarkdownSegment = {
  type: "text" | "bold" | "italic" | "code";
  text: string;
};

function parseInlineMarkdown(value: string): InlineMarkdownSegment[] {
  const segments: InlineMarkdownSegment[] = [];
  let mode: InlineMarkdownSegment["type"] = "text";
  let buffer = "";

  const flush = () => {
    if (!buffer) return;
    segments.push({ type: mode, text: buffer });
    buffer = "";
  };

  for (let index = 0; index < value.length; index += 1) {
    const current = value[index];
    const next = value[index + 1];

    if (current === "`") {
      flush();
      mode = mode === "code" ? "text" : "code";
      continue;
    }

    if (mode !== "code" && current === "*" && next === "*") {
      flush();
      mode = mode === "bold" ? "text" : "bold";
      index += 1;
      continue;
    }

    if (mode !== "code" && current === "*") {
      flush();
      mode = mode === "italic" ? "text" : "italic";
      continue;
    }

    buffer += current;
  }

  flush();
  return segments;
}

function InlineMarkdownDraft({ value }: { value: string }) {
  const segments = useMemo(() => parseInlineMarkdown(value), [value]);

  return (
    <>
      {segments.map((segment, index) => {
        const content = <AnimatedDraftText value={segment.text} emptyText="" inline />;

        if (segment.type === "bold") return <strong key={`${segment.type}-${index}`} className="font-bold">{content}</strong>;
        if (segment.type === "italic") return <em key={`${segment.type}-${index}`} className="italic">{content}</em>;
        if (segment.type === "code") {
          return (
            <code key={`${segment.type}-${index}`} className="rounded-md border bg-muted px-1.5 py-0.5 font-mono text-[0.92em] text-foreground">
              {content}
            </code>
          );
        }
        return <span key={`${segment.type}-${index}`}>{content}</span>;
      })}
    </>
  );
}

function parseMarkdownBlocks(value: string): MarkdownBlock[] {
  const blocks: MarkdownBlock[] = [];
  const lines = value.split("\n");
  let paragraph: string[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;

  const flushParagraph = () => {
    const text = paragraph.join(" ").trim();
    if (text) blocks.push({ type: "paragraph", text });
    paragraph = [];
  };

  const flushList = () => {
    if (list?.items.length) blocks.push({ type: "list", ordered: list.ordered, items: list.items });
    list = null;
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      flushParagraph();
      flushList();
      continue;
    }

    const heading = /^(#{1,3})\s+(.+)$/.exec(trimmed);
    if (heading) {
      flushParagraph();
      flushList();
      blocks.push({ type: "heading", level: heading[1].length as 1 | 2 | 3, text: heading[2].trim() });
      continue;
    }

    const unordered = /^[-*]\s+(.+)$/.exec(trimmed);
    const ordered = /^\d+\.\s+(.+)$/.exec(trimmed);
    if (unordered || ordered) {
      flushParagraph();
      const isOrdered = Boolean(ordered);
      if (!list || list.ordered !== isOrdered) {
        flushList();
        list = { ordered: isOrdered, items: [] };
      }
      list.items.push(((ordered ?? unordered)?.[1] ?? "").trim());
      continue;
    }

    flushList();
    paragraph.push(trimmed);
  }

  flushParagraph();
  flushList();

  return blocks;
}

function LiveMarkdownDraft({
  value,
  emptyText,
  variant = "editor",
}: {
  value: string;
  emptyText: string;
  variant?: "editor" | "preview";
}) {
  const blocks = useMemo(() => parseMarkdownBlocks(value), [value]);

  if (!blocks.length) return <p className="text-muted-foreground">{emptyText}</p>;

  return (
    <div className={cn("space-y-3", variant === "preview" ? "text-slate-800" : "text-foreground")}>
      {blocks.map((block, index) => {
        if (block.type === "heading") {
          return (
            <h2
              key={`${block.type}-${index}`}
              className={cn(
                "font-bold leading-snug",
                block.level === 1 && (variant === "preview" ? "text-xl" : "text-base"),
                block.level === 2 && (variant === "preview" ? "text-lg" : "text-sm"),
                block.level === 3 && "text-sm",
              )}
            >
              <InlineMarkdownDraft value={block.text} />
            </h2>
          );
        }

        if (block.type === "list") {
          const listClassName = cn("space-y-1 pl-5 text-sm leading-6", block.ordered ? "list-decimal" : "list-disc");
          const items = block.items.map((item, itemIndex) => (
            <li key={`${item}-${itemIndex}`} className="pl-1">
              <InlineMarkdownDraft value={item} />
            </li>
          ));

          return block.ordered
            ? <ol key={`${block.type}-${index}`} className={listClassName}>{items}</ol>
            : <ul key={`${block.type}-${index}`} className={listClassName}>{items}</ul>;
        }

        return (
          <p
            key={`${block.type}-${index}`}
            className="text-sm leading-6"
          >
            <InlineMarkdownDraft value={block.text} />
          </p>
        );
      })}
    </div>
  );
}

function AutosaveIndicator({ saving }: { saving: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold text-muted-foreground transition-opacity">
      {saving ? <Clock3 className="size-3 animate-pulse text-warning" /> : <CheckCircle2 className="size-3 text-success" />}
      {saving ? "Saving..." : "Auto-saved moments ago"}
    </span>
  );
}

function ArticleHeader({
  canDraftWithAi,
  saving,
  drafting,
  onClose,
  onDraft,
}: {
  canDraftWithAi: boolean;
  saving: boolean;
  drafting?: boolean;
  onClose: () => void;
  onDraft: () => void;
}) {
  return (
    <header className="flex h-12 shrink-0 items-center justify-between gap-3 border-b bg-card/95 px-3.5 backdrop-blur">
      <div className="flex min-w-0 items-center gap-2.5">
        <button type="button" onClick={onClose} className="grid size-7 shrink-0 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label="Close knowledge editor">
          <X className="size-4" />
        </button>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold text-muted-foreground">AI Knowledge</p>
          <DialogTitle className="truncate text-sm font-bold text-foreground">Knowledge Editor</DialogTitle>
          <DialogDescription className="sr-only">Write, preview, and refine a knowledge article before saving or publishing it.</DialogDescription>
        </div>
      </div>
      <AutosaveIndicator saving={saving} />
      <div className="hidden items-center gap-2 md:flex">
        {/* <AppButton size="sm" variant="outline" aria-label="Undo changes"><Undo2 className="size-4" /></AppButton>
        <AppButton size="sm" variant="outline" aria-label="Redo changes"><Redo2 className="size-4" /></AppButton>
        <AppButton size="sm" variant="outline"><Eye className="size-4" />Preview PDF</AppButton>
        <AppButton size="sm" variant="outline"><History className="size-4" />Version History</AppButton> */}
        <AppButton size="sm" variant="secondary" className="h-8 min-h-8 px-3 text-xs" disabled={!canDraftWithAi} loading={drafting} loadingText="Drafting" onClick={onDraft}><Sparkles className="size-3.5" />Draft with AI</AppButton>
      </div>
    </header>
  );
}

function EditorToolbar() {
  const iconButtons = [
    Bold,
    Italic,
    Underline,
    List,
    ListOrdered,
    ListChecks,
    Quote,
    Code2,
    Link2,
    Image,
    Table2,
  ];
  return (
    <div className="flex items-center gap-0.5 overflow-x-auto border-b bg-muted/25 px-1.5 py-1 sm:flex-wrap sm:px-2 sm:py-1.5">
      <AppButton size="sm" variant="ghost" className="h-6 min-h-6 shrink-0 px-2 text-[10px] sm:h-7 sm:min-h-7 sm:text-[11px]">Paragraph</AppButton>
      {iconButtons.map((Icon, index) => (
        <AppButton key={index} type="button" size="icon" variant="ghost" className="size-6 min-h-6 shrink-0 sm:size-7 sm:min-h-7" aria-label="Editor formatting option">
          <Icon className="size-3" />
        </AppButton>
      ))}
    </div>
  );
}

function ArticleMetadataForm({
  value,
  services,
  titleError,
  drafting,
  onChange,
}: {
  value: KnowledgeEditorValue;
  services: BusinessService[];
  titleError?: string;
  drafting?: boolean;
  onChange: (value: KnowledgeEditorValue) => void;
}) {
  const selectedServiceId = value.relatedServiceIds[0] ?? "__none";
  return (
    <section className="space-y-2.5 p-3 sm:space-y-3 sm:p-4">
      <div className="flex items-center gap-2">
        <span className="grid size-6 place-items-center rounded-full bg-primary/10 text-xs font-bold text-primary">1</span>
        <h3 className="font-bold">Article Information</h3>
      </div>
      <label className="block text-xs font-semibold sm:text-sm">
        Title <span className="text-destructive">*</span>
        <input
          value={value.title}
          onChange={(event) => onChange({ ...value, title: event.target.value })}
          aria-invalid={Boolean(titleError)}
          aria-describedby={titleError ? "knowledge-title-error" : undefined}
          className={cn(
            "mt-1 h-8 w-full rounded-lg border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring sm:mt-1.5 sm:h-9",
            titleError && "border-destructive bg-destructive/5 focus-visible:ring-destructive/20",
          )}
          placeholder="Type the article topic here, e.g. How our booking process works"
        />
        <span className="mt-0.5 flex items-center justify-between gap-3 text-[11px]">
          <span id="knowledge-title-error" className={cn("font-semibold text-destructive", !titleError && "invisible")}>{titleError ?? "Title required"}</span>
          <span className="ml-auto text-muted-foreground">{value.title.length}/100</span>
        </span>
      </label>
      <label className="block text-xs font-semibold sm:text-sm">
        Summary <span className="text-destructive">*</span>
        <textarea value={value.summary} onChange={(event) => onChange({ ...value, summary: event.target.value })} rows={2} className="mt-1 w-full resize-y rounded-lg border bg-background px-3 py-1.5 text-sm leading-5 outline-none focus-visible:ring-2 focus-visible:ring-ring sm:mt-1.5 sm:py-2" placeholder="Briefly explain what this article helps customers understand." />
        <span className="mt-0.5 block text-right text-[11px] text-muted-foreground">{value.summary.length}/160</span>
      </label>
      <label className="block text-xs font-semibold sm:text-sm">
        Body / Content <span className="text-destructive">*</span>
        <div className="mt-1 overflow-hidden rounded-lg border bg-background sm:mt-1.5">
          <EditorToolbar />
          {drafting ? (
            <div className="min-h-28 w-full bg-transparent px-3 py-2 text-sm leading-6 outline-none sm:min-h-40 sm:py-2.5">
              <LiveMarkdownDraft value={value.body} emptyText="AI is getting ready to write..." />
            </div>
          ) : (
            <textarea value={value.body} onChange={(event) => onChange({ ...value, body: event.target.value })} rows={6} className="min-h-28 w-full resize-y bg-transparent px-3 py-2 text-sm leading-6 outline-none sm:min-h-40 sm:py-2.5" placeholder="Write the article content..." />
          )}
        </div>
      </label>
      <div className="grid gap-3 md:grid-cols-2">
        <label className="block text-xs font-semibold sm:text-sm">
          Category
          <input value={value.category} onChange={(event) => onChange({ ...value, category: event.target.value })} className="mt-1 h-8 w-full rounded-lg border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring sm:mt-1.5 sm:h-9" placeholder="Customer Service" />
        </label>
        <label className="block text-xs font-semibold sm:text-sm">
          Related service
          <AppSelect className="mt-1 h-8 sm:mt-1.5 sm:h-9" value={selectedServiceId} onValueChange={(serviceId) => onChange({ ...value, relatedServiceIds: serviceId === "__none" ? [] : [serviceId] })} options={[{ value: "__none", label: "No specific service" }, ...services.map((service) => ({ value: service.id, label: service.name, description: service.category ?? undefined }))]} />
        </label>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <label className="block text-xs font-semibold sm:text-sm">
          Tags
          <input value={value.tags} onChange={(event) => onChange({ ...value, tags: event.target.value })} className="mt-1 h-8 w-full rounded-lg border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring sm:mt-1.5 sm:h-9" placeholder="WhatsApp, Tips, Customer Service" />
        </label>
        <label className="block text-xs font-semibold sm:text-sm">
          Visibility
          <select value={value.visibility} onChange={(event) => onChange({ ...value, visibility: event.target.value as KnowledgeVisibility })} className="mt-1 h-8 w-full rounded-lg border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring sm:mt-1.5 sm:h-9">
            <option value="CLIENT_SENDABLE">Client Sendable</option>
            <option value="INTERNAL_ONLY">Internal Only</option>
          </select>
        </label>
      </div>
    </section>
  );
}

function PdfToolbar({ zoom, onZoom }: { zoom: string; onZoom: (zoom: string) => void }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
      <div className="flex items-center gap-2">
        <span className="grid size-6 place-items-center rounded-full bg-primary/10 text-xs font-bold text-primary">2</span>
        <h3 className="font-bold">Live PDF Preview</h3>
      </div>
      <div className="flex items-center gap-2">
        <AppButton size="icon" variant="secondary" className="size-8 min-h-8" aria-label="Desktop preview"><Monitor className="size-3.5" /></AppButton>
        <select value={zoom} onChange={(event) => onZoom(event.target.value)} className="h-8 rounded-lg border bg-background px-2 text-xs font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <option>75%</option>
          <option>100%</option>
          <option>125%</option>
        </select>
        <span className="hidden text-xs font-semibold text-muted-foreground sm:inline">Page 1 / 1</span>
      </div>
    </div>
  );
}

function PdfPreviewPanel({ value }: { value: KnowledgeEditorValue }) {
  const [zoom, setZoom] = useState("100%");
  const scale = zoom === "75%" ? "scale-[0.86]" : zoom === "125%" ? "scale-105" : "scale-100";
  return (
    <section className="flex min-h-0 flex-col border-l bg-muted/20">
      <PdfToolbar zoom={zoom} onZoom={setZoom} />
      <div className="min-h-0 flex-1 overflow-auto p-4">
        <article className={cn("mx-auto min-h-[440px] max-w-2xl origin-top rounded-xl border bg-white p-7 text-slate-950 shadow-sm transition-transform", scale)}>
          <div className="grid gap-5 md:grid-cols-[1fr_135px]">
            <div>
              <h1 className="text-2xl font-bold leading-tight">{value.title || "Untitled article"}</h1>
              <p className="mt-3 text-sm leading-6 text-slate-700">{value.summary || "Article summary will appear here as you write."}</p>
              
              {/* disabled by enoch */}
              {/* <div className="mt-5 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <span className="grid size-7 place-items-center rounded-full bg-primary text-primary-foreground text-[10px] font-bold">EA</span>
                <span>By BizReply Team</span>
                <span>•</span>
                <span>{readMinutes(value.body)} min read</span>
              </div> */}

            </div>
           
          </div>
          <div className="my-5 h-px bg-slate-200" />
          <div className="space-y-3 text-sm leading-6 text-slate-800">
            <LiveMarkdownDraft value={value.body} emptyText="Start writing to see the live PDF preview update instantly." variant="preview" />
          </div>
        </article>
      </div>
      <footer className="flex h-9 items-center justify-between gap-3 border-t bg-card px-4 text-xs text-muted-foreground">
     {/* i didn't request for the user to download any thing on the page */}
      </footer>
    </section>
  );
}


export function KnowledgeEditorDialog({ open, article, services, saving, drafting, publishing, canDraftWithAi = false, onOpenChange, onSave, onDraft, onPublish }: KnowledgeEditorDialogProps) {
  const [value, setValue] = useState<KnowledgeEditorValue>(() => valueFromArticle(article));
  const [mobileTab, setMobileTab] = useState<EditorTab>("editor");
  const [titleError, setTitleError] = useState<string | undefined>();
  const canPublish = Boolean(article && article.status !== "PUBLISHED" && onPublish);
  const canUseAiDraft = Boolean(canDraftWithAi && onDraft && !article);
  const title = value.title || "Untitled article";

  const updateValue = useCallback((next: KnowledgeEditorValue) => {
    if (titleError && next.title.trim()) setTitleError(undefined);
    setValue(next);
  }, [titleError]);

  const draftWithAi = () => {
    if (!value.title.trim()) {
      setTitleError("Add a topic or title before drafting with AI.");
      setMobileTab("editor");
      return;
    }
    setValue((current) => ({ ...current, summary: "", body: "", tags: "" }));
    onDraft?.(value, {
      onDelta: (delta) => setValue((current) => ({ ...current, body: `${current.body}${delta}` })),
      onMetadata: (metadata) => setValue((current) => ({
        ...current,
        title: metadata.title ?? current.title,
        summary: metadata.summary ?? current.summary,
        category: metadata.category ?? current.category,
        tags: metadata.tags?.join(", ") ?? current.tags,
        visibility: metadata.visibility ?? current.visibility,
      })),
    });
  };

  const editorPane = useMemo(() => <ArticleMetadataForm value={value} services={services} titleError={titleError} drafting={drafting} onChange={updateValue} />, [drafting, services, titleError, updateValue, value]);
  const previewPane = useMemo(() => <PdfPreviewPanel value={value} />, [value]);
  //const assistantPane = useMemo(() => <AIAssistantPanel value={value} onChange={setValue} />, [value]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogOverlay className="bg-background/45 backdrop-blur-[1px]" />
        <DialogContent className="left-1/2 top-1/2 flex h-[90dvh] w-[calc(100vw-1rem)] max-w-none -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl border bg-card p-0 shadow-[0_22px_70px_rgba(20,35,27,0.24)] sm:h-[82dvh] sm:w-[min(1180px,88vw)]">
          <ArticleHeader canDraftWithAi={canUseAiDraft} saving={saving} drafting={drafting} onClose={() => onOpenChange(false)} onDraft={draftWithAi} />
          <div className="flex items-center gap-2 border-b px-3 py-2 lg:hidden">
            {(["editor", "preview"] as EditorTab[]).map((tab) => <button key={tab} type="button" onClick={() => setMobileTab(tab)} className={cn("rounded-lg px-3 py-1.5 text-xs font-bold capitalize", mobileTab === tab ? "bg-secondary text-primary" : "text-muted-foreground")}>{tab}</button>)}
          </div>
          <div className="min-h-0 flex-1 lg:grid lg:grid-cols-[45%_55%]">
            <div className={cn("min-h-0 overflow-y-auto", mobileTab !== "editor" && "hidden lg:block")}>{editorPane}</div>
            <div className={cn("min-h-0 grid-rows-[minmax(0,1fr)_auto] lg:grid", mobileTab === "preview" ? "grid" : "hidden lg:grid")}>{previewPane}
              {/* {assistantPane} */}
              </div>
            {/* <div className={cn("min-h-0 overflow-y-auto lg:hidden", mobileTab === "assistant" ? "block" : "hidden")}>
            {assistantPane}</div> */}
          </div>
          <footer className="flex min-h-12 shrink-0 flex-wrap items-center justify-between gap-2 border-t bg-card px-3 py-2 sm:h-12 sm:flex-nowrap sm:px-4 sm:py-0">
            <span className="truncate text-xs text-muted-foreground"><CheckCircle2 className="mr-1 inline size-3.5 text-success" />Editing {title}</span>
            <div className="flex min-w-0 flex-wrap justify-end gap-2">
              <AppButton className="h-8 min-h-8 px-3 text-xs md:hidden" variant="secondary" disabled={!canUseAiDraft} loading={drafting} loadingText="Drafting" onClick={draftWithAi}><Sparkles className="size-3.5" />Draft with AI</AppButton>
              {canPublish && <AppButton className="h-8 min-h-8 px-3 text-xs" variant="outline" loading={publishing} loadingText="Publishing" onClick={onPublish}>Publish</AppButton>}
              <AppButton className="h-8 min-h-8 px-3 text-xs" loading={saving} loadingText="Saving" onClick={() => onSave(value)}><Save className="size-3.5" />Save Article</AppButton>
            </div>
          </footer>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
}
