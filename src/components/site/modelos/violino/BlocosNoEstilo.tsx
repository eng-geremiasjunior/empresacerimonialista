"use client";

// Os blocos que funcionam hoje e o desenho do T06 não tem — hospedagem,
// álbum dos convidados, música, mural de recados e texto livre. O T06 é o
// T05 na pele (mesma paleta, mesmo cartão de papel com as molduras de
// ouro, mesmos rótulos em francês), então os blocos são os do França,
// vestidos pelo franca.css que o ModeloViolino já carrega dentro do
// .sm-franca. Um arquivo só de passagem: se o violino um dia ganhar um
// desenho próprio para algum deles, ele entra aqui sem mexer no T05.

export {
  Album,
  Hospedagem,
  Mural,
  Musica,
  temHospedagem,
  temTextoLivre,
  TextoLivre,
} from "../franca/BlocosNoEstilo";
