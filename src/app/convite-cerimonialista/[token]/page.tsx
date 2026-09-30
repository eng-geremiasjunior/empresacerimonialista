import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { BotaoPedir, GuardarConvite } from "./AceitarConvite";

// O convite que a família manda para a cerimonialista (188). Público: o
// link é a credencial (como a proposta). Mostra só a festa, a data, a
// cidade e o primeiro nome de quem convida — nada de contato.
//
// Três portas: com sessão de cerimonialista, pedir para organizar (a
// família confirma no portal); sem sessão, entrar ou criar a conta (o
// convite fica guardado e a agenda devolve ela para cá); com sessão de
// portal, o middleware já mandou para o portal. Fora do estado "aberto"
// o banco devolve só o estado: o link usado ou cancelado não mostra mais
// o evento.
export const dynamic = "force-dynamic";
export const metadata = { title: "Convite — eorganizei", robots: { index: false, follow: false } };

type Convite = {
  estado: "aberto" | "pedido" | "aceito" | "cancelado" | "expirado";
  tipo?: string | null;
  festa?: string | null;
  data?: string | null;
  cidade?: string | null;
  quem?: string | null;
};

function dataLonga(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const [a, m, d] = iso.split("-").map(Number);
  return new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(Date.UTC(a, m - 1, d))
  );
}

function qualFesta(c: Convite): string {
  const festa = c.festa?.trim();
  if (c.tipo === "debutante") return festa ? `os 15 anos de ${festa}` : "uns 15 anos";
  if (c.tipo === "casamento") return festa ? `o casamento de ${festa}` : "um casamento";
  return festa || "uma festa";
}

function Moldura({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#faf7f2] px-4 py-10 text-[#2f3437]">
      <div className="flex w-full max-w-md flex-col gap-6">
        <p className="text-lg font-semibold tracking-tight">
          <span className="text-[#6E3F5F]">e</span>organizei
        </p>
        <div className="flex flex-col gap-5 rounded-2xl border border-[#e6e0d4] bg-white p-6">{children}</div>
      </div>
    </main>
  );
}

export default async function ConvitePage({ params }: { params: { token: string } }) {
  const token = params.token;
  const supabase = createClient();
  const valido = /^[0-9a-f]{64}$/.test(token);
  const { data } = valido
    ? await supabase.rpc("convite_cerimonialista_publico", { p_token: token })
    : { data: null };
  const convite = (data ?? null) as Convite | null;

  if (!convite) {
    return (
      <Moldura>
        <p className="text-xl">Este convite não existe.</p>
        <p className="text-sm text-[#5c6164]">Confira o link que a família mandou.</p>
      </Moldura>
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const quem = convite.quem || "A família";
  const onde = [dataLonga(convite.data), convite.cidade].filter(Boolean).join(" · ");

  if (convite.estado !== "aberto") {
    const frase = {
      pedido: ["Este convite espera a resposta da família.", "Assim que ela confirmar, o evento entra na agenda de quem pediu."],
      aceito: ["Este convite já foi usado.", "O evento já está na agenda da cerimonialista."],
      cancelado: ["Este convite não vale mais.", "Peça um link novo à família."],
      expirado: ["Este convite venceu.", "Peça um link novo à família."],
    }[convite.estado];
    return (
      <Moldura>
        <p className="text-xl">{frase[0]}</p>
        <p className="text-sm text-[#5c6164]">{frase[1]}</p>
        {user && (
          <Link href="/eventos" className="text-sm text-[#6E3F5F] underline underline-offset-4">
            Abrir a minha agenda
          </Link>
        )}
      </Moldura>
    );
  }

  return (
    <Moldura>
      <div className="flex flex-col gap-2">
        <p className="text-xs uppercase tracking-[0.2em] text-[#8a8378]">Convite</p>
        <h1 className="text-2xl leading-snug" style={{ textWrap: "balance" }}>
          {quem} quer que você organize {qualFesta(convite)}.
        </h1>
        {onde && <p className="text-[15px] text-[#5c6164]">{onde}</p>}
      </div>

      <p className="text-sm leading-relaxed text-[#5c6164]">
        Quando {quem === "A família" ? "a família" : quem} confirmar o seu pedido, o evento entra na sua agenda com o
        que já foi feito, e a família continua acompanhando pelo portal.
      </p>

      {user ? (
        <div className="flex flex-col gap-3">
          <BotaoPedir token={token} quem={quem === "A família" ? "a família" : quem} />
          <p className="text-xs text-[#8a8378]">Você está como {user.email}.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <GuardarConvite token={token} />
          <Link
            href="/criar-conta"
            className="flex h-12 items-center justify-center rounded-lg bg-[#2b2521] px-4 text-[15px] font-medium text-white hover:bg-black"
          >
            Criar a minha conta
          </Link>
          <Link
            href={`/login?next=${encodeURIComponent(`/convite-cerimonialista/${token}`)}`}
            className="flex h-12 items-center justify-center rounded-lg border border-[#e6e0d4] px-4 text-[15px] text-[#2f3437] hover:border-[#2f3437]"
          >
            Já tenho conta: entrar
          </Link>
        </div>
      )}
    </Moldura>
  );
}
