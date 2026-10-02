// A marcação do Convite 09, copiada LITERAL de design_handoff_convites/Convite 09.dc.html
// (entre </helmet> e o <script>) por ferramentas/convites/extrair.mjs. Não editar à mão
// além das trocas declaradas em modelo.ts.

export const TEMPLATE = String.raw`<div data-root="" style="position:relative;height:100svh;overflow:hidden;background:#0d0c0b;color:#26221d;font-family:{{ t.textFont }};font-size:{{ t.textSize }};font-weight:{{ t.textWeight }};cursor:pointer;user-select:none;-webkit-user-select:none;">

  <section data-scene="0" data-screen-label="01 Caixa" style="position:absolute;inset:0;z-index:0;background:radial-gradient(ellipse at 50% 45%,#2a2622,#0d0c0b 70%);color:#efe6d4;text-align:center;">
    <div data-o="" style="position:absolute;left:0;right:0;top:max(7svh,30px);font-size:11px;font-weight:500;letter-spacing:.38em;text-transform:uppercase;color:#cdb283;">Você recebeu um convite</div>
    <div data-base="" style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;pointer-events:none;">
      <div style="position:relative;height:min(54svh,100vw);aspect-ratio:3/4;">
        <div style="position:absolute;inset:-10px;background:linear-gradient(160deg,#1b1917,#0a0908);box-shadow:0 40px 80px -20px rgba(0,0,0,.9), inset 0 0 0 1px rgba(205,178,131,.25);"></div>
        <div style="position:absolute;inset:-4px;background:linear-gradient(180deg,#e6dcc6,#cfc2a6);"></div>
      </div>
    </div>
    <div data-o="" style="position:absolute;left:0;right:0;bottom:max(7svh,30px);display:flex;flex-direction:column;align-items:center;gap:10px;">
      <span style="font-family:{{ t.headFont }};font-style:italic;font-size:clamp(18px,2.2vw,22px);">Toque para desfazer o laço</span>
      <span style="width:1px;height:22px;background:#cdb283;"></span>
    </div>
  </section>

  <section data-scene="1" data-screen-label="02 Convite" data-card="" style="position:absolute;inset:0;z-index:3;visibility:hidden;background-color:#f8f4ea;">
    <div style="position:absolute;inset:14px;border:1px solid #b8975a;pointer-events:none;"></div>
    <div style="position:absolute;inset:19px;border:1px solid rgba(184,151,90,.45);pointer-events:none;"></div>
    <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:min(20px,2.4svh);padding:min(64px,8svh) clamp(34px,9vw,56px) max(92px,12svh);box-sizing:border-box;text-align:center;">
      <div data-foil="" style="font-family:{{ t.headFont }};font-size:clamp(30px,8vw,40px);line-height:1;background:linear-gradient(110deg,#8e6d38 0%,#b8975a 30%,#f0dfb0 48%,#b8975a 62%,#8e6d38 100%);background-size:260% 100%;-webkit-background-clip:text;background-clip:text;color:transparent;">{{ i1 }}<span style="font-size:.6em;padding:0 .12em;">&amp;</span>{{ i2 }}</div>
      <div data-in="" style="display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:18px;width:100%;max-width:360px;font-size:11px;font-weight:500;letter-spacing:.16em;line-height:1.8;text-transform:uppercase;color:#4a4238;">
        <span style="text-wrap:balance;">{{ pais1 }}</span>
        <span style="text-wrap:balance;">{{ pais2 }}</span>
      </div>
      <div data-in="" style="max-width:300px;font-family:{{ t.headFont }};font-style:italic;font-size:clamp(17px,4.4vw,19px);line-height:1.55;color:#4a4238;text-wrap:balance;">têm a honra de convidar para a cerimônia religiosa do casamento de seus filhos</div>
      <div data-in="" style="display:flex;flex-direction:column;align-items:center;gap:4px;">
        <sc-if value="{{ modeNames }}" hint-placeholder-val="{{ true }}">
          <h1 style="margin:0;display:flex;flex-direction:column;align-items:center;font-weight:{{ t.nameWeight }};font-family:{{ t.nameFont }};font-style:{{ t.nameStyle }};text-transform:{{ t.nameTT }};letter-spacing:{{ t.nameLS }};font-size:{{ t.nameSize }};line-height:{{ t.nameLH }};">
            <span>{{ n1 }}</span>
            <span style="font-family:{{ t.headFont }};font-style:italic;font-weight:400;text-transform:none;letter-spacing:0;font-size:.4em;line-height:1.5;color:#9a7a42;">&amp;</span>
            <span>{{ n2 }}</span>
          </h1>
        </sc-if>
        <sc-if value="{{ modeInitials }}" hint-placeholder-val="{{ false }}">
          <div style="display:flex;align-items:center;gap:.22em;font-family:{{ t.nameFont }};font-weight:{{ t.nameWeight }};font-style:{{ t.nameStyle }};font-size:{{ t.initSize }};line-height:1;"><span>{{ i1 }}</span><span style="width:1px;height:.7em;background:#b8975a;"></span><span>{{ i2 }}</span></div>
        </sc-if>
        <sc-if value="{{ modeBoth }}" hint-placeholder-val="{{ false }}">
          <div style="display:flex;align-items:center;gap:.22em;font-family:{{ t.nameFont }};font-weight:{{ t.nameWeight }};font-style:{{ t.nameStyle }};font-size:{{ t.initSizeSm }};line-height:1;"><span>{{ i1 }}</span><span style="width:1px;height:.7em;background:#b8975a;"></span><span>{{ i2 }}</span></div>
          <div style="font-family:{{ t.nameFont }};font-weight:{{ t.nameWeight }};font-style:{{ t.nameStyle }};text-transform:{{ t.nameTT }};letter-spacing:{{ t.nameLS }};font-size:{{ t.nameSizeSm }};line-height:{{ t.nameLH }};">{{ n1 }} &amp; {{ n2 }}</div>
        </sc-if>
      </div>
    </div>
  </section>

  <section data-scene="2" data-screen-label="03 Versículo" data-card="" style="position:absolute;inset:0;z-index:1;visibility:hidden;background-color:#f4efe3;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:28px;padding:72px clamp(36px,10vw,64px) max(92px,12svh);box-sizing:border-box;text-align:center;">
    <div style="position:absolute;inset:14px;border:1px solid #b8975a;pointer-events:none;"></div>
    <div style="position:absolute;inset:19px;border:1px solid rgba(184,151,90,.45);pointer-events:none;"></div>
    <svg viewBox="0 0 160 12" style="width:min(130px,34vw);height:auto;overflow:visible;">
      <path data-draw="" pathLength="1" d="M0 6 L66 6" style="fill:none;stroke:#b8975a;stroke-width:1;stroke-dasharray:1;stroke-dashoffset:1;"></path>
      <path data-draw="" pathLength="1" d="M160 6 L94 6" style="fill:none;stroke:#b8975a;stroke-width:1;stroke-dasharray:1;stroke-dashoffset:1;"></path>
      <path data-in="" d="M80 0 L86 6 L80 12 L74 6 Z" style="fill:#b8975a;"></path>
    </svg>
    <p style="margin:0;max-width:400px;display:flex;flex-wrap:wrap;justify-content:center;gap:.08em .3em;font-family:{{ t.headFont }};font-style:italic;font-weight:{{ t.headWeight }};font-size:clamp(24px,6.2vw,32px);line-height:1.4;">
      <sc-for list="{{ words }}" as="w" hint-placeholder-count="16">
        <span data-w="" style="display:inline-block;">{{ w }}</span>
      </sc-for>
    </p>
    <div data-in="" style="font-size:11px;font-weight:500;letter-spacing:.34em;text-transform:uppercase;color:#9a7a42;">{{ ref }}</div>
  </section>

  <section data-scene="3" data-screen-label="04 Foto" data-card="" style="position:absolute;inset:0;z-index:1;visibility:hidden;background-color:#f8f4ea;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:min(26px,3svh);padding:64px 28px max(92px,12svh);box-sizing:border-box;text-align:center;">
    <div style="position:absolute;inset:14px;border:1px solid #b8975a;pointer-events:none;"></div>
    <div style="position:absolute;inset:19px;border:1px solid rgba(184,151,90,.45);pointer-events:none;"></div>
    <div data-mat="" style="position:relative;height:min(52svh,96vw);aspect-ratio:4/5;padding:min(22px,5vw);box-sizing:border-box;background:#fdfbf6;box-shadow:0 22px 44px -26px rgba(38,34,29,.55), 0 0 0 1px rgba(184,151,90,.35);">
      <div style="position:relative;width:100%;height:100%;overflow:hidden;box-shadow:0 0 0 1px #b8975a, 0 0 0 4px #fdfbf6, 0 0 0 5px rgba(184,151,90,.5);">
        <div data-pz="" style="position:absolute;inset:0;">
          <image-slot id="c09-foto" shape="rect" placeholder="Foto do casal" style="width:100%;height:100%;"></image-slot>
        </div>
      </div>
    </div>
    <div data-in="" style="font-family:{{ t.headFont }};font-style:italic;font-size:clamp(19px,5vw,22px);color:#4a4238;">Para todos os dias da nossa vida.</div>
  </section>

  <section data-scene="4" data-screen-label="05 Data" data-card="" style="position:absolute;inset:0;z-index:1;visibility:hidden;background-color:#f4efe3;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:min(22px,2.6svh);padding:72px clamp(36px,10vw,64px) max(92px,12svh);box-sizing:border-box;text-align:center;">
    <div style="position:absolute;inset:14px;border:1px solid #b8975a;pointer-events:none;"></div>
    <div style="position:absolute;inset:19px;border:1px solid rgba(184,151,90,.45);pointer-events:none;"></div>
    <div data-in="" style="font-size:11px;font-weight:500;letter-spacing:.36em;text-transform:uppercase;color:#9a7a42;">A cerimônia será realizada</div>
    <div data-in="" style="max-width:340px;font-family:{{ t.headFont }};font-weight:{{ t.headWeight }};font-style:italic;font-size:clamp(24px,6.4vw,32px);line-height:1.4;text-wrap:balance;">{{ dt.words }}</div>
    <svg viewBox="0 0 160 12" style="width:min(130px,34vw);height:auto;overflow:visible;">
      <path data-draw="" pathLength="1" d="M0 6 L66 6" style="fill:none;stroke:#b8975a;stroke-width:1;stroke-dasharray:1;stroke-dashoffset:1;"></path>
      <path data-draw="" pathLength="1" d="M160 6 L94 6" style="fill:none;stroke:#b8975a;stroke-width:1;stroke-dasharray:1;stroke-dashoffset:1;"></path>
      <path data-in="" d="M80 0 L86 6 L80 12 L74 6 Z" style="fill:#b8975a;"></path>
    </svg>
    <div data-foil="" style="font-family:{{ t.headFont }};font-size:clamp(20px,5.4vw,26px);letter-spacing:.2em;background:linear-gradient(110deg,#8e6d38 0%,#b8975a 30%,#f0dfb0 48%,#b8975a 62%,#8e6d38 100%);background-size:260% 100%;-webkit-background-clip:text;background-clip:text;color:transparent;">{{ dt.short }}</div>
  </section>

  <section data-scene="5" data-screen-label="06 Local" data-card="" style="position:absolute;inset:0;z-index:1;visibility:hidden;background-color:#f8f4ea;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:min(26px,3svh);padding:72px clamp(34px,9vw,56px) max(92px,12svh);box-sizing:border-box;text-align:center;">
    <div style="position:absolute;inset:14px;border:1px solid #b8975a;pointer-events:none;"></div>
    <div style="position:absolute;inset:19px;border:1px solid rgba(184,151,90,.45);pointer-events:none;"></div>
    <div data-in="" style="display:flex;flex-direction:column;align-items:center;gap:10px;">
      <div style="font-size:11px;font-weight:500;letter-spacing:.36em;text-transform:uppercase;color:#9a7a42;">Cerimônia</div>
      <div style="font-family:{{ t.headFont }};font-weight:{{ t.headWeight }};font-style:{{ t.headStyle }};text-transform:{{ t.headTT }};letter-spacing:{{ t.headLSsoft }};font-size:{{ t.headSize }};line-height:1.15;text-wrap:balance;">Igreja Nossa Senhora do Brasil</div>
      <div style="color:#4a4238;line-height:1.6;">Praça Nossa Senhora do Brasil, 1 · São Paulo</div>
    </div>
    <svg viewBox="0 0 12 12" style="width:10px;height:10px;"><path data-in="" d="M6 0 L12 6 L6 12 L0 6 Z" style="fill:#b8975a;"></path></svg>
    <div data-in="" style="display:flex;flex-direction:column;align-items:center;gap:10px;">
      <div style="font-size:11px;font-weight:500;letter-spacing:.36em;text-transform:uppercase;color:#9a7a42;">Recepção a seguir</div>
      <div style="font-family:{{ t.headFont }};font-weight:{{ t.headWeight }};font-style:{{ t.headStyle }};text-transform:{{ t.headTT }};letter-spacing:{{ t.headLSsoft }};font-size:{{ t.headSize }};line-height:1.15;text-wrap:balance;">Palácio Tangará</div>
      <div style="color:#4a4238;line-height:1.6;">Rua Deputado Laércio Corte, 1501 · São Paulo</div>
    </div>
  </section>

  <section data-scene="6" data-screen-label="07 Final" style="position:absolute;inset:0;z-index:1;visibility:hidden;background:radial-gradient(ellipse at 50% 40%,#25221f,#0d0c0b 75%);color:#efe6d4;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:22px;padding:72px clamp(28px,8vw,48px);box-sizing:border-box;text-align:center;">
    <div style="position:absolute;inset:14px;border:1px solid rgba(205,178,131,.55);pointer-events:none;"></div>
    <div style="position:absolute;inset:19px;border:1px solid rgba(205,178,131,.22);pointer-events:none;"></div>
    <div data-foil="" style="font-family:{{ t.headFont }};font-size:clamp(54px,15vw,76px);line-height:1;background:linear-gradient(110deg,#8e6d38 0%,#b8975a 30%,#f0dfb0 48%,#b8975a 62%,#8e6d38 100%);background-size:260% 100%;-webkit-background-clip:text;background-clip:text;color:transparent;">{{ i1 }}<span style="font-size:.5em;padding:0 .1em;">&amp;</span>{{ i2 }}</div>
    <div data-in="" style="max-width:300px;font-family:{{ t.headFont }};font-style:italic;font-size:clamp(21px,5.6vw,26px);line-height:1.4;color:#e3cfa3;text-wrap:balance;">Será uma honra contar com a sua presença.</div>
    <p data-in="" style="margin:0;max-width:300px;line-height:1.7;opacity:.85;text-wrap:pretty;">Todos os detalhes do nosso grande dia estão no nosso site.</p>
    <a data-in="" href="{{ siteUrl }}" target="_blank" rel="noopener" style="margin-top:6px;display:inline-flex;align-items:center;gap:12px;padding:17px 32px;border:1px solid #cdb283;color:#efe6d4;font-size:11px;font-weight:500;letter-spacing:.28em;text-transform:uppercase;background:rgba(205,178,131,.08);">Ver o site do casal <span style="color:#e3cfa3;">→</span></a>
  </section>

  <div data-coverwrap="" style="position:absolute;inset:0;z-index:4;pointer-events:none;display:flex;align-items:center;justify-content:center;">
    <div data-box="" style="position:relative;height:min(54svh,100vw);aspect-ratio:3/4;">
      <div data-vellum="" style="position:absolute;inset:0;background:linear-gradient(160deg,rgba(255,255,255,.62),rgba(250,246,236,.5));backdrop-filter:blur(2.5px);-webkit-backdrop-filter:blur(2.5px);box-shadow:0 0 0 1px rgba(255,255,255,.6) inset;"></div>
      <div data-lid="" style="position:absolute;inset:-12px;background:linear-gradient(155deg,#25221f 0%,#121110 45%,#1d1b19 70%,#0b0a09 100%);box-shadow:0 30px 60px -20px rgba(0,0,0,.9), inset 0 1px 0 rgba(255,255,255,.08);">
        <div style="position:absolute;inset:16px;border:1px solid rgba(205,178,131,.55);"></div>
        <div style="position:absolute;inset:21px;border:1px solid rgba(205,178,131,.2);"></div>
        <div data-sheen="" style="position:absolute;inset:0;background:linear-gradient(115deg,rgba(255,255,255,0) 40%,rgba(255,255,255,.07) 50%,rgba(255,255,255,0) 60%);background-size:300% 100%;"></div>
        <div style="position:absolute;left:0;right:0;top:20%;display:flex;flex-direction:column;align-items:center;gap:10px;">
          <div data-foil="" style="font-family:{{ t.headFont }};font-size:min(clamp(40px,11vw,58px),7svh);line-height:1;background:linear-gradient(110deg,#8e6d38 0%,#b8975a 30%,#f0dfb0 48%,#b8975a 62%,#8e6d38 100%);background-size:260% 100%;-webkit-background-clip:text;background-clip:text;color:transparent;">{{ i1 }}<span style="font-size:.5em;padding:0 .1em;">&amp;</span>{{ i2 }}</div>
          <div style="font-size:min(10px,1.6svh);letter-spacing:.3em;color:#cdb283;">{{ dt.short }}</div>
        </div>
        <div data-rv="" style="position:absolute;top:0;bottom:0;left:84%;width:22px;margin-left:-11px;background:linear-gradient(90deg,#d9cdb4,#f6efe0 45%,#fffaf0 52%,#cfc2a6);box-shadow:0 0 6px rgba(0,0,0,.45);"></div>
        <div data-rh="" style="position:absolute;left:0;right:0;top:64%;height:22px;margin-top:-11px;background:linear-gradient(180deg,#d9cdb4,#f6efe0 45%,#fffaf0 52%,#cfc2a6);box-shadow:0 0 6px rgba(0,0,0,.45);"></div>
        <svg data-bow="" viewBox="0 0 120 90" style="position:absolute;left:84%;top:64%;width:120px;height:90px;margin:-40px 0 0 -60px;overflow:visible;filter:drop-shadow(0 4px 5px rgba(0,0,0,.5));">
          <defs><linearGradient id="c09sat" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fffaf0"></stop><stop offset=".5" stop-color="#e9dfc9"></stop><stop offset="1" stop-color="#c9bb9c"></stop></linearGradient></defs>
          <path d="M56 50 C40 70 34 82 28 92 L40 90 L44 98 C50 84 54 70 60 54 Z M64 50 C80 70 86 82 92 92 L80 90 L76 98 C70 84 66 70 60 54 Z" style="fill:url(#c09sat);"></path>
          <path d="M58 40 C40 14 10 16 12 34 C14 50 40 50 58 44 Z M62 40 C80 14 110 16 108 34 C106 50 80 50 62 44 Z" style="fill:url(#c09sat);"></path>
          <path d="M22 30 C30 26 44 32 54 40 M98 30 C90 26 76 32 66 40" style="fill:none;stroke:rgba(150,130,95,.5);stroke-width:1;"></path>
          <rect x="53" y="35" width="14" height="14" rx="3" style="fill:url(#c09sat);stroke:rgba(150,130,95,.5);stroke-width:.8;"></rect>
        </svg>
      </div>
    </div>
  </div>

  <div data-sweep="" style="position:absolute;left:0;right:0;top:0;height:2px;z-index:6;pointer-events:none;opacity:0;background:linear-gradient(90deg,rgba(184,151,90,0),#d9bf86 20%,#fff1c8 50%,#d9bf86 80%,rgba(184,151,90,0));box-shadow:0 0 14px 2px rgba(240,215,160,.6);"></div>

  <div style="position:absolute;left:0;right:0;bottom:clamp(30px,4.6vh,44px);z-index:7;display:flex;flex-direction:column;align-items:center;gap:10px;pointer-events:none;opacity:{{ hintOp }};transition:opacity .6s ease;">
    <span style="font-size:10px;font-weight:500;letter-spacing:.3em;text-transform:uppercase;color:#7d6a4a;">Toque para continuar</span>
    <div style="display:flex;gap:6px;">
      <sc-for list="{{ dots }}" as="d" hint-placeholder-count="7">
        <span style="width:{{ d.w }};height:3px;border-radius:3px;background:{{ d.bg }};transition:width .5s ease, background .5s ease;"></span>
      </sc-for>
    </div>
  </div>

</div>`;
