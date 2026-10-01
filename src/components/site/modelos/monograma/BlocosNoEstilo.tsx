"use client";

// Os blocos que funcionam hoje e o desenho não tem (hospedagem, álbum dos
// convidados, mural de recados e texto livre) no estilo do Monograma. A
// base visual do T04 é a do T03 (mesma paleta, mesmos cartões), então são
// os mesmos dos Cartões: a montagem do meio (cartoes/secoes/Montagem.tsx)
// já os desenha. Reexportados aqui para quem procura pelo modelo.

export {
  Album,
  Hospedagem,
  Mural,
  TextoLivre,
  temHospedagem,
  temTextoLivre,
} from "@/components/site/modelos/cartoes/BlocosNoEstilo";
