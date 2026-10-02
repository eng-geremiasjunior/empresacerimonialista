// O Convite 06 (Veneza · Máscara de baile) para o motor: a marcação literal
// do desenho com os textos fixos da cena do local trocados por campos da
// noiva. A frase já é prop no desenho (renderVals → words) e a cena dela não
// tem referência fixa: ali não há o que trocar.

import { TEMPLATE } from "./template";
import Logica from "./logica";
import { ESTILO_GLOBAL, PADROES } from "./dados";
import { padroesDo, trocar, type DefinicaoDoConvite } from "../../motor/modelo";

const definicao: DefinicaoDoConvite = {
  marcacao: trocar(TEMPLATE, [
    ["Villa Serenissima", "{{ local }}"],
    ["Rua X, 123", "{{ endereco }}"],
    ["São Paulo · SP", "{{ cidade }}"],
  ]),
  estiloGlobal: ESTILO_GLOBAL,
  Logica,
  padroes: { ...padroesDo(PADROES) },
  exemplo: { local: "Villa Serenissima", endereco: "Rua X, 123", cidade: "São Paulo · SP" },
};

export default definicao;
