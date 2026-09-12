// A camada de escaneio que faltava na página de vendas.
//
// O DEFEITO, medido em 11/09/2026: 22.532px no celular — 31 telas de
// rolagem, 17 mil caracteres, sete capítulos de prosa corrida. Para
// entender O QUE o produto é, a cerimonialista tinha de LER. Quem vem de
// anúncio não lê: passa o dedo.
//
// Doze blocos, uma ideia cada, uma linha cada. O objetivo não é explicar
// nenhum recurso — é dar o TAMANHO do produto em trinta segundos, sem
// ler. Quem quiser profundidade tem os capítulos logo abaixo, e eles
// continuam lá inteiros.
//
// Por que doze e não seis: seis pareceria um app de tarefas. O argumento
// aqui é justamente a extensão — do briefing ao dia da festa.

import {
  CalendarClock,
  CircleDollarSign,
  ClipboardList,
  Clock,
  FileSignature,
  Heart,
  LayoutGrid,
  Link2,
  ListChecks,
  MessageSquareText,
  Play,
  Users,
} from "lucide-react";

const TITULO = "var(--font-title, Inter, sans-serif)";

const RECURSOS = [
  {
    icone: MessageSquareText,
    titulo: "Briefing que vira evento",
    linha: "Cole a conversa da cliente e os campos nascem preenchidos.",
  },
  {
    icone: CalendarClock,
    titulo: "Planejamento com prazos",
    linha: "As decisões do evento em fila, cada uma com a sua data.",
  },
  {
    icone: ListChecks,
    titulo: "Tarefas que nascem sozinhas",
    linha: "Decidiu o buffet? As tarefas do buffet aparecem prontas.",
  },
  {
    icone: FileSignature,
    titulo: "Fornecedores e contratos",
    linha: "Quem faz o quê, por quanto, com o contrato anexado.",
  },
  {
    icone: ClipboardList,
    titulo: "Orçamento por link",
    linha: "A proposta vira uma página que a cliente abre e aceita.",
  },
  {
    icone: Clock,
    titulo: "Roteiro do dia",
    linha: "Hora a hora, com o responsável de cada etapa.",
  },
  {
    icone: Link2,
    titulo: "Link do fornecedor",
    linha: "Ele abre e vê só a parte dele, sem login e sem app.",
  },
  {
    icone: Play,
    titulo: "Modo evento",
    linha: "No dia, a tela mostra o que está acontecendo agora.",
  },
  {
    icone: CircleDollarSign,
    titulo: "Financeiro do evento",
    linha: "O que entrou, o que falta pagar e quanto sobrou para você.",
  },
  {
    icone: Heart,
    titulo: "Portal da cliente",
    // NADA de "noiva" aqui. Escrevi "a noiva acompanha o próprio
    // casamento" e isso estreita para um dos nove tipos de evento —
    // justamente o erro que o dono cortou na foto do herói. Quem abre o
    // portal é A CLIENTE, e o que ela acompanha é O EVENTO dela.
    linha: "A cliente acompanha o próprio evento, com a sua marca.",
  },
  {
    icone: Users,
    titulo: "Convidados e RSVP",
    linha: "A lista confirma sozinha, sem planilha de ida e volta.",
  },
  {
    icone: LayoutGrid,
    titulo: "Croqui de mesas",
    linha: "Arraste os convidados e o salão se monta na tela.",
  },
];

export function Grade() {
  return (
    <section
      id="recursos"
      style={{
        // marfim contra a névoa do herói: a troca de tom é o que diz
        // "começou outra seção" sem precisar de título anunciando isso
        background: "#FAF8F5",
        borderTop: "1px solid #E6E0D8",
        borderBottom: "1px solid #E6E0D8",
        padding: "clamp(44px,5.5vw,68px) clamp(20px,4vw,28px)",
        scrollMarginTop: "68px",
      }}
    >
      <div style={{ maxWidth: "1080px", margin: "0 auto" }}>
        <h2
          style={{
            margin: "0 0 6px",
            fontFamily: TITULO,
            fontWeight: "700",
            fontSize: "clamp(23px,3.2vw,32px)",
            lineHeight: "1.15",
            letterSpacing: "-0.03em",
            textWrap: "balance",
          }}
        >
          Tudo o que acontece num evento, num lugar só.
        </h2>
        <p
          style={{
            margin: "0 0 clamp(26px,3vw,36px)",
            maxWidth: "56ch",
            fontSize: "clamp(15px,1.7vw,17px)",
            lineHeight: "1.55",
            color: "#928A81",
          }}
        >
          Do primeiro “oi” da cliente até a desmontagem do salão.
        </p>

        <ul
          data-grade-recursos="1"
          style={{
            listStyle: "none",
            margin: "0",
            padding: "0",
            display: "grid",
            gridTemplateColumns: "repeat(3, minmax(0,1fr))",
            gap: "clamp(18px,2.4vw,30px) clamp(20px,2.6vw,34px)",
          }}
        >
          {RECURSOS.map(({ icone: Icone, titulo, linha }) => (
            <li key={titulo} style={{ display: "flex", gap: "12px" }}>
              <span
                aria-hidden
                style={{
                  flex: "none",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "34px",
                  height: "34px",
                  borderRadius: "9px",
                  background: "#F3EBF0",
                  color: "#6E3F5F",
                }}
              >
                <Icone size={17} strokeWidth={1.75} />
              </span>
              <div style={{ minWidth: "0" }}>
                <h3
                  style={{
                    margin: "5px 0 3px",
                    fontFamily: TITULO,
                    fontWeight: "600",
                    fontSize: "15.5px",
                    letterSpacing: "-0.015em",
                    color: "#221E1B",
                  }}
                >
                  {titulo}
                </h3>
                <p
                  style={{
                    margin: "0",
                    fontSize: "14px",
                    lineHeight: "1.5",
                    color: "#6B6259",
                    textWrap: "pretty",
                  }}
                >
                  {linha}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
