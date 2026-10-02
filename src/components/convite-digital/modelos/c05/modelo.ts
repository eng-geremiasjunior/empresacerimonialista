// O Convite 05 (Livro envelhecido) para o motor: a marcação literal do
// desenho com os textos fixos da cena do local trocados por campos da noiva.
// A frase já era prop no desenho (a capitular e as palavras saem dela no
// renderVals) e a cena dela não tem referência fixa: nada a trocar ali.

import { TEMPLATE } from "./template";
import Logica from "./logica";
import { ESTILO_GLOBAL, PADROES } from "./dados";
import { padroesDo, trocar, type DefinicaoDoConvite } from "../../motor/modelo";

const definicao: DefinicaoDoConvite = {
  marcacao: trocar(TEMPLATE, [
    ["Fazenda Santa Clara", "{{ local }}"],
    ["Estrada X, 123", "{{ endereco }}"],
    ["Tiradentes · MG", "{{ cidade }}"],
  ]),
  estiloGlobal: ESTILO_GLOBAL,
  Logica,
  padroes: { ...padroesDo(PADROES) },
  exemplo: { local: "Fazenda Santa Clara", endereco: "Estrada X, 123", cidade: "Tiradentes · MG" },
};

export default definicao;
