export type SearchFilterDefinition<T> = {
  key: string;
  label: string;
  aliases?: string[];
  getValue: (item: T) => string | string[] | number | boolean | null | undefined;
};

export type ParsedFilterToken = { key: string; value: string; raw: string };
export type ParsedSearchQuery = { raw: string; text: string; filters: ParsedFilterToken[] };
export type SearchResult<T> = { item: T; score: number; group: string };

export function normalizeSearchValue(value: string) {
  return value.trim().toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ");
}

export function parseSearchQuery(query: string): ParsedSearchQuery {
  const filterPattern = /@([a-zA-Z][\w-]*)\s*([^@]*)/g;
  const filters: ParsedFilterToken[] = [];
  const freeText: string[] = [];
  let lastIndex = 0;

  for (const match of query.matchAll(filterPattern)) {
    const [raw, key, value = ""] = match;
    const index = match.index ?? 0;
    const leadText = query.slice(lastIndex, index).trim();
    if (leadText) freeText.push(leadText);
    filters.push({ key: normalizeSearchValue(key), value: value.trim(), raw: raw.trim() });
    lastIndex = index + raw.length;
  }

  const trailing = query.slice(lastIndex).trim();
  if (trailing && !trailing.startsWith("@")) freeText.push(trailing);
  return { raw: query, text: freeText.join(" ").trim(), filters };
}

function toSearchArray(value: string | string[] | number | boolean | null | undefined) {
  if (value === null || value === undefined) return [];
  return Array.isArray(value) ? value.map(String) : [String(value)];
}

function matchesText(haystack: string, query: string) {
  if (!query) return true;
  return normalizeSearchValue(query).split(" ").filter(Boolean).every((term) => haystack.includes(term));
}

export function filterSearchItems<T>({
  items,
  query,
  availableFilters,
  getItemLabel,
  getItemGroup,
  getSearchableText,
  limit = 30,
}: {
  items: T[];
  query: string;
  availableFilters: SearchFilterDefinition<T>[];
  getItemLabel: (item: T) => string;
  getItemGroup?: (item: T) => string;
  getSearchableText: (item: T) => string | string[];
  limit?: number;
}) {
  const parsed = parseSearchQuery(query);
  const textFallbacks: string[] = [];
  const knownFilters: { definition: SearchFilterDefinition<T>; value: string }[] = [];

  for (const token of parsed.filters) {
    const definition = availableFilters.find((candidate) => {
      const aliases = candidate.aliases?.map(normalizeSearchValue) ?? [];
      return normalizeSearchValue(candidate.key) === token.key || aliases.includes(token.key);
    });
    if (!definition || !token.value) textFallbacks.push([definition?.label ?? token.key, token.value].filter(Boolean).join(" "));
    else knownFilters.push({ definition, value: token.value });
  }

  const normalizedText = normalizeSearchValue([parsed.text, ...textFallbacks].filter(Boolean).join(" "));
  const results = items
    .map((item) => {
      const label = getItemLabel(item);
      const haystack = normalizeSearchValue([label, ...toSearchArray(getSearchableText(item))].join(" "));
      if (!matchesText(haystack, normalizedText)) return null;
      if (!knownFilters.every(({ definition, value }) => matchesText(normalizeSearchValue(toSearchArray(definition.getValue(item)).join(" ")), value))) return null;
      const normalizedLabel = normalizeSearchValue(label);
      let score = knownFilters.length * 2;
      if (normalizedText) {
        if (normalizedLabel.startsWith(normalizedText)) score += 10;
        if (normalizedLabel.includes(normalizedText)) score += 6;
        score += normalizedText.split(" ").filter((term) => haystack.includes(term)).length;
      }
      return { item, score, group: getItemGroup?.(item) ?? "Results" } satisfies SearchResult<T>;
    })
    .filter((result): result is SearchResult<T> => Boolean(result))
    .sort((left, right) => right.score - left.score || getItemLabel(left.item).localeCompare(getItemLabel(right.item)))
    .slice(0, limit);

  return { parsed, results };
}

export function groupSearchResults<T>(results: SearchResult<T>[]) {
  const groups = new Map<string, SearchResult<T>[]>();
  for (const result of results) groups.set(result.group, [...(groups.get(result.group) ?? []), result]);
  return Array.from(groups.entries());
}
