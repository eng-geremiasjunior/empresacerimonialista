// O Convite 03 (Conto de fadas) para o motor: a marcação literal do desenho
// com os textos fixos da cena do local trocados por campos da noiva. A frase
// já era prop no desenho (renderVals → words) e quem assina embaixo dela são
// os nomes do casal: não há referência fixa a trocar.

import { TEMPLATE } from "./template";
import Logica from "./logica";
import { ESTILO_GLOBAL, PADROES } from "./dados";
import { padroesDo, trocar, type DefinicaoDoConvite } from "../../motor/modelo";

const definicao: DefinicaoDoConvite = {
  marcacao: trocar(TEMPLATE, [
    ["Palácio das Rosas", "{{ local }}"],
    ["Rua X, 123", "{{ endereco }}"],
    ["Petrópolis · RJ", "{{ cidade }}"],
  ]),
  estiloGlobal: ESTILO_GLOBAL,
  Logica,
  padroes: { ...padroesDo(PADROES) },
  exemplo: { local: "Palácio das Rosas", endereco: "Rua X, 123", cidade: "Petrópolis · RJ" },
};

export default definicao;
