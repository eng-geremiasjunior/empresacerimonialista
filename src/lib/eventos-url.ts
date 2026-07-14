// Estado da listagem de eventos, inteiramente na URL (compartilhável,
// funciona com voltar/avançar do navegador).

export type EventosParams = {
  page: string;
  perPage: string;
  q: string;
  status: string; // lista separada por vírgula de EventStatus
  type: string; // lista separada por vírgula de EventType
  sort: string; // date | client | status
  dir: string; // asc | desc
  view: string; // table | cards
};

const DEFAULTS: EventosParams = {
  page: "1",
  perPage: "20",
  q: "",
  status: "",
  type: "",
  sort: "date",
  dir: "asc",
  view: "table",
};

export function parseEventosParams(
  searchParams: Record<string, string | string[] | undefined>
): EventosParams {
  const get = (key: keyof EventosParams) => {
    const raw = searchParams[key];
    const value = Array.isArray(raw) ? raw[0] : raw;
    return value ?? DEFAULTS[key];
  };
  return {
    page: get("page"),
    perPage: get("perPage"),
    q: get("q"),
    status: get("status"),
    type: get("type"),
    sort: get("sort"),
    dir: get("dir"),
    view: get("view"),
  };
}

// Só grava na URL o que diverge do padrão — links ficam curtos e limpos.
export function buildEventosHref(
  current: EventosParams,
  patch: Partial<EventosParams>
): string {
  const merged = { ...current, ...patch };
  const sp = new URLSearchParams();
  (Object.keys(DEFAULTS) as (keyof EventosParams)[]).forEach((key) => {
    if (merged[key] && merged[key] !== DEFAULTS[key]) {
      sp.set(key, merged[key]);
    }
  });
  const qs = sp.toString();
  return qs ? `/eventos?${qs}` : "/eventos";
}
