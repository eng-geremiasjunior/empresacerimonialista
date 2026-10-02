// O Convite 09 (Tradicional de luxo) para o motor: a marcação literal do
// desenho com os textos fixos da cena do local trocados por campos da noiva,
// aqui em dois blocos, cerimônia e recepção. Pais, frase e referência já eram
// props do desenho. Os pais do desenho são de um casal de mentira: saem dos
// padrões e ficam só no exemplo (sem preencher, o convite dela sai sem eles).

import { TEMPLATE } from "./template";
import Logica from "./logica";
import { ESTILO_GLOBAL, PADROES } from "./dados";
import { padroesDo, trocar, type DefinicaoDoConvite } from "../../motor/modelo";

const { pais1, pais2, ...PADROES_SEM_PAIS } = PADROES;

/** O texto de mentira do desenho: só no exemplo. */
const EXEMPLO = {
  local: "Igreja Nossa Senhora do Brasil",
  endereco: "Praça Nossa Senhora do Brasil, 1 · São Paulo",
  localRecepcao: "Palácio Tangará",
  enderecoRecepcao: "Rua Deputado Laércio Corte, 1501 · São Paulo",
  pais1: pais1.padrao,
  pais2: pais2.padrao,
};

const definicao: DefinicaoDoConvite = {
  marcacao: trocar(TEMPLATE, [
    [EXEMPLO.local, "{{ local }}"],
    [EXEMPLO.endereco, "{{ endereco }}"],
    [EXEMPLO.localRecepcao, "{{ localRecepcao }}"],
    [EXEMPLO.enderecoRecepcao, "{{ enderecoRecepcao }}"],
    // o rótulo só aparece com o bloco preenchido: sem recepção, nada de
    // "Recepção a seguir" solto na cena
    [">Cerimônia</div>", ">{{ rotuloCerimonia }}</div>"],
    [">Recepção a seguir</div>", ">{{ rotuloRecepcao }}</div>"],
  ]),
  estiloGlobal: ESTILO_GLOBAL,
  Logica,
  padroes: padroesDo(PADROES_SEM_PAIS),
  exemplo: EXEMPLO,
  derivar: (p) => ({
    rotuloCerimonia: p.local || p.endereco ? "Cerimônia" : "",
    rotuloRecepcao: p.localRecepcao || p.enderecoRecepcao ? "Recepção a seguir" : "",
  }),
};

export default definicao;
