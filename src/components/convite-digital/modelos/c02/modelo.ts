// O Convite 02 (Praiano) para o motor: a marcação literal do desenho com os
// textos fixos da cena do local trocados por campos da noiva. A frase já é
// prop no desenho (renderVals → words) e quem assina a frase são os nomes do
// casal, que vêm das props: aqui não há referência a trocar.
//
// "às 16h30, ao entardecer": o ", ao entardecer" do desenho só vale com a
// hora no fim da tarde (16h às 18h59); fora disso, sai.

import { TEMPLATE } from "./template";
import Logica from "./logica";
import { ESTILO_GLOBAL, PADROES } from "./dados";
import { horaDoISO, padroesDo, trocar, type DefinicaoDoConvite } from "../../motor/modelo";

const definicao: DefinicaoDoConvite = {
  marcacao: trocar(TEMPLATE, [
    ["Casa Maré", "{{ local }}"],
    ["Rua X, 123", "{{ endereco }}"],
    ["Ilhabela · SP", "{{ cidade }}"],
    ["às {{ dt.time }}, ao entardecer", "às {{ dt.time }}{{ periodo }}"],
  ]),
  estiloGlobal: ESTILO_GLOBAL,
  Logica,
  padroes: { ...padroesDo(PADROES) },
  exemplo: { local: "Casa Maré", endereco: "Rua X, 123", cidade: "Ilhabela · SP" },
  derivar: (p) => {
    const h = horaDoISO(p.dataISO);
    return { periodo: h !== null && h >= 16 && h < 19 ? ", ao entardecer" : "" };
  },
};

export default definicao;
