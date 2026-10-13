import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, renderHook, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { apiRequest } from "@/lib/api-client";
import { KnowledgeQualityPanel, canReviewKnowledgeQuality, qualityConflictMessage } from "@/components/knowledge/hub/knowledge-quality-panel";
import { useKnowledgeQualityAudit, useResolveKnowledgeQualityFinding } from "@/hooks/use-knowledge";
import type { KnowledgeArticle, KnowledgeQualityAudit, KnowledgeQualityFinding, KnowledgeQualityFindingCode } from "@/types/knowledge";
import type { ActiveMembership } from "@/types/auth";

vi.mock("@/lib/api-client", () => ({ apiRequest: vi.fn() }));
vi.mock("@/lib/env", () => ({ env: { useMockApi: false } }));

const endpoint = "/business/knowledge/quality-audit";
const request = vi.mocked(apiRequest);
const revision = "2026-10-13T10:00:00.000Z";
const articles: KnowledgeArticle[] = ["a", "b"].map(id => ({
  id, businessId: "biz", title: `Article ${id}`, body: "Confirmed information", category: "Original",
  tags: [], relatedServiceIds: ["s1"], relatedPolicyIds: ["p1"], status: "PUBLISHED", source: "MANUAL",
  visibility: "CLIENT_SENDABLE", aiGenerated: false, createdAt: revision, updatedAt: "older-list-revision",
}));
const finding = (code: KnowledgeQualityFindingCode, extra: Partial<KnowledgeQualityFinding> = {}): KnowledgeQualityFinding => ({
  code, severity: "WARNING", articleIds: ["a"], suggestedAction: "Please review this information.",
  findingKey: `opaque-${code}`, articleRevisions: [{ articleId: "a", updatedAt: revision }, { articleId: "b", updatedAt: revision }],
  reviewStatus: "OPEN", ...extra,
});
let audit: KnowledgeQualityAudit;
let resolveAction: () => Promise<unknown>;
let clients: QueryClient[];
const mutations = () => request.mock.calls.filter(([path]) => path === `${endpoint}/resolve`);
const body = (index = 0) => JSON.parse(mutations()[index][1]?.body as string);
function mount(canManage = true, providedArticles = articles) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  clients.push(client);
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  render(<KnowledgeQualityPanel businessId="biz" canManage={canManage} articles={providedArticles} />, { wrapper });
  return { client, wrapper, user: userEvent.setup() };
}
beforeEach(() => {
  clients = [];
  audit = { businessId: "biz", findings: [], summary: { articlesScanned: 2, findings: 0, duplicateGroups: 0, categoryConflictGroups: 0, articlesNeedingReview: 0 } };
  resolveAction = async () => ({ action: "DISMISS", articleId: null, originalFindingStillAppears: false, findings: [] });
  request.mockReset();
  request.mockImplementation(async (path) => {
    if (path === endpoint) return structuredClone(audit);
    if (path === `${endpoint}/resolve`) return resolveAction();
    throw new Error(`Unexpected request: ${path}`);
  });
});
afterEach(() => { cleanup(); clients.forEach(client => client.clear()); });

describe("Knowledge quality review", () => {
  it("renders a clean audit without making corrections", async () => {
    mount();
    expect(await screen.findByText("Knowledge quality looks good")).toBeTruthy();
    expect(mutations()).toHaveLength(0);
  });

  it.each([
    ["DUPLICATE_CUSTOMER_ARTICLE", "Duplicate customer knowledge"],
    ["CATEGORY_NORMALIZATION_NEEDED", "Category needs review"],
    ["MISSING_RELEVANCE_METADATA", "Missing service or policy relationship"],
    ["POSSIBLE_OUT_OF_DOMAIN_ARTICLE", "Possible unrelated knowledge"],
    ["SUSPICIOUS_RELEVANCE_RELATIONSHIP", "Relationship needs verification"],
    ["STALE_RELEVANCE_RELATIONSHIP", "Outdated relationship"],
  ] as const)("renders %s with a human label, article title, status and advice", async (code, label) => {
    audit.findings = [finding(code)];
    audit.summary.findings = 1;
    audit.summary.articlesNeedingReview = 1;
    mount();
    expect(await screen.findByText(label)).toBeTruthy();
    for (const text of ["Article a", "Warning", "Open", "Please review this information.", "1 findings · 1 articles needing review"]) expect(screen.getByText(text)).toBeTruthy();
    expect(screen.queryByText(audit.findings[0].findingKey)).toBeNull();
    expect(mutations()).toHaveLength(0);
  });

  it("shows dismissed findings without remediation controls", async () => {
    audit.findings = [finding("CATEGORY_NORMALIZATION_NEEDED", { reviewStatus: "DISMISSED", severity: "INFO" })];
    mount();
    expect(await screen.findByText("Dismissed")).toBeTruthy();
    expect(screen.getByText("Info")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Dismiss" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Review category" })).toBeNull();
  });

  it("requires explicit duplicate selection and confirmation, then archives through quality resolve", async () => {
    audit.findings = [finding("DUPLICATE_CUSTOMER_ARTICLE", { articleIds: ["a", "b"] })];
    const { user } = mount();
    await user.click(await screen.findByRole("button", { name: "Choose article to archive" }));
    expect((screen.getByLabelText("Article to review") as HTMLSelectElement).value).toBe("");
    expect(screen.queryByRole("button", { name: "Archive article" })).toBeNull();
    await user.selectOptions(screen.getByLabelText("Article to review"), "b");
    await user.click(screen.getByRole("button", { name: "Archive article" }));
    expect(screen.getByRole("alertdialog").textContent).toContain("stop being available to the customer-facing AI");
    expect(mutations()).toHaveLength(0);
    await user.click(screen.getByRole("button", { name: "Confirm archive" }));
    await waitFor(() => expect(mutations()).toHaveLength(1));
    expect(body()).toEqual({ action: "ARCHIVE_ARTICLE", findingKey: audit.findings[0].findingKey, articleId: "b", expectedArticleUpdatedAt: revision });
    expect(request.mock.calls.some(([path]) => path.includes("/articles/") && path.includes("archive"))).toBe(false);
  });

  it("sends the selected article's audit revision and explicit category", async () => {
    audit.findings = [finding("CATEGORY_NORMALIZATION_NEEDED", { articleIds: ["a", "b"] })];
    const { user } = mount();
    await user.click(await screen.findByRole("button", { name: "Review category" }));
    await user.selectOptions(screen.getByLabelText("Article to review"), "b");
    await user.clear(screen.getByLabelText("Category"));
    await user.type(screen.getByLabelText("Category"), "  Services  ");
    await user.click(screen.getByRole("button", { name: "Save category" }));
    await waitFor(() => expect(mutations()).toHaveLength(1));
    expect(body()).toEqual({ action: "UPDATE_CATEGORY", findingKey: audit.findings[0].findingKey, articleId: "b", expectedArticleUpdatedAt: revision, category: "Services" });
  });

  it.each([false, true])("sends complete explicitly selected relationship arrays (clear=%s)", async clear => {
    audit.findings = [finding("STALE_RELEVANCE_RELATIONSHIP")];
    const original = request.getMockImplementation()!;
    request.mockImplementation(async (path, options) => {
      if (path.startsWith("/business/services?")) {
        const second = new URLSearchParams(path.split("?")[1]).get("page") === "2";
        return { items: second ? [{ id: "s2", name: "Service 2", isActive: true, isArchived: false }] : [{ id: "s1", name: "Service 1", isActive: true, isArchived: false }, { id: "inactive", name: "Inactive service", isActive: false }], pagination: { totalPages: 2 } };
      }
      if (path.startsWith("/business/policies?")) return { items: [
        { id: "p1", title: "Policy 1", isActive: true, visibility: "CUSTOMER_FACING" },
        { id: "p2", title: "Policy 2", isActive: true, visibility: "CUSTOMER_FACING" },
        { id: "internal", title: "Internal policy", isActive: true, visibility: "INTERNAL_ONLY" },
      ], pagination: { totalPages: 1 } };
      return original(path, options);
    });
    const { user } = mount();
    await user.click(await screen.findByRole("button", { name: "Review relationships" }));
    await screen.findByLabelText("Service 2");
    expect(screen.queryByLabelText("Internal policy")).toBeNull();
    expect(screen.queryByLabelText("Inactive service")).toBeNull();
    await user.click(screen.getByLabelText("Service 1"));
    await user.click(screen.getByLabelText("Policy 1"));
    if (!clear) {
      await user.click(screen.getByLabelText("Service 2"));
      await user.click(screen.getByLabelText("Policy 2"));
    }
    expect(mutations()).toHaveLength(0);
    await user.click(screen.getByRole("button", { name: "Save relationships" }));
    await waitFor(() => expect(mutations()).toHaveLength(1));
    expect(body()).toEqual({ action: "UPDATE_RELATIONSHIPS", findingKey: audit.findings[0].findingKey, articleId: "a", expectedArticleUpdatedAt: revision, relatedServiceIds: clear ? [] : ["s2"], relatedPolicyIds: clear ? [] : ["p2"] });
  });

  it("dismisses the exact key, reuses a key on network retry and creates a new key for a new action", async () => {
    audit.findings = [finding("POSSIBLE_OUT_OF_DOMAIN_ARTICLE")];
    let attempt = 0;
    resolveAction = async () => { if (++attempt === 1) throw new Error("Network unavailable"); return { originalFindingStillAppears: true, findings: audit.findings }; };
    const { user, client } = mount();
    const invalidate = vi.spyOn(client, "invalidateQueries");
    await user.click(await screen.findByRole("button", { name: "Dismiss" }));
    await user.click(await screen.findByRole("button", { name: "Retry same action" }));
    await screen.findByText("Review saved. This finding still appears in the latest audit.");
    await user.click(screen.getByRole("button", { name: "Dismiss" }));
    await waitFor(() => expect(mutations()).toHaveLength(3));
    expect(body()).toEqual({ action: "DISMISS", findingKey: audit.findings[0].findingKey });
    const keys = mutations().map(([, init]) => (init?.headers as Record<string, string>)["Idempotency-Key"]);
    expect(keys[0]).toBeTruthy(); expect(keys[1]).toBe(keys[0]); expect(keys[2]).not.toBe(keys[0]);
    expect(mutations()[0][1]?.method).toBe("POST");
    for (const prefix of ["knowledge-quality-audit", "knowledge-articles", "knowledge-search", "knowledge-stats"]) expect(invalidate).toHaveBeenCalledWith({ queryKey: [prefix, "biz"] });
  });

  it("refreshes on 409, resets the stale editor and requires fresh user review without replay", async () => {
    audit.findings = [finding("CATEGORY_NORMALIZATION_NEEDED")];
    resolveAction = async () => { throw Object.assign(new Error("Conflict"), { status: 409 }); };
    const { user, client } = mount();
    const invalidate = vi.spyOn(client, "invalidateQueries");
    await user.click(await screen.findByRole("button", { name: "Review category" }));
    await user.click(screen.getByRole("button", { name: "Save category" }));
    expect(await screen.findByText(qualityConflictMessage)).toBeTruthy();
    expect(screen.queryByLabelText("Category")).toBeNull();
    expect(screen.queryByRole("button", { name: "Retry same action" })).toBeNull();
    expect(mutations()).toHaveLength(1);
    expect(request.mock.calls.filter(([path]) => path === endpoint).length).toBeGreaterThan(1);
    for (const prefix of ["knowledge-quality-audit", "knowledge-articles", "knowledge-search", "knowledge-stats"]) expect(invalidate).toHaveBeenCalledWith({ queryKey: [prefix, "biz"] });
  });

  it("blocks read-only/staff access in the panel and mutation hook", async () => {
    const { wrapper } = mount(false);
    expect(screen.queryByRole("button", { name: "Dismiss" })).toBeNull();
    expect(request).not.toHaveBeenCalled();
    const { result } = renderHook(() => useResolveKnowledgeQualityFinding("biz", false), { wrapper });
    await expect(result.current.mutateAsync({ input: { action: "DISMISS", findingKey: "key" }, idempotencyKey: "key" })).rejects.toThrow("management access");
    expect(mutations()).toHaveLength(0);
  });

  it.each([
    ["BUSINESS_OWNER", "ACTIVE", true, true], ["MANAGER", "ACTIVE", true, true],
    ["MANAGER", "ACTIVE", false, false], ["STAFF", "ACTIVE", true, false],
    ["BUSINESS_OWNER", "DISABLED", true, false],
  ] as const)("checks role %s, status %s, permission %s", (role, status, permission, allowed) => {
    const membership: ActiveMembership = { id: "membership", role, status, joinedAt: null };
    expect(canReviewKnowledgeQuality({ membership, permissions: permission ? ["knowledge:manage"] : [] })).toBe(allowed);
  });

  it("does not fetch an audit without an active business", () => {
    const { wrapper } = mount(false);
    renderHook(() => useKnowledgeQualityAudit(undefined, true), { wrapper });
    expect(request).not.toHaveBeenCalled();
  });

  it("offers retry after an audit load failure", async () => {
    request.mockRejectedValueOnce(new Error("Unavailable"));
    const { user } = mount();
    await user.click(await screen.findByRole("button", { name: "Retry quality audit" }));
    expect(await screen.findByText("Knowledge quality looks good")).toBeTruthy();
  });
});
