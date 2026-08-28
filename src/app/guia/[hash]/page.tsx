import { createClient } from "@supabase/supabase-js";
import { ASSUNTO_ROTULO } from "@/lib/inspiracoes-shared";
import { MinusCircle } from "@/components/portal/icones";

export const dynamic = "force-dynamic";

type GuiaPublico = {
  guia_nome: string;
  sensacao: string | null;
  fornecedor: string;
  evento_data: string;
  aprovado_em: string | null;
  secoes: string[];
  /** a regra de execução — fora do sistema de seções (126) */
  restricoes: string | null;
  cores: { nome: string; papel: string; hex: string; nota: string | null; foto_path: string | null }[] | null;
  flores: { nome: string; epoca: string | null; nota: string | null; foto_path: string | null }[] | null;
  vetadas: { nome: string; motivo: string }[] | null;
  materiais: { nome: string; nota: string | null; foto_path: string | null }[] | null;
  trajes: { papel: string; hex: string | null; descricao: string | null }[] | null;
  papelaria: {
    fontes: string | null;
    nome_casal: string | null;
    data: string | null;
    local: string | null;
    nota: string | null;
  } | null;
  referencias: { assunto: string; agradou: string | null; autor: string | null; foto_path: string }[] | null;
};

/**
 * O guia como o FORNECEDOR vê: sem login, pelo hash.
 *
 * Três guardas, todas no banco (a RPC devolve null se qualquer uma
 * falhar): o hash existe, o guia está aprovado, e só as seções da fatia
 * daquele fornecedor. O motivo de veto que chega aqui é o
 * motivo_fornecedor — o interno não é lido pela função.
 */
export default async function GuiaPublicoPage({
  params,
}: {
  params: { hash: string };
}) {
  const anon = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  );

  const { data } = await anon.rpc("guia_publico", { p_hash: params.hash });
  const guia = data as GuiaPublico | null;

  if (!guia) {
    return (
      <main className="guia-raiz" style={{ padding: 40, maxWidth: 520, margin: "0 auto" }}>
        <div className="guia-veto">
          <p style={{ margin: 0, fontSize: 14, color: "#463E36" }}>
            Este link não está disponível. Pode ter sido substituído, ou o guia
            ainda não foi aprovado pelo casal — peça um novo a quem enviou.
          </p>
        </div>
      </main>
    );
  }

  // As fotos vivem em bucket privado. Assinamos aqui, no servidor, e SÓ
  // os caminhos que a RPC já autorizou a devolver para este hash.
  const paths = [
    ...(guia.cores ?? []).map((c) => c.foto_path),
    ...(guia.flores ?? []).map((f) => f.foto_path),
    ...(guia.materiais ?? []).map((m) => m.foto_path),
    ...(guia.referencias ?? []).map((r) => r.foto_path),
  ].filter((p): p is string => Boolean(p));

  const urls = new Map<string, string>();
  if (paths.length > 0 && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const servico = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { persistSession: false } }
    );
    const { data: assinadas } = await servico.storage
      .from("inspiracoes")
      .createSignedUrls([...new Set(paths)], 60 * 60);
    for (const a of assinadas ?? []) {
      if (a.path && a.signedUrl) urls.set(a.path, a.signedUrl);
    }
  }

  return (
    <main
      className="guia-raiz"
      style={{ maxWidth: 860, margin: "0 auto", padding: "28px 20px 60px" }}
    >
      <div className="guia-status" style={{ background: "#F5F7F0", borderColor: "#DDE3D2" }}>
        <span
          aria-hidden
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: "#7C8C6A",
            flexShrink: 0,
            marginTop: 6,
          }}
        />
        <div>
          <p className="guia-status-titulo">Guia aprovado pelo casal</p>
          <p className="guia-status-texto">
            Preparado para {guia.fornecedor}. É a versão mais recente — se algo
            mudar, este mesmo link acompanha.
          </p>
        </div>
      </div>

      <header className="guia-abertura">
        <span className="guia-rotulo">Guia de estilo</span>
        <h1 className="guia-h1">{guia.guia_nome}</h1>
        {guia.sensacao && <p className="guia-abertura-texto">{guia.sensacao}</p>}
      </header>

      {/* Antes das seções de propósito: é o limite de execução, e vem
          com qualquer fatia — inclusive para quem só recebeu as cores. */}
      {guia.restricoes && (
        <div className="guia-restricoes">
          <span className="guia-rotulo-ouro">O que não pode mudar</span>
          <p>{guia.restricoes}</p>
        </div>
      )}

      {guia.cores && guia.cores.length > 0 && (
        <section className="guia-secao">
          <div className="guia-secao-topo">
            <h2 className="guia-h2">As cores</h2>
          </div>
          <div className="guia-faixas">
            {guia.cores.map((c, i) => (
              <div
                key={`${c.hex}-${i}`}
                className="guia-faixa"
                style={
                  {
                    background: c.hex,
                    "--faixa-flex": [1.5, 1.15, 1, 0.85, 0.7][i] ?? 0.7,
                    "--faixa-altura": `${[190, 164, 142, 124, 110][i] ?? 110}px`,
                    "--faixa-largura": ["46%", "34%", "30%", "26%", "24%"][i] ?? "24%",
                  } as React.CSSProperties
                }
              >
                {urls.get(c.foto_path ?? "") ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={urls.get(c.foto_path ?? "")}
                    alt=""
                    style={{
                      position: "absolute",
                      inset: 0,
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      mixBlendMode: "multiply",
                    }}
                  />
                ) : (
                  <>
                    <span
                      aria-hidden
                      style={{
                        position: "absolute",
                        inset: 0,
                        background:
                          "repeating-linear-gradient(122deg,rgba(255,255,255,.16) 0 9px,rgba(0,0,0,.05) 9px 18px)",
                      }}
                    />
                    <span className="guia-faixa-legenda">
                      foto — {c.nome.toLowerCase()}
                    </span>
                  </>
                )}
                <span className="guia-faixa-anel" aria-hidden />
              </div>
            ))}
          </div>
          <div className="guia-cores-legenda">
            {guia.cores.map((c, i) => (
              <div key={`t-${c.hex}-${i}`}>
                <p className="guia-cor-nome">{c.nome}</p>
                <p className="guia-cor-meta">
                  <span className="guia-rotulo">{c.papel}</span>
                  <span className="guia-hex">{c.hex}</span>
                </p>
                {c.nota && <p className="guia-nota">{c.nota}</p>}
              </div>
            ))}
          </div>
        </section>
      )}

      {guia.flores && guia.flores.length > 0 && (
        <section className="guia-secao">
          <div className="guia-secao-topo">
            <h2 className="guia-h2">As flores</h2>
          </div>
          <div className="guia-grade-flores">
            {guia.flores.map((f, i) => (
              <div key={`${f.nome}-${i}`} className="guia-cartao-flor">
                <FotoPublica url={urls.get(f.foto_path ?? "") ?? null} alt={f.nome} />
                <span className="guia-cartao-flor-texto">
                  <span className="guia-flor-nome">{f.nome}</span>
                  {f.epoca && <span className="guia-legenda">{f.epoca}</span>}
                  {f.nota && <span className="guia-nota">{f.nota}</span>}
                </span>
              </div>
            ))}
          </div>

          {guia.vetadas && guia.vetadas.length > 0 && (
            <div className="guia-veto">
              <span className="guia-veto-topo">
                <MinusCircle size={16} strokeWidth={1.4} />
                <span className="guia-rotulo">Não usar</span>
              </span>
              <div className="guia-grade-veto">
                {guia.vetadas.map((v, i) => (
                  <div key={`${v.nome}-${i}`} className="guia-veto-item">
                    <span className="guia-veto-foto" aria-hidden />
                    <span>
                      <span className="guia-veto-nome">{v.nome}</span>
                      <span className="guia-veto-motivo">{v.motivo}</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {guia.materiais && guia.materiais.length > 0 && (
        <section className="guia-secao">
          <div className="guia-secao-topo">
            <h2 className="guia-h2">Materiais e texturas</h2>
          </div>
          <div className="guia-grade-materiais">
            {guia.materiais.map((m, i) => (
              <div key={`${m.nome}-${i}`} className="guia-cartao-material">
                <FotoPublica url={urls.get(m.foto_path ?? "") ?? null} alt={m.nome} />
                <span className="guia-cartao-material-texto">
                  <span className="guia-material-nome">{m.nome}</span>
                  {m.nota && <span className="guia-nota">{m.nota}</span>}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {guia.trajes && guia.trajes.length > 0 && (
        <section className="guia-secao">
          <div className="guia-secao-topo">
            <h2 className="guia-h2">Trajes</h2>
          </div>
          <div className="guia-grade-trajes">
            {guia.trajes.map((t) => (
              <div key={t.papel} className="guia-cartao-traje">
                <span
                  className="guia-traje-amostra"
                  style={{ background: t.hex ?? "#E9DFCD" }}
                  aria-hidden
                />
                <span>
                  <span className="guia-traje-titulo">
                    {t.papel === "madrinhas" ? "Madrinhas" : "Padrinhos"}
                  </span>
                  {t.descricao && <span className="guia-nota">{t.descricao}</span>}
                  {t.hex && <span className="guia-hex">{t.hex}</span>}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {guia.papelaria && guia.papelaria.nome_casal && (
        <section className="guia-secao">
          <div className="guia-secao-topo">
            <h2 className="guia-h2">Papelaria</h2>
          </div>
          <div className="guia-papelaria">
            <span className="guia-fio" aria-hidden>
              <span className="guia-fio-brilho" />
            </span>
            <div>
              <p className="guia-papelaria-nome">{guia.papelaria.nome_casal}</p>
              {(guia.papelaria.data || guia.papelaria.local) && (
                <p className="guia-papelaria-meta">
                  {[guia.papelaria.data, guia.papelaria.local]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              )}
            </div>
            <div className="guia-papelaria-direita">
              {guia.papelaria.fontes && (
                <span className="guia-rotulo">{guia.papelaria.fontes}</span>
              )}
              {guia.papelaria.nota && (
                <span className="guia-nota">{guia.papelaria.nota}</span>
              )}
            </div>
          </div>
        </section>
      )}

      {guia.referencias && guia.referencias.length > 0 && (
        <section className="guia-secao">
          <div className="guia-secao-topo">
            <h2 className="guia-h2">Referências</h2>
          </div>
          <div className="guia-referencias">
            {guia.referencias.map((r, i) => (
              <div key={`${r.foto_path}-${i}`} className="guia-referencia">
                <FotoPublica
                  url={urls.get(r.foto_path) ?? null}
                  alt={r.agradou ?? r.assunto}
                  altura="100%"
                />
                <div className="guia-referencia-texto">
                  <span className="guia-rotulo">
                    {ASSUNTO_ROTULO[r.assunto] ?? r.assunto}
                  </span>
                  {r.agradou && (
                    <>
                      <span className="guia-rotulo-ouro">O que agradou</span>
                      <p className="guia-agradou">{r.agradou}</p>
                    </>
                  )}
                  {r.autor && <span className="guia-legenda">{r.autor}</span>}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}

function FotoPublica({
  url,
  alt,
  altura = 150,
}: {
  url: string | null;
  alt: string;
  altura?: number | string;
}) {
  const h = typeof altura === "number" ? `${altura}px` : altura;
  if (!url) {
    return (
      <div
        style={{
          height: h,
          minHeight: 120,
          background:
            "repeating-linear-gradient(122deg,#EDE6DA 0 10px,#F5F0E7 10px 20px)",
        }}
      />
    );
  }
  // eslint-disable-next-line @next/next/no-img-element
  return (
    <img
      src={url}
      alt={alt}
      style={{ width: "100%", height: h, objectFit: "cover", display: "block" }}
    />
  );
}
