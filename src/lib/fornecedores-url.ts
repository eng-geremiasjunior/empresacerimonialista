// Estado da listagem /fornecedores, todo na URL (compartilhável).

export type FornecedoresParams = {
  page: string;
  perPage: string;
  q: string;
  categoria: string; // slugs separados por vírgula
  tipo: string; // operacional | apoio | parceiro | ""
  status: string; // status ou ""
  faixa: string; // economico | intermediario | premium | ""
};

const DEFAULTS: FornecedoresParams = {
  page: "1",
  perPage: "20",
  q: "",
  categoria: "",
  tipo: "",
  status: "",
  faixa: "",
};

export function parseFornecedoresParams(
  searchParams: Record<string, string | string[] | undefined>
): FornecedoresParams {
  const get = (key: keyof FornecedoresParams) => {
    const raw = searchParams[key];
    const value = Array.isArray(raw) ? raw[0] : raw;
    return value ?? DEFAULTS[key];
  };
  return {
    page: get("page"),
    perPage: get("perPage"),
    q: get("q"),
    categoria: get("categoria"),
    tipo: get("tipo"),
    status: get("status"),
    faixa: get("faixa"),
  };
}

export function buildFornecedoresHref(
  current: FornecedoresParams,
  patch: Partial<FornecedoresParams>
): string {
  const merged = { ...current, ...patch };
  const sp = new URLSearchParams();
  (Object.keys(DEFAULTS) as (keyof FornecedoresParams)[]).forEach((key) => {
    if (merged[key] && merged[key] !== DEFAULTS[key]) sp.set(key, merged[key]);
  });
  const qs = sp.toString();
  return qs ? `/fornecedores?${qs}` : "/fornecedores";
}
