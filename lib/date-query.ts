const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

export function apiDateFrom(value: string) {
  return DATE_ONLY.test(value) ? `${value}T00:00:00.000Z` : value;
}

export function apiDateTo(value: string) {
  return DATE_ONLY.test(value) ? `${value}T23:59:59.999Z` : value;
}
