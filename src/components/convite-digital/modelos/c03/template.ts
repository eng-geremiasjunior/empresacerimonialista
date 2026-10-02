// A marcação do Convite 03, copiada LITERAL de design_handoff_convites/Convite 03.dc.html
// (entre </helmet> e o <script>) por ferramentas/convites/extrair.mjs. Não editar à mão
// além das trocas declaradas em modelo.ts.

export const TEMPLATE = String.raw`<div data-root="" style="position:relative;height:100svh;overflow:hidden;background:#2e1b2e;color:#3a2433;font-family:{{ t.textFont }};font-size:{{ t.textSize }};font-weight:{{ t.textWeight }};cursor:pointer;user-select:none;-webkit-user-select:none;">

  <section data-scene="0" data-screen-label="01 Abertura" style="position:absolute;inset:0;z-index:2;background:radial-gradient(ellipse at 50% 30%,#6b4560,#2e1b2e 75%);color:#f6ece6;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:clamp(20px,3.6vh,34px);padding:24px;box-sizing:border-box;text-align:center;overflow:hidden;">
    <sc-for list="{{ stars0 }}" as="s" hint-placeholder-count="30">
      <span data-star="" style="position:absolute;left:{{ s.x }};top:{{ s.y }};width:{{ s.z }};height:{{ s.z }};border-radius:50%;background:#fff3dc;box-shadow:0 0 6px rgba(255,236,200,.8);opacity:{{ s.o }};"></span>
    </sc-for>
    <div data-o="" style="position:relative;font-size:11px;font-weight:600;letter-spacing:.36em;text-transform:uppercase;color:#e6cf9a;">Você recebeu um convite</div>
    <div data-gate="" style="position:relative;width:min(250px,62vw);aspect-ratio:300/460;perspective:900px;">
      <div data-light="" style="position:absolute;inset:4%;border-radius:999px 999px 0 0;background:radial-gradient(ellipse at 50% 55%,#fffaf0,#f6deb0 55%,#e5b98c);box-shadow:0 0 60px 10px rgba(246,222,176,.25);"></div>
      <div data-door="l" style="position:absolute;left:4%;top:4%;bottom:0;width:46%;transform-origin:left center;">
        <svg viewBox="0 0 150 460" preserveAspectRatio="none" style="display:block;width:100%;height:100%;">
          <defs><linearGradient id="c03dl" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#f3e2d8"></stop><stop offset="1" stop-color="#fbf3ef"></stop></linearGradient></defs>
          <path d="M150 0 A150 150 0 0 0 0 150 L0 460 L150 460 Z" style="fill:url(#c03dl);"></path>
          <path d="M138 26 A124 124 0 0 0 16 150 L16 290 L138 290 Z" style="fill:none;stroke:#c6a15b;stroke-width:1.4;"></path>
          <path d="M16 312 L138 312 L138 440 L16 440 Z" style="fill:none;stroke:#c6a15b;stroke-width:1.4;"></path>
          <path d="M77 150 C60 180 60 230 77 260 C94 230 94 180 77 150 Z" style="fill:none;stroke:#c6a15b;stroke-width:1;"></path>
          <circle cx="77" cy="376" r="6" style="fill:none;stroke:#c6a15b;stroke-width:1;"></circle>
        </svg>
      </div>
      <div data-door="r" style="position:absolute;right:4%;top:4%;bottom:0;width:46%;transform-origin:right center;">
        <svg viewBox="0 0 150 460" preserveAspectRatio="none" style="display:block;width:100%;height:100%;transform:scaleX(-1);">
          <defs><linearGradient id="c03dr" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#ead5ca"></stop><stop offset="1" stop-color="#fbf3ef"></stop></linearGradient></defs>
          <path d="M150 0 A150 150 0 0 0 0 150 L0 460 L150 460 Z" style="fill:url(#c03dr);"></path>
          <path d="M138 26 A124 124 0 0 0 16 150 L16 290 L138 290 Z" style="fill:none;stroke:#c6a15b;stroke-width:1.4;"></path>
          <path d="M16 312 L138 312 L138 440 L16 440 Z" style="fill:none;stroke:#c6a15b;stroke-width:1.4;"></path>
          <path d="M77 150 C60 180 60 230 77 260 C94 230 94 180 77 150 Z" style="fill:none;stroke:#c6a15b;stroke-width:1;"></path>
          <circle cx="77" cy="376" r="6" style="fill:none;stroke:#c6a15b;stroke-width:1;"></circle>
        </svg>
      </div>
      <svg viewBox="0 0 300 460" preserveAspectRatio="none" style="position:absolute;inset:0;width:100%;height:100%;overflow:visible;pointer-events:none;">
        <path data-frame="" pathLength="1" d="M0 460 L0 150 A150 150 0 0 1 300 150 L300 460" style="fill:none;stroke:#e6cf9a;stroke-width:1.6;vector-effect:non-scaling-stroke;stroke-dasharray:1;stroke-dashoffset:1;"></path>
        <path data-frame="" pathLength="1" d="M-10 460 L-10 150 A160 160 0 0 1 310 150 L310 460" style="fill:none;stroke:rgba(230,207,154,.5);stroke-width:1;vector-effect:non-scaling-stroke;stroke-dasharray:1;stroke-dashoffset:1;"></path>
      </svg>
      <div data-crest="" style="position:absolute;left:50%;top:44%;width:clamp(64px,17vw,80px);aspect-ratio:1;transform:translate(-50%,-50%);border-radius:50%;background:radial-gradient(circle at 38% 32%,#f1d9a4,#c6a15b 60%,#9c7a3c);box-shadow:0 6px 16px rgba(0,0,0,.35), inset 0 0 0 4px rgba(255,255,255,.18), inset 0 0 0 5px rgba(120,88,40,.4);display:flex;align-items:center;justify-content:center;font-family:{{ t.nameFont }};font-weight:{{ t.nameWeight }};font-style:{{ t.nameStyle }};font-size:{{ t.crestSize }};line-height:1;color:#3a2433;">{{ i1 }}{{ i2 }}</div>
    </div>
    <div data-o="" style="position:relative;display:flex;flex-direction:column;align-items:center;gap:10px;">
      <span style="font-family:{{ t.headFont }};font-style:italic;font-size:clamp(18px,2.2vw,22px);">Toque para abrir os portões</span>
      <span style="width:1px;height:26px;background:#e6cf9a;"></span>
    </div>
  </section>

  <section data-scene="1" data-screen-label="02 Nomes" style="position:absolute;inset:0;z-index:1;visibility:hidden;background:#fbf3ef;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:min(20px,2.4svh);padding:min(72px,8svh) clamp(28px,8vw,48px) max(90px,12svh);box-sizing:border-box;text-align:center;overflow:hidden;">
    <sc-for list="{{ dust }}" as="d" hint-placeholder-count="12">
      <span data-dust="" style="position:absolute;left:{{ d.x }};top:{{ d.y }};width:{{ d.z }};height:{{ d.z }};border-radius:50%;background:#e6cf9a;box-shadow:0 0 8px 1px rgba(230,207,154,.7);opacity:0;"></span>
    </sc-for>
    <div data-in="" style="position:relative;font-family:{{ t.headFont }};font-style:italic;font-size:clamp(24px,6.4vw,30px);color:#9c5265;">Era uma vez...</div>
    <svg viewBox="0 0 200 70" style="position:relative;width:min(150px,42vw,22svh);height:auto;overflow:visible;">
      <path data-tiara="" pathLength="1" d="M14 62 Q100 74 186 62" style="fill:none;stroke:#c6a15b;stroke-width:1.6;stroke-linecap:round;stroke-dasharray:1;stroke-dashoffset:1;"></path>
      <path data-tiara="" pathLength="1" d="M20 60 L36 34 L50 54 L70 24 L86 50 L100 8 L114 50 L130 24 L150 54 L164 34 L180 60" style="fill:none;stroke:#c6a15b;stroke-width:1.4;stroke-linejoin:round;stroke-linecap:round;stroke-dasharray:1;stroke-dashoffset:1;"></path>
      <g data-gems="" style="opacity:0;">
        <circle cx="36" cy="31" r="2.6" style="fill:#e6cf9a;"></circle><circle cx="70" cy="21" r="3" style="fill:#e6cf9a;"></circle>
        <path d="M100 -4 L104 4 L100 12 L96 4 Z" style="fill:#d98b98;"></path>
        <circle cx="130" cy="21" r="3" style="fill:#e6cf9a;"></circle><circle cx="164" cy="31" r="2.6" style="fill:#e6cf9a;"></circle>
      </g>
    </svg>
    <div data-in="" style="position:relative;display:flex;flex-direction:column;align-items:center;gap:6px;">
      <sc-if value="{{ modeNames }}" hint-placeholder-val="{{ true }}">
        <h1 style="margin:0;display:flex;flex-direction:column;align-items:center;font-weight:{{ t.nameWeight }};font-family:{{ t.nameFont }};font-style:{{ t.nameStyle }};text-transform:{{ t.nameTT }};letter-spacing:{{ t.nameLS }};font-size:{{ t.nameSize }};line-height:{{ t.nameLH }};">
          <span>{{ n1 }}</span>
          <span style="font-family:{{ t.headFont }};font-style:italic;font-weight:400;text-transform:none;letter-spacing:0;font-size:.4em;line-height:1.5;color:#9c5265;">&amp;</span>
          <span>{{ n2 }}</span>
        </h1>
      </sc-if>
      <sc-if value="{{ modeInitials }}" hint-placeholder-val="{{ false }}">
        <div style="display:flex;align-items:center;gap:.22em;font-family:{{ t.nameFont }};font-weight:{{ t.nameWeight }};font-style:{{ t.nameStyle }};font-size:{{ t.initSize }};line-height:1;"><span>{{ i1 }}</span><span style="width:1px;height:.7em;background:#c6a15b;"></span><span>{{ i2 }}</span></div>
      </sc-if>
      <sc-if value="{{ modeBoth }}" hint-placeholder-val="{{ false }}">
        <div style="display:flex;align-items:center;gap:.22em;font-family:{{ t.nameFont }};font-weight:{{ t.nameWeight }};font-style:{{ t.nameStyle }};font-size:{{ t.initSizeSm }};line-height:1;"><span>{{ i1 }}</span><span style="width:1px;height:.7em;background:#c6a15b;"></span><span>{{ i2 }}</span></div>
        <div style="font-family:{{ t.nameFont }};font-weight:{{ t.nameWeight }};font-style:{{ t.nameStyle }};text-transform:{{ t.nameTT }};letter-spacing:{{ t.nameLS }};font-size:{{ t.nameSizeSm }};line-height:{{ t.nameLH }};">{{ n1 }} &amp; {{ n2 }}</div>
      </sc-if>
    </div>
    <div data-in="" style="position:relative;max-width:300px;font-size:11px;font-weight:600;letter-spacing:.3em;line-height:1.9;text-transform:uppercase;color:#7a6270;">Têm a alegria de convidar você para o seu casamento</div>
  </section>

  <section data-scene="2" data-screen-label="03 Frase" style="position:absolute;inset:0;z-index:1;visibility:hidden;background:#f6e8e3;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:30px;padding:72px clamp(32px,9vw,56px);box-sizing:border-box;text-align:center;">
    <div data-in="" style="display:flex;align-items:center;gap:12px;">
      <span style="width:34px;height:1px;background:#c6a15b;"></span>
      <svg viewBox="0 0 20 20" style="width:16px;height:16px;"><path d="M10 0 L12 8 L20 10 L12 12 L10 20 L8 12 L0 10 L8 8 Z" style="fill:#c6a15b;"></path></svg>
      <span style="width:34px;height:1px;background:#c6a15b;"></span>
    </div>
    <p style="margin:0;max-width:420px;display:flex;flex-wrap:wrap;justify-content:center;gap:.08em .3em;font-family:{{ t.headFont }};font-style:italic;font-weight:{{ t.headWeight }};font-size:clamp(25px,6.6vw,34px);line-height:1.38;">
      <sc-for list="{{ words }}" as="w" hint-placeholder-count="14">
        <span data-w="" style="display:inline-block;">{{ w }}</span>
      </sc-for>
    </p>
    <div data-in="" style="font-size:12px;font-weight:600;letter-spacing:.3em;text-transform:uppercase;color:#9c5265;">{{ n1 }} &amp; {{ n2 }}</div>
  </section>

  <section data-scene="3" data-screen-label="04 Foto" style="position:absolute;inset:0;z-index:1;visibility:hidden;background:#fbf3ef;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:28px;padding:72px 28px;box-sizing:border-box;text-align:center;overflow:hidden;">
    <sc-for list="{{ dust }}" as="d" hint-placeholder-count="12">
      <span data-dust="" style="position:absolute;left:{{ d.x }};top:{{ d.y }};width:{{ d.z }};height:{{ d.z }};border-radius:50%;background:#e6cf9a;box-shadow:0 0 8px 1px rgba(230,207,154,.7);opacity:0;"></span>
    </sc-for>
    <div style="position:relative;height:min(56svh,118vw);aspect-ratio:3/4.3;">
      <svg viewBox="0 0 300 430" preserveAspectRatio="none" style="position:absolute;inset:-12px;width:calc(100% + 24px);height:calc(100% + 24px);overflow:visible;">
        <path data-arch="" pathLength="1" d="M0 430 L0 150 A150 150 0 0 1 300 150 L300 430" style="fill:none;stroke:#c6a15b;stroke-width:1.3;vector-effect:non-scaling-stroke;stroke-dasharray:1;stroke-dashoffset:1;"></path>
      </svg>
      <div data-photo="" style="position:absolute;inset:0;border-radius:999px 999px 0 0;overflow:hidden;">
        <div data-pz="" style="position:absolute;inset:0;">
          <image-slot id="c03-foto" shape="rect" placeholder="Foto do casal" style="width:100%;height:100%;"></image-slot>
        </div>
        <div data-sheen="" style="position:absolute;top:0;bottom:0;left:0;width:55%;pointer-events:none;background:linear-gradient(100deg,rgba(255,250,240,0),rgba(255,246,226,.55),rgba(255,250,240,0));transform:translateX(-120%);"></div>
      </div>
    </div>
    <div data-in="" style="position:relative;font-family:{{ t.headFont }};font-style:italic;font-size:clamp(20px,5.4vw,24px);color:#7a6270;">Encontramos o nosso conto de fadas um no outro.</div>
  </section>

  <section data-scene="4" data-screen-label="05 Data" style="position:absolute;inset:0;z-index:1;visibility:hidden;background:#f6e8e3;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:22px;padding:72px clamp(28px,8vw,48px);box-sizing:border-box;text-align:center;">
    <div data-in="" style="font-size:11px;font-weight:600;letter-spacing:.34em;text-transform:uppercase;color:#9c5265;">Guarde esta data</div>
    <svg viewBox="0 0 200 200" style="width:min(200px,52vw);height:auto;overflow:visible;">
      <circle data-dial="" cx="100" cy="100" r="92" pathLength="1" style="fill:#fbf3ef;stroke:#c6a15b;stroke-width:1.4;stroke-dasharray:1;stroke-dashoffset:1;"></circle>
      <circle cx="100" cy="100" r="84" style="fill:none;stroke:rgba(198,161,91,.45);stroke-width:.8;"></circle>
      <g data-ticks="" style="opacity:0;">
        <sc-for list="{{ ticks }}" as="k" hint-placeholder-count="12">
          <line x1="{{ k.x1 }}" y1="{{ k.y1 }}" x2="{{ k.x2 }}" y2="{{ k.y2 }}" style="stroke:#3a2433;stroke-width:{{ k.w }};stroke-linecap:round;"></line>
        </sc-for>
      </g>
      <g data-hand="h" style="transform-box:view-box;transform-origin:100px 100px;">
        <path d="M100 108 L100 54" style="stroke:#3a2433;stroke-width:3.4;stroke-linecap:round;"></path>
      </g>
      <g data-hand="m" style="transform-box:view-box;transform-origin:100px 100px;">
        <path d="M100 112 L100 30" style="stroke:#9c5265;stroke-width:2;stroke-linecap:round;"></path>
        <path d="M100 30 L104 40 L100 46 L96 40 Z" style="fill:#9c5265;"></path>
      </g>
      <circle cx="100" cy="100" r="5" style="fill:#c6a15b;"></circle>
    </svg>
    <div data-in="" style="font-family:{{ t.headFont }};font-weight:{{ t.headWeight }};font-style:{{ t.headStyle }};text-transform:{{ t.headTT }};letter-spacing:{{ t.headLSsoft }};font-size:{{ t.headSize }};line-height:1.12;">{{ dt.full }}</div>
    <div data-in="" style="display:flex;align-items:center;gap:14px;font-size:13px;font-weight:600;letter-spacing:.26em;text-transform:uppercase;">
      <span>{{ dt.weekday }}</span><span style="width:4px;height:4px;border-radius:50%;background:#9c5265;"></span><span>às {{ dt.time }}</span>
    </div>
  </section>

  <section data-scene="5" data-screen-label="06 Local" style="position:absolute;inset:0;z-index:1;visibility:hidden;background:#fbf3ef;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:20px;padding:72px clamp(28px,8vw,48px);box-sizing:border-box;text-align:center;">
    <svg viewBox="-6 -14 312 192" style="width:min(300px,78vw);height:auto;overflow:visible;">
      <path data-castle="" pathLength="1" d="M30 170 L30 90 L22 90 L40 50 L58 90 L50 90 L50 120 L80 120 L80 110 L88 110 L88 120 L96 120 L96 110 L104 110 L104 120 L112 120 L112 70 L104 70 L150 10 L196 70 L188 70 L188 120 L196 120 L196 110 L204 110 L204 120 L212 120 L212 110 L220 110 L220 120 L250 120 L250 90 L242 90 L260 50 L278 90 L270 90 L270 170" style="fill:rgba(198,161,91,0);stroke:#c6a15b;stroke-width:1.5;stroke-linejoin:round;stroke-dasharray:1;stroke-dashoffset:1;"></path>
      <path data-castle="" pathLength="1" d="M0 170 L300 170" style="fill:none;stroke:#c6a15b;stroke-width:1.2;stroke-dasharray:1;stroke-dashoffset:1;"></path>
      <path data-castle="" pathLength="1" d="M135 170 L135 142 A15 15 0 0 1 165 142 L165 170" style="fill:none;stroke:#c6a15b;stroke-width:1.3;stroke-dasharray:1;stroke-dashoffset:1;"></path>
      <path data-castle="" pathLength="1" d="M145 86 L145 76 A5 5 0 0 1 155 76 L155 86 Z M36 140 L36 130 A4 4 0 0 1 44 130 L44 140 Z M256 140 L256 130 A4 4 0 0 1 264 130 L264 140 Z" style="fill:none;stroke:#c6a15b;stroke-width:1.1;stroke-dasharray:1;stroke-dashoffset:1;"></path>
      <g data-flags="" style="opacity:0;">
        <path d="M40 50 L40 34" style="stroke:#c6a15b;stroke-width:1.1;"></path><path data-flag="" d="M40 34 Q47 36 52 35 Q47 39 40 41 Z" style="fill:#d98b98;"></path>
        <path d="M260 50 L260 34" style="stroke:#c6a15b;stroke-width:1.1;"></path><path data-flag="" d="M260 34 Q267 36 272 35 Q267 39 260 41 Z" style="fill:#d98b98;"></path>
        <path d="M150 10 L150 -8" style="stroke:#c6a15b;stroke-width:1.1;"></path><path data-flag="" d="M150 -8 Q158 -6 164 -7 Q158 -3 150 -1 Z" style="fill:#d98b98;"></path>
      </g>
    </svg>
    <div data-in="" style="font-size:11px;font-weight:600;letter-spacing:.34em;text-transform:uppercase;color:#9c5265;">Onde o nosso conto acontece</div>
    <div data-in="" style="max-width:400px;font-family:{{ t.headFont }};font-weight:{{ t.headWeight }};font-style:{{ t.headStyle }};text-transform:{{ t.headTT }};letter-spacing:{{ t.headLSsoft }};font-size:{{ t.headSize }};line-height:1.12;text-wrap:balance;">Palácio das Rosas</div>
    <div data-in="" style="display:flex;flex-direction:column;gap:6px;color:#7a6270;line-height:1.6;">
      <span>Rua X, 123</span>
      <span>Petrópolis · RJ</span>
    </div>
  </section>

  <section data-scene="6" data-screen-label="07 Final" style="position:absolute;inset:0;z-index:1;visibility:hidden;background:radial-gradient(ellipse at 50% 30%,#6b4560,#2e1b2e 75%);color:#f6ece6;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:20px;padding:72px clamp(28px,8vw,48px);box-sizing:border-box;text-align:center;overflow:hidden;">
    <sc-for list="{{ stars6 }}" as="s" hint-placeholder-count="30">
      <span data-star="" style="position:absolute;left:{{ s.x }};top:{{ s.y }};width:{{ s.z }};height:{{ s.z }};border-radius:50%;background:#fff3dc;box-shadow:0 0 6px rgba(255,236,200,.8);opacity:{{ s.o }};"></span>
    </sc-for>
    <span data-shoot="" style="position:absolute;left:12%;top:16%;width:120px;height:1.5px;border-radius:2px;background:linear-gradient(90deg,rgba(255,243,220,0),#fff3dc);transform:rotate(18deg);opacity:0;"></span>
    <div data-in="" style="position:relative;max-width:320px;font-family:{{ t.headFont }};font-style:italic;font-size:clamp(22px,6vw,28px);line-height:1.35;color:#e6cf9a;text-wrap:balance;">E o nosso felizes para sempre começa aqui.</div>
    <div data-in="" style="position:relative;font-family:{{ t.nameFont }};font-weight:{{ t.nameWeight }};font-style:{{ t.nameStyle }};text-transform:{{ t.nameTT }};letter-spacing:{{ t.nameLS }};font-size:{{ t.nameSizeSm }};line-height:{{ t.nameLH }};">{{ n1 }} <span style="color:#e6cf9a;">&amp;</span> {{ n2 }}</div>
    <p data-in="" style="position:relative;margin:0;max-width:320px;line-height:1.7;opacity:.88;text-wrap:pretty;">Todos os detalhes do nosso grande dia estão no nosso site.</p>
    <a data-in="" href="{{ siteUrl }}" target="_blank" rel="noopener" style="position:relative;margin-top:8px;display:inline-flex;align-items:center;gap:12px;padding:18px 30px;border-radius:999px;background:linear-gradient(135deg,#f1d9a4,#c6a15b);color:#3a2433;font-size:11px;font-weight:600;letter-spacing:.24em;text-transform:uppercase;box-shadow:0 14px 30px -14px rgba(0,0,0,.6);">Ver o site do casal <span>→</span></a>
  </section>

  <svg data-ov="" style="position:absolute;inset:0;z-index:5;width:100%;height:100%;pointer-events:none;overflow:visible;">
    <path data-ovp="wide" d="" style="fill:none;stroke:rgba(230,207,154,.35);stroke-width:7;"></path>
    <path data-ovp="thin" d="" style="fill:none;stroke:#e6cf9a;stroke-width:1.6;"></path>
  </svg>
  <div data-spark="" style="position:absolute;inset:0;z-index:6;pointer-events:none;overflow:hidden;"></div>

  <div style="position:absolute;left:0;right:0;bottom:clamp(24px,4vh,38px);z-index:7;display:flex;flex-direction:column;align-items:center;gap:10px;pointer-events:none;opacity:{{ hintOp }};transition:opacity .6s ease;">
    <span style="font-size:10px;font-weight:600;letter-spacing:.28em;text-transform:uppercase;color:#9c5265;">Toque para continuar</span>
    <div style="display:flex;gap:6px;">
      <sc-for list="{{ dots }}" as="d" hint-placeholder-count="7">
        <span style="width:{{ d.w }};height:3px;border-radius:3px;background:{{ d.bg }};transition:width .5s ease, background .5s ease;"></span>
      </sc-for>
    </div>
  </div>

</div>`;
