// "Como chegar" — o endereço do evento vira navegação de um toque.
//
// Nada de mapa embutido: quem abre isto é o fornecedor no celular, e o
// mapa que ele confia já está instalado. Os dois links abrem o app
// nativo (Google Maps e Waze) com o endereço; zero dependência, zero
// chave de API. Quando a Ficha Técnica do Local existir, o pin exato da
// cerimonialista (sítio onde o GPS erra a porteira) substitui o texto.

export function ComoChegar({ endereco }: { endereco: string | null }) {
  const limpo = endereco?.trim();
  if (!limpo) return null;
  const q = encodeURIComponent(limpo);

  const base =
    "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium";

  return (
    <span className="mt-2 flex flex-wrap gap-2">
      <a
        href={`https://www.google.com/maps/search/?api=1&query=${q}`}
        target="_blank"
        rel="noopener noreferrer"
        className={`${base} border-stone-300 bg-white text-stone-700 hover:bg-stone-50`}
      >
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
          <circle cx="12" cy="10" r="3" />
        </svg>
        Como chegar
      </a>
      <a
        href={`https://waze.com/ul?q=${q}&navigate=yes`}
        target="_blank"
        rel="noopener noreferrer"
        className={`${base} border-stone-200 bg-white text-stone-500 hover:bg-stone-50`}
      >
        Waze
      </a>
    </span>
  );
}
