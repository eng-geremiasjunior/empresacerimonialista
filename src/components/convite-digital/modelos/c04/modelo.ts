// O Convite 04 (Folha que se abre) para o motor: a marcação literal do
// desenho com os textos fixos da cena do local trocados por campos da noiva.
// A frase já era prop no desenho (renderVals → words) e a cena dela não tem
// referência fixa: fica como está.

import { TEMPLATE } from "./template";
import Logica from "./logica";
import { ESTILO_GLOBAL, PADROES } from "./dados";
import { padroesDo, trocar, type DefinicaoDoConvite } from "../../motor/modelo";

const definicao: DefinicaoDoConvite = {
  marcacao: trocar(TEMPLATE, [
    ["Quinta das Oliveiras", "{{ local }}"],
    ["Estrada X, 123", "{{ endereco }}"],
    ["Campinas · SP", "{{ cidade }}"],
  ]),
  estiloGlobal: ESTILO_GLOBAL,
  Logica,
  padroes: { ...padroesDo(PADROES) },
  exemplo: { local: "Quinta das Oliveiras", endereco: "Estrada X, 123", cidade: "Campinas · SP" },
};

export default definicao;
