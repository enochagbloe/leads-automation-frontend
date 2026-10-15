import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BusinessDemoCard } from "@/components/demo/business-demo-card";
import { DemoCustomerChat } from "@/components/demo/demo-customer-chat";
import { apiRequest } from "@/lib/api-client";
vi.mock("@/lib/api-client", () => ({ apiRequest: vi.fn(), getApiErrorMessage: (e: Error) => e.message }));
vi.mock("@/lib/env", () => ({ env: { apiUrl: "https://test.invalid/api" } }));
vi.mock("@/components/conversations/conversation-workspace", () => ({ MessageBubble: ({ message }: {message: {content: string}}) => <p>{message.content}</p> }));
const session = { token: "demo-test-token", demo: { expiresAt: new Date(Date.now()+600000).toISOString(), business: { name: "Example Firm" }, conversation: { id: "c1" } } };
const fetcher = vi.fn();
beforeEach(() => { vi.clearAllMocks(); sessionStorage.clear(); window.location.hash = "invite=signed-business-invite"; vi.stubGlobal("fetch",fetcher); Element.prototype.scrollIntoView = vi.fn(); });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
const response = (value: unknown, ok = true, status = 200) => ({ ok, status, json: async () => value, body: null });
it("owner creates an in-app QR without sending the invite to an external QR service", async () => {
  vi.mocked(apiRequest).mockResolvedValue({ invite: "signed-invite" }); render(<BusinessDemoCard />);
  await userEvent.click(screen.getByRole("button",{name:"Create demo QR code"}));
  const link = await screen.findByRole("link",{name:"Open customer chat"});
  expect(link.getAttribute("href")).toBe(`${window.location.origin}/demo#invite=signed-invite`);
  expect(document.querySelector("svg title")?.textContent).toBe("Open customer demo");
  expect(apiRequest).toHaveBeenCalledWith("/demo/business/invite",{method:"POST"});
  expect(fetcher).not.toHaveBeenCalled();
});
it("join limit errors remain visible and retry reuses the same key without owner auth headers", async () => {
  fetcher.mockResolvedValue(response({error:{message:"Too many active demo sessions"}},false,429)); render(<DemoCustomerChat />);
  await userEvent.click(screen.getByRole("button",{name:"Start demo chat"}));
  await screen.findByText("Too many active demo sessions"); await userEvent.click(screen.getByRole("button",{name:"Start demo chat"}));
  await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(2));
  const first=fetcher.mock.calls[0][1], second=fetcher.mock.calls[1][1];
  expect(first.headers["Idempotency-Key"]).toBe(second.headers["Idempotency-Key"]);
  expect(first.headers.Authorization).toBeUndefined(); expect(first.headers["X-Business-Id"]).toBeUndefined();
  expect(JSON.parse(first.body)).toEqual({invite:"signed-business-invite"});
});
it("reload restores customer credential and reads saved AI messages without creating a session", async () => {
  sessionStorage.setItem("demo:signed-business-invite",JSON.stringify(session));
  fetcher.mockImplementation(async (url:string) => response(url.endsWith("/events") ? {} : {messages:[{id:"m1",text:"Welcome from Example Firm",senderType:"AI",direction:"OUTBOUND",messageType:"TEXT",createdAt:new Date().toISOString()}]}));
  render(<DemoCustomerChat />); await screen.findByText("Welcome from Example Firm");
  expect(fetcher.mock.calls.some(([url]) => url.endsWith("/join"))).toBe(false);
  expect(fetcher.mock.calls.every(([,options]) => options.headers.Authorization === "Bearer demo-test-token")).toBe(true);
});
it("expired session never sends another message or starts a session automatically", async () => {
  sessionStorage.setItem("demo:signed-business-invite",JSON.stringify({...session,demo:{...session.demo,expiresAt:new Date(0).toISOString()}}));
  fetcher.mockResolvedValue(response({},false,401)); render(<DemoCustomerChat />);
  await screen.findByText(/This demo has expired/);
  expect(fetcher.mock.calls.some(([url]) => url.endsWith("/join") || url.endsWith("/messages"))).toBe(false);
  await userEvent.click(screen.getByRole("button",{name:"Start a new demo"}));
  expect(sessionStorage.getItem("demo:signed-business-invite")).toBeNull();
});
