export function resolveSetupRoute(route?: string | null) {
  if (!route) return { href: null, available: false };
  if (route === "/settings/integrations/whatsapp") return { href: "/settings/business/whatsapp", available: true };
  if (["/settings/business/whatsapp", "/settings/business/profile"].includes(route)) return { href: route, available: true };
  return { href: route, available: false };
}
