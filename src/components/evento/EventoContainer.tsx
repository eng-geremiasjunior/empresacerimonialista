// Container da página do evento (Modelo A): 1240 px em toda rota, com
// 16 px entre os blocos — a medida do handoff. Antes o Roteiro e o
// Planejamento eram os únicos largos; com o cabeçalho de capa e o bloco
// de fases em três colunas, toda tela do evento precisa da mesma largura.
export function EventoContainer({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex max-w-[1240px] flex-col gap-4">{children}</div>
  );
}
