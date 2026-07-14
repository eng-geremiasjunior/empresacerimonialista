// Estado da página /financeiro (empresa), todo na URL (compartilhável).
// Paralelo e independente de financeiro-url.ts (que servia os eventos).

export type FinanceiroEmpresaParams = {
  page: string;
  perPage: string;
  tipo: string; // receita | despesa | ""
  categoria: string; // slug da categoria ou ""
  periodo: string; // todas | mes | custom
  from: string;
  to: string;
};

const DEFAULTS: FinanceiroEmpresaParams = {
  page: "1",
  perPage: "20",
  tipo: "",
  categoria: "",
  periodo: "todas",
  from: "",
  to: "",
};

export function parseFinanceiroEmpresaParams(
  searchParams: Record<string, string | string[] | undefined>
): FinanceiroEmpresaParams {
  const get = (key: keyof FinanceiroEmpresaParams) => {
    const raw = searchParams[key];
    const value = Array.isArray(raw) ? raw[0] : raw;
    return value ?? DEFAULTS[key];
  };
  return {
    page: get("page"),
    perPage: get("perPage"),
    tipo: get("tipo"),
    categoria: get("categoria"),
    periodo: get("periodo"),
    from: get("from"),
    to: get("to"),
  };
}

export function buildFinanceiroEmpresaHref(
  current: FinanceiroEmpresaParams,
  patch: Partial<FinanceiroEmpresaParams>
): string {
  const merged = { ...current, ...patch };
  const sp = new URLSearchParams();
  (Object.keys(DEFAULTS) as (keyof FinanceiroEmpresaParams)[]).forEach(
    (key) => {
      if (merged[key] && merged[key] !== DEFAULTS[key]) sp.set(key, merged[key]);
    }
  );
  const qs = sp.toString();
  return qs ? `/financeiro?${qs}` : "/financeiro";
}
