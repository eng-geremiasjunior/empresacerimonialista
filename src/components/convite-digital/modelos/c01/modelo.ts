// O Convite 01 (Violino) para o motor: a marcação literal do desenho com os
// textos fixos da cena do local e da frase trocados por campos da noiva. No
// desenho a frase do 01 era fixa (sem prop): virou {{ frase }} e
// {{ referencia }}, com o texto do desenho como padrão.

import { TEMPLATE } from "./template";
import Logica from "./logica";
import { ESTILO_GLOBAL, PADROES } from "./dados";
import { padroesDo, trocar, type DefinicaoDoConvite } from "../../motor/modelo";

const FRASE = "O amor é paciente, o amor é bondoso. Tudo sofre, tudo crê, tudo espera, tudo suporta.";

const definicao: DefinicaoDoConvite = {
  marcacao: trocar(TEMPLATE, [
    [FRASE, "{{ frase }}"],
    ["1 Coríntios 13", "{{ referencia }}"],
    ["Espaço Villa Toscana", "{{ local }}"],
    ["Rua X, 123", "{{ endereco }}"],
    ["São Paulo · SP", "{{ cidade }}"],
  ]),
  estiloGlobal: ESTILO_GLOBAL,
  Logica,
  padroes: { ...padroesDo(PADROES), frase: FRASE, referencia: "1 Coríntios 13" },
  exemplo: { local: "Espaço Villa Toscana", endereco: "Rua X, 123", cidade: "São Paulo · SP" },
};

export default definicao;
