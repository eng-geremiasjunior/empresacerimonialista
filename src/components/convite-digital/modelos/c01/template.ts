// A marcação do Convite 01, copiada LITERAL de design_handoff_convites/Convite 01.dc.html
// (entre </helmet> e o <script>) por ferramentas/convites/extrair.mjs. Não editar à mão
// além das trocas declaradas em modelo.ts.

export const TEMPLATE = String.raw`<div style="position:relative;height:100svh;background:#141b2c;color:{{ t.ink }};font-family:{{ t.textFont }};font-size:{{ t.textSize }};font-weight:{{ t.textWeight }};">

<div data-scroller="" style="height:100svh;overflow-y:auto;overflow-x:hidden;scroll-snap-type:y mandatory;cursor:pointer;">

  <section data-scene="0" data-screen-label="01 Abertura" style="position:relative;height:100svh;scroll-snap-align:start;scroll-snap-stop:always;background:radial-gradient(ellipse at 50% 40%,#2c3858,#141b2c 72%);color:#f3ece0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:clamp(18px,4vh,36px);padding:24px;box-sizing:border-box;overflow:hidden;">
    <div data-o="top" style="text-align:center;font-size:11px;font-weight:600;letter-spacing:.36em;text-transform:uppercase;color:#dcc393;">Você recebeu um convite</div>
    <div style="position:relative;width:min(240px,62vw);aspect-ratio:2/3;">
      <svg viewBox="0 0 200 300" style="position:absolute;inset:0;width:100%;height:100%;overflow:visible;">
        <path data-os="0" pathLength="1" d="M70 20 Q70 150 70 280" style="fill:none;stroke:#dcc393;stroke-width:1.6;stroke-dasharray:1;stroke-dashoffset:1;"></path>
        <path data-os="1" pathLength="1" d="M90 20 Q90 150 90 280" style="fill:none;stroke:#dcc393;stroke-width:1.3;stroke-dasharray:1;stroke-dashoffset:1;"></path>
        <path data-os="2" pathLength="1" d="M110 20 Q110 150 110 280" style="fill:none;stroke:#dcc393;stroke-width:1.05;stroke-dasharray:1;stroke-dashoffset:1;"></path>
        <path data-os="3" pathLength="1" d="M130 20 Q130 150 130 280" style="fill:none;stroke:#dcc393;stroke-width:.85;stroke-dasharray:1;stroke-dashoffset:1;"></path>
        <g data-obow="" style="opacity:0;">
          <path d="M-130 160 Q-65 154 0 164" style="fill:none;stroke:#8a5f36;stroke-width:3;stroke-linecap:round;"></path>
          <path d="M-123 168 L-2 168" style="fill:none;stroke:#f3ead6;stroke-width:1.4;stroke-linecap:round;"></path>
          <rect x="-138" y="157" width="14" height="12" rx="2.5" style="fill:#3b2a1c;"></rect>
          <circle cx="-131" cy="163" r="2" style="fill:#dcc393;"></circle>
          <path d="M0 164 L4 158" style="stroke:#8a5f36;stroke-width:2.6;stroke-linecap:round;"></path>
        </g>
      </svg>
      <div data-o="mono" style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;opacity:0;">
        <div style="width:clamp(130px,36vw,170px);aspect-ratio:1;border-radius:50%;background:rgba(20,27,44,.86);box-shadow:inset 0 0 0 1px #b08d57, inset 0 0 0 6px rgba(20,27,44,.86), inset 0 0 0 7px rgba(176,141,87,.6);display:flex;align-items:center;justify-content:center;font-family:{{ t.nameFont }};font-weight:{{ t.nameWeight }};font-style:{{ t.nameStyle }};font-size:{{ t.monoSize }};line-height:1;color:#f3ece0;">{{ i1 }}<span style="color:#dcc393;font-size:.55em;">&amp;</span>{{ i2 }}</div>
      </div>
    </div>
    <div data-o="hint" style="display:flex;flex-direction:column;align-items:center;gap:10px;opacity:0;">
      <span style="font-family:{{ t.headFont }};font-style:italic;font-size:clamp(18px,2.2vw,22px);">Toque para abrir</span>
      <span style="width:1px;height:28px;background:#dcc393;"></span>
    </div>
  </section>

  <section data-scene="1" data-screen-label="02 Nomes" style="position:relative;height:100svh;scroll-snap-align:start;scroll-snap-stop:always;background:{{ t.paper }};display:flex;flex-direction:column;align-items:center;justify-content:center;gap:26px;padding:72px clamp(28px,8vw,48px);box-sizing:border-box;text-align:center;">
    <div data-in="" style="font-size:11px;font-weight:600;letter-spacing:.34em;text-transform:uppercase;color:{{ t.goldText }};">Com alegria, convidamos você para o casamento de</div>
    <div data-in="" style="display:flex;flex-direction:column;align-items:center;gap:6px;">
      <sc-if value="{{ modeNames }}" hint-placeholder-val="{{ true }}">
        <h1 style="margin:0;display:flex;flex-direction:column;align-items:center;font-weight:{{ t.nameWeight }};font-family:{{ t.nameFont }};font-style:{{ t.nameStyle }};text-transform:{{ t.nameTT }};letter-spacing:{{ t.nameLS }};font-size:{{ t.nameSize }};line-height:{{ t.nameLH }};">
          <span>{{ n1 }}</span>
          <span style="font-family:{{ t.headFont }};font-style:italic;font-weight:400;text-transform:none;letter-spacing:0;font-size:.4em;line-height:1.5;color:{{ t.goldText }};">&amp;</span>
          <span>{{ n2 }}</span>
        </h1>
      </sc-if>
      <sc-if value="{{ modeInitials }}" hint-placeholder-val="{{ false }}">
        <div style="display:flex;align-items:center;gap:.22em;font-family:{{ t.nameFont }};font-weight:{{ t.nameWeight }};font-style:{{ t.nameStyle }};font-size:{{ t.initSize }};line-height:1;"><span>{{ i1 }}</span><span style="width:1px;height:.7em;background:{{ t.gold }};"></span><span>{{ i2 }}</span></div>
      </sc-if>
      <sc-if value="{{ modeBoth }}" hint-placeholder-val="{{ false }}">
        <div style="display:flex;align-items:center;gap:.22em;font-family:{{ t.nameFont }};font-weight:{{ t.nameWeight }};font-style:{{ t.nameStyle }};font-size:{{ t.initSizeSm }};line-height:1;"><span>{{ i1 }}</span><span style="width:1px;height:.7em;background:{{ t.gold }};"></span><span>{{ i2 }}</span></div>
        <div style="font-family:{{ t.nameFont }};font-weight:{{ t.nameWeight }};font-style:{{ t.nameStyle }};text-transform:{{ t.nameTT }};letter-spacing:{{ t.nameLS }};font-size:{{ t.nameSizeSm }};line-height:{{ t.nameLH }};">{{ n1 }} &amp; {{ n2 }}</div>
      </sc-if>
    </div>
    <div data-bowline="" style="width:min(280px,80%);">
      <svg viewBox="0 0 300 30" style="display:block;width:100%;height:auto;overflow:visible;">
        <line data-bl="" x1="0" y1="22" x2="300" y2="22" pathLength="1" style="stroke:{{ t.gold }};stroke-width:1.2;stroke-dasharray:1;stroke-dashoffset:1;"></line>
        <rect data-bd="" x="146" y="18" width="8" height="8" transform="rotate(45 150 22)" style="fill:{{ t.gold }};opacity:0;"></rect>
        <g data-bow="" style="opacity:0;"><path d="M-110 6 Q-55 2 0 9" style="fill:none;stroke:#6b4a2b;stroke-width:2.2;stroke-linecap:round;"></path><path d="M-104 12 L-2 12" style="fill:none;stroke:#e9dcc2;stroke-width:1.1;stroke-linecap:round;"></path><rect x="-116" y="4" width="11" height="9" rx="2" style="fill:#3b2a1c;"></rect><circle cx="-110.5" cy="8.5" r="1.5" style="fill:#dcc393;"></circle></g>
      </svg>
    </div>
  </section>

  <section data-scene="2" data-screen-label="03 Frase" style="position:relative;height:100svh;scroll-snap-align:start;scroll-snap-stop:always;background:{{ t.paper }};display:flex;flex-direction:column;align-items:center;justify-content:center;gap:28px;padding:72px clamp(32px,9vw,56px);box-sizing:border-box;text-align:center;">
    <div data-in="" style="font-family:{{ t.headFont }};font-size:64px;line-height:.6;color:{{ t.gold }};">“</div>
    <p data-in="" style="margin:0;max-width:420px;font-family:{{ t.headFont }};font-style:italic;font-weight:{{ t.headWeight }};font-size:clamp(24px,6.4vw,32px);line-height:1.4;text-wrap:balance;">O amor é paciente, o amor é bondoso. Tudo sofre, tudo crê, tudo espera, tudo suporta.</p>
    <div data-bowline="" style="width:min(160px,50%);">
      <svg viewBox="0 0 300 30" style="display:block;width:100%;height:auto;overflow:visible;">
        <line data-bl="" x1="0" y1="22" x2="300" y2="22" pathLength="1" style="stroke:{{ t.gold }};stroke-width:1.6;stroke-dasharray:1;stroke-dashoffset:1;"></line>
        <rect data-bd="" x="146" y="18" width="8" height="8" transform="rotate(45 150 22)" style="fill:{{ t.gold }};opacity:0;"></rect>
        <g data-bow="" style="opacity:0;"><path d="M-110 6 Q-55 2 0 9" style="fill:none;stroke:#6b4a2b;stroke-width:3;stroke-linecap:round;"></path><path d="M-104 12 L-2 12" style="fill:none;stroke:#e9dcc2;stroke-width:1.6;stroke-linecap:round;"></path><rect x="-116" y="4" width="11" height="9" rx="2" style="fill:#3b2a1c;"></rect><circle cx="-110.5" cy="8.5" r="1.5" style="fill:#dcc393;"></circle></g>
      </svg>
    </div>
    <div data-in="" style="font-size:12px;font-weight:600;letter-spacing:.3em;text-transform:uppercase;color:{{ t.goldText }};">1 Coríntios 13</div>
  </section>

  <section data-scene="3" data-screen-label="04 Foto" style="position:relative;height:100svh;scroll-snap-align:start;scroll-snap-stop:always;background:{{ t.paper }};display:flex;flex-direction:column;align-items:center;justify-content:center;gap:28px;padding:72px 28px;box-sizing:border-box;text-align:center;">
    <div style="position:relative;height:min(58svh,118vw);aspect-ratio:3/4;">
      <svg viewBox="0 0 300 400" preserveAspectRatio="none" style="position:absolute;inset:-12px;width:calc(100% + 24px);height:calc(100% + 24px);overflow:visible;">
        <path data-arch="" pathLength="1" d="M0 400 L0 150 A150 150 0 0 1 300 150 L300 400" style="fill:none;stroke:{{ t.gold }};stroke-width:1.2;vector-effect:non-scaling-stroke;stroke-dasharray:1;stroke-dashoffset:1;"></path>
      </svg>
      <div data-photo="" style="position:absolute;inset:0;border-radius:999px 999px 0 0;overflow:hidden;clip-path:inset(100% 0 0 0);">
        <div data-photo-z="" style="position:absolute;inset:0;transform:scale(1.25);">
          <image-slot id="c01-foto" shape="rect" placeholder="Foto do casal" style="width:100%;height:100%;"></image-slot>
        </div>
      </div>
    </div>
    <div data-in="" style="font-family:{{ t.headFont }};font-style:italic;font-size:clamp(20px,5.4vw,24px);color:{{ t.muted }};">Duas histórias que viraram uma só.</div>
  </section>

  <section data-scene="4" data-screen-label="05 Data" style="position:relative;height:100svh;scroll-snap-align:start;scroll-snap-stop:always;background:{{ t.paper }};display:flex;flex-direction:column;align-items:center;justify-content:center;gap:22px;padding:72px clamp(28px,8vw,48px);box-sizing:border-box;text-align:center;">
    <div data-in="" style="font-size:11px;font-weight:600;letter-spacing:.34em;text-transform:uppercase;color:{{ t.goldText }};">Guarde esta data</div>
    <div data-in="" style="width:100%;max-width:400px;display:grid;grid-template-columns:minmax(0,1fr) auto minmax(0,1fr);align-items:center;gap:clamp(12px,4vw,22px);">
      <span style="padding:10px 0;border-top:1px solid {{ t.lineStrong }};border-bottom:1px solid {{ t.lineStrong }};font-size:12px;font-weight:600;letter-spacing:.24em;text-transform:uppercase;">{{ dt.weekday }}</span>
      <span style="font-family:{{ t.headFont }};font-weight:{{ t.headWeight }};font-size:clamp(84px,26vw,128px);line-height:.9;font-variant-numeric:lining-nums;">{{ dt.day }}</span>
      <span style="padding:10px 0;border-top:1px solid {{ t.lineStrong }};border-bottom:1px solid {{ t.lineStrong }};font-size:12px;font-weight:600;letter-spacing:.24em;">{{ dt.year }}</span>
    </div>
    <div data-in="" style="font-size:15px;font-weight:600;letter-spacing:.5em;text-transform:uppercase;padding-left:.5em;">{{ dt.month }}</div>
    <div data-bowline="" style="width:min(220px,64%);">
      <svg viewBox="0 0 300 30" style="display:block;width:100%;height:auto;overflow:visible;">
        <line data-bl="" x1="0" y1="22" x2="300" y2="22" pathLength="1" style="stroke:{{ t.gold }};stroke-width:1.3;stroke-dasharray:1;stroke-dashoffset:1;"></line>
        <rect data-bd="" x="146" y="18" width="8" height="8" transform="rotate(45 150 22)" style="fill:{{ t.gold }};opacity:0;"></rect>
        <g data-bow="" style="opacity:0;"><path d="M-110 6 Q-55 2 0 9" style="fill:none;stroke:#6b4a2b;stroke-width:2.6;stroke-linecap:round;"></path><path d="M-104 12 L-2 12" style="fill:none;stroke:#e9dcc2;stroke-width:1.3;stroke-linecap:round;"></path><rect x="-116" y="4" width="11" height="9" rx="2" style="fill:#3b2a1c;"></rect><circle cx="-110.5" cy="8.5" r="1.5" style="fill:#dcc393;"></circle></g>
      </svg>
    </div>
    <div data-in="" style="font-family:{{ t.headFont }};font-style:italic;font-size:clamp(22px,6vw,26px);">às {{ dt.time }}</div>
  </section>

  <section data-scene="5" data-screen-label="06 Local" style="position:relative;height:100svh;scroll-snap-align:start;scroll-snap-stop:always;background:{{ t.paper }};display:flex;flex-direction:column;align-items:center;justify-content:center;gap:20px;padding:72px clamp(28px,8vw,48px);box-sizing:border-box;text-align:center;">
    <div data-in="" style="font-size:11px;font-weight:600;letter-spacing:.34em;text-transform:uppercase;color:{{ t.goldText }};">Cerimônia e recepção</div>
    <div data-in="" style="max-width:420px;font-family:{{ t.headFont }};font-weight:{{ t.headWeight }};font-style:{{ t.headStyle }};text-transform:{{ t.headTT }};letter-spacing:{{ t.headLSsoft }};font-size:{{ t.headSize }};line-height:1.12;text-wrap:balance;">Espaço Villa Toscana</div>
    <div data-bowline="" style="width:min(220px,64%);">
      <svg viewBox="0 0 300 30" style="display:block;width:100%;height:auto;overflow:visible;">
        <line data-bl="" x1="0" y1="22" x2="300" y2="22" pathLength="1" style="stroke:{{ t.gold }};stroke-width:1.3;stroke-dasharray:1;stroke-dashoffset:1;"></line>
        <rect data-bd="" x="146" y="18" width="8" height="8" transform="rotate(45 150 22)" style="fill:{{ t.gold }};opacity:0;"></rect>
        <g data-bow="" style="opacity:0;"><path d="M-110 6 Q-55 2 0 9" style="fill:none;stroke:#6b4a2b;stroke-width:2.6;stroke-linecap:round;"></path><path d="M-104 12 L-2 12" style="fill:none;stroke:#e9dcc2;stroke-width:1.3;stroke-linecap:round;"></path><rect x="-116" y="4" width="11" height="9" rx="2" style="fill:#3b2a1c;"></rect><circle cx="-110.5" cy="8.5" r="1.5" style="fill:#dcc393;"></circle></g>
      </svg>
    </div>
    <div data-in="" style="display:flex;flex-direction:column;gap:6px;color:{{ t.muted }};line-height:1.6;">
      <span>Rua X, 123</span>
      <span>São Paulo · SP</span>
    </div>
  </section>

  <section data-scene="6" data-screen-label="07 Final" style="position:relative;height:100svh;scroll-snap-align:start;scroll-snap-stop:always;background:radial-gradient(ellipse at 50% 30%,#2c3858,#141b2c 72%);color:#f3ece0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:24px;padding:72px clamp(28px,8vw,48px);box-sizing:border-box;text-align:center;">
    <div data-in="" style="font-size:11px;font-weight:600;letter-spacing:.34em;text-transform:uppercase;color:#dcc393;">Esperamos você</div>
    <div data-in="" style="font-family:{{ t.nameFont }};font-weight:{{ t.nameWeight }};font-style:{{ t.nameStyle }};text-transform:{{ t.nameTT }};letter-spacing:{{ t.nameLS }};font-size:{{ t.nameSizeSm }};line-height:{{ t.nameLH }};">{{ n1 }} <span style="color:#dcc393;">&amp;</span> {{ n2 }}</div>
    <div data-bowline="" style="width:min(220px,64%);">
      <svg viewBox="0 0 300 30" style="display:block;width:100%;height:auto;overflow:visible;">
        <line data-bl="" x1="0" y1="22" x2="300" y2="22" pathLength="1" style="stroke:#dcc393;stroke-width:1.3;stroke-dasharray:1;stroke-dashoffset:1;"></line>
        <rect data-bd="" x="146" y="18" width="8" height="8" transform="rotate(45 150 22)" style="fill:#dcc393;opacity:0;"></rect>
        <g data-bow="" style="opacity:0;"><path d="M-110 6 Q-55 2 0 9" style="fill:none;stroke:#a87a4a;stroke-width:2.6;stroke-linecap:round;"></path><path d="M-104 12 L-2 12" style="fill:none;stroke:#f3ead6;stroke-width:1.3;stroke-linecap:round;"></path><rect x="-116" y="4" width="11" height="9" rx="2" style="fill:#f3ead6;"></rect><circle cx="-110.5" cy="8.5" r="1.5" style="fill:#3b2a1c;"></circle></g>
      </svg>
    </div>
    <p data-in="" style="margin:0;max-width:340px;line-height:1.7;opacity:.85;text-wrap:pretty;">Todos os detalhes do nosso grande dia estão no nosso site.</p>
    <a data-in="" href="{{ siteUrl }}" target="_blank" rel="noopener" style="margin-top:8px;display:inline-flex;align-items:center;gap:12px;padding:19px 32px;background:#f3ece0;color:#1f2a44;font-size:11px;font-weight:600;letter-spacing:.26em;text-transform:uppercase;">Ver o site do casal <span>→</span></a>
  </section>

</div>

<div data-x="" style="position:fixed;inset:0;z-index:90;pointer-events:none;visibility:hidden;">
  <svg style="position:absolute;inset:0;width:100%;height:100%;display:block;">
    <defs>
      <radialGradient id="c01bg" cx="50%" cy="40%" r="75%"><stop offset="0" stop-color="#2c3858"></stop><stop offset="1" stop-color="#141b2c"></stop></radialGradient>
      <mask id="c01m" maskUnits="userSpaceOnUse" x="-50000" y="-50000" width="100000" height="100000">
        <rect x="-50000" y="-50000" width="100000" height="100000" fill="#fff"></rect>
        <g data-xh="" transform="translate(0 0) scale(0)">
          <sc-if value="{{ shapeViolin }}" hint-placeholder-val="{{ true }}"><path d="M50 10 C58 10 66 14 67 24 C68 32 65 36 61 38 C57 42 57 56 62 61 C70 64 72 72 71 79 C70 88 60 91 50 91 C40 91 30 88 29 79 C28 72 30 64 38 61 C43 56 43 42 39 38 C35 36 32 32 33 24 C34 14 42 10 50 10 Z M47 11 L47 -16 C47 -22 44 -24 46 -27 C48 -30 52 -30 54 -27 C56 -24 53 -22 53 -16 L53 11 Z" fill="#000"></path></sc-if>
          <sc-if value="{{ shapeNote }}" hint-placeholder-val="{{ false }}"><path d="M56 -14 L60 -14 C60 -2 66 4 74 10 C82 16 86 26 80 38 C84 26 78 18 70 15 C65 13 61 10 60 6 L60 64 C60 72 52 79 42 80 C31 81 24 75 26 67 C28 59 37 54 46 54 C51 54 54 55 56 57 Z" fill="#000"></path></sc-if>
        </g>
      </mask>
    </defs>
    <rect width="100%" height="100%" fill="url(#c01bg)" mask="url(#c01m)"></rect>
    <g data-xo="" transform="translate(0 0) scale(0)" style="fill:none;stroke:#dcc393;">
      <sc-if value="{{ shapeViolin }}" hint-placeholder-val="{{ true }}"><path data-xop="" d="M50 10 C58 10 66 14 67 24 C68 32 65 36 61 38 C57 42 57 56 62 61 C70 64 72 72 71 79 C70 88 60 91 50 91 C40 91 30 88 29 79 C28 72 30 64 38 61 C43 56 43 42 39 38 C35 36 32 32 33 24 C34 14 42 10 50 10 Z M47 11 L47 -16 C47 -22 44 -24 46 -27 C48 -30 52 -30 54 -27 C56 -24 53 -22 53 -16 L53 11 Z" style="stroke-width:.6;"></path></sc-if>
      <sc-if value="{{ shapeNote }}" hint-placeholder-val="{{ false }}"><path data-xop="" d="M56 -14 L60 -14 C60 -2 66 4 74 10 C82 16 86 26 80 38 C84 26 78 18 70 15 C65 13 61 10 60 6 L60 64 C60 72 52 79 42 80 C31 81 24 75 26 67 C28 59 37 54 46 54 C51 54 54 55 56 57 Z" style="stroke-width:.6;"></path></sc-if>
    </g>
  </svg>
</div>

<svg data-strings="" viewBox="0 0 100 1000" preserveAspectRatio="none" style="position:fixed;left:clamp(6px,2vw,24px);top:0;z-index:45;width:clamp(16px,2.4vw,28px);height:100svh;overflow:visible;pointer-events:none;opacity:{{ stringsOp }};transition:opacity .8s ease;">
  <path data-str="0" d="M14 0 Q14 500 14 1000" style="fill:none;stroke:#b08d57;stroke-width:1.3;vector-effect:non-scaling-stroke;"></path>
  <path data-str="1" d="M38 0 Q38 500 38 1000" style="fill:none;stroke:#b08d57;stroke-width:1.05;vector-effect:non-scaling-stroke;"></path>
  <path data-str="2" d="M62 0 Q62 500 62 1000" style="fill:none;stroke:#b08d57;stroke-width:.85;vector-effect:non-scaling-stroke;"></path>
  <path data-str="3" d="M86 0 Q86 500 86 1000" style="fill:none;stroke:#b08d57;stroke-width:.7;vector-effect:non-scaling-stroke;"></path>
</svg>

<div style="position:fixed;inset:12px;z-index:40;pointer-events:none;border:1px solid #b08d57;opacity:{{ frameOp }};transition:opacity .8s ease;"></div>
<div style="position:fixed;inset:17px;z-index:40;pointer-events:none;border:1px solid rgba(176,141,87,.45);opacity:{{ frameOp }};transition:opacity .8s ease;"></div>

<div style="position:fixed;left:0;right:0;bottom:clamp(26px,4vh,40px);z-index:50;display:flex;flex-direction:column;align-items:center;gap:10px;pointer-events:none;opacity:{{ hintOp }};transition:opacity .6s ease;">
  <span style="font-size:10px;font-weight:600;letter-spacing:.28em;text-transform:uppercase;color:{{ hintColor }};">Toque para continuar</span>
  <div style="display:flex;gap:6px;">
    <sc-for list="{{ dots }}" as="d" hint-placeholder-count="7">
      <span style="width:{{ d.w }};height:3px;border-radius:3px;background:{{ d.bg }};transition:width .5s ease, background .5s ease;"></span>
    </sc-for>
  </div>
</div>

</div>`;
