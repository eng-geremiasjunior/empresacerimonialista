// Os tipos de ocorrência do evento (139) — módulo PURO, sem "use server".
//
// Por que aqui e não nas actions: um arquivo "use server" só pode
// exportar funções async. Uma constante (o array de tipos) exportada de
// lá NÃO atravessa a fronteira para o cliente como array — vira uma
// referência de servidor, e `TIPOS_OCORRENCIA.map` explode no navegador.
// A constante mora num módulo puro que cliente e servidor importam.

export const TIPOS_OCORRENCIA = ["avaria", "perda", "pertence", "outro"] as const;
export type TipoOcorrencia = (typeof TIPOS_OCORRENCIA)[number];
