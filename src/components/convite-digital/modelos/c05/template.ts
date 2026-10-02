// A marcação do Convite 05, copiada LITERAL de design_handoff_convites/Convite 05.dc.html
// (entre </helmet> e o <script>) por ferramentas/convites/extrair.mjs. Não editar à mão
// além das trocas declaradas em modelo.ts.

export const TEMPLATE = String.raw`<div data-root="" style="position:relative;height:100svh;overflow:hidden;background:#1a130e;color:#3b2a1a;font-family:{{ t.textFont }};font-size:{{ t.textSize }};font-weight:{{ t.textWeight }};cursor:pointer;user-select:none;-webkit-user-select:none;">

  <section data-scene="0" data-screen-label="01 Capa" style="position:absolute;inset:0;z-index:0;background:radial-gradient(ellipse at 50% 48%,#3a2a1e,#140e0a 72%);color:#ecdcbc;text-align:center;">
    <div data-o="" style="position:absolute;left:0;right:0;top:max(6svh,28px);display:flex;flex-direction:column;align-items:center;gap:10px;">
      <span style="font-size:11px;font-weight:400;letter-spacing:.36em;text-transform:uppercase;color:#c9a46a;">Você recebeu um convite</span>
    </div>
    <div data-stackwrap="" style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;">
      <div style="position:relative;height:min(60svh,100vw);aspect-ratio:3/4.1;">
        <div data-leather="" style="position:absolute;left:0;top:0;right:-14px;bottom:-14px;border-radius:4px 12px 12px 4px;background-color:#3e2a1c;box-shadow:0 34px 70px -18px rgba(0,0,0,.85);"></div>
        <div style="position:absolute;right:-9px;top:2%;bottom:-6px;width:12px;border-radius:0 6px 6px 0;background:repeating-linear-gradient(90deg,#dcc596 0 2px,#b99c68 2px 3px);"></div>
        <div style="position:absolute;left:3%;right:-6px;bottom:-9px;height:12px;border-radius:0 0 6px 6px;background:repeating-linear-gradient(0deg,#dcc596 0 2px,#b99c68 2px 3px);"></div>
      </div>
    </div>
    <div data-o="" style="position:absolute;left:0;right:0;bottom:max(6svh,28px);display:flex;flex-direction:column;align-items:center;gap:10px;">
      <span style="font-family:{{ t.headFont }};font-style:italic;font-size:clamp(18px,2.2vw,22px);">Toque para abrir o livro</span>
      <span style="width:1px;height:22px;background:#c9a46a;"></span>
    </div>
  </section>

  <section data-scene="1" data-screen-label="02 Nomes" data-paper="" style="position:absolute;inset:0;z-index:3;visibility:hidden;background-color:#e8d5ac;box-shadow:inset 0 0 160px rgba(95,55,18,.7), inset 0 0 50px rgba(85,48,15,.6), inset 0 0 10px rgba(60,32,10,.7);">
    <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:min(22px,2.6svh);padding:min(72px,8svh) clamp(32px,9vw,56px) max(90px,12svh);box-sizing:border-box;text-align:center;">
      <div data-ink="" style="font-size:11px;font-weight:700;letter-spacing:.38em;text-transform:uppercase;color:#7a4e2a;">Capítulo I</div>
      <svg viewBox="0 0 160 12" style="width:min(130px,34vw);height:auto;overflow:visible;">
        <path data-draw="" pathLength="1" d="M0 6 L64 6" style="fill:none;stroke:#9a7440;stroke-width:1;stroke-dasharray:1;stroke-dashoffset:1;"></path>
        <path data-draw="" pathLength="1" d="M160 6 L96 6" style="fill:none;stroke:#9a7440;stroke-width:1;stroke-dasharray:1;stroke-dashoffset:1;"></path>
        <path data-in="" d="M80 1 C84 4 84 8 80 11 C76 8 76 4 80 1 Z M70 6 A2 2 0 1 0 70.01 6 M90 6 A2 2 0 1 0 90.01 6" style="fill:#9a7440;"></path>
      </svg>
      <div data-in="" style="display:flex;flex-direction:column;align-items:center;gap:6px;">
        <sc-if value="{{ modeNames }}" hint-placeholder-val="{{ true }}">
          <h1 style="margin:0;display:flex;flex-direction:column;align-items:center;font-weight:{{ t.nameWeight }};font-family:{{ t.nameFont }};font-style:{{ t.nameStyle }};text-transform:{{ t.nameTT }};letter-spacing:{{ t.nameLS }};font-size:{{ t.nameSize }};line-height:{{ t.nameLH }};">
            <span>{{ n1 }}</span>
            <span style="font-family:{{ t.headFont }};font-style:italic;font-weight:400;text-transform:none;letter-spacing:0;font-size:.42em;line-height:1.5;color:#7a4e2a;">&amp;</span>
            <span>{{ n2 }}</span>
          </h1>
        </sc-if>
        <sc-if value="{{ modeInitials }}" hint-placeholder-val="{{ false }}">
          <div style="display:flex;align-items:center;gap:.22em;font-family:{{ t.nameFont }};font-weight:{{ t.nameWeight }};font-style:{{ t.nameStyle }};font-size:{{ t.initSize }};line-height:1;"><span>{{ i1 }}</span><span style="width:1px;height:.7em;background:#9a7440;"></span><span>{{ i2 }}</span></div>
        </sc-if>
        <sc-if value="{{ modeBoth }}" hint-placeholder-val="{{ false }}">
          <div style="display:flex;align-items:center;gap:.22em;font-family:{{ t.nameFont }};font-weight:{{ t.nameWeight }};font-style:{{ t.nameStyle }};font-size:{{ t.initSizeSm }};line-height:1;"><span>{{ i1 }}</span><span style="width:1px;height:.7em;background:#9a7440;"></span><span>{{ i2 }}</span></div>
          <div style="font-family:{{ t.nameFont }};font-weight:{{ t.nameWeight }};font-style:{{ t.nameStyle }};text-transform:{{ t.nameTT }};letter-spacing:{{ t.nameLS }};font-size:{{ t.nameSizeSm }};line-height:{{ t.nameLH }};">{{ n1 }} &amp; {{ n2 }}</div>
        </sc-if>
      </div>
      <div data-in="" style="max-width:290px;font-family:{{ t.headFont }};font-style:italic;font-size:clamp(18px,4.8vw,21px);line-height:1.5;color:#5a3f26;text-wrap:balance;">convidam você para o capítulo mais bonito da nossa história</div>
    </div>
  </section>

  <section data-scene="2" data-screen-label="03 Frase" data-paper="" style="position:absolute;inset:0;z-index:1;visibility:hidden;background-color:#e6d2a7;box-shadow:inset 0 0 160px rgba(95,55,18,.7), inset 0 0 50px rgba(85,48,15,.6), inset 0 0 10px rgba(60,32,10,.7);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:28px;padding:72px clamp(34px,10vw,60px) max(90px,12svh);box-sizing:border-box;">
    <div data-ink="" style="font-size:11px;font-weight:700;letter-spacing:.38em;text-transform:uppercase;color:#7a4e2a;">Capítulo II</div>
    <p style="margin:0;max-width:400px;font-family:{{ t.headFont }};font-weight:{{ t.headWeight }};font-size:clamp(22px,5.8vw,28px);line-height:1.5;text-align:left;">
      <span data-cap="" style="float:left;font-family:{{ t.headFont }};font-size:3.4em;line-height:.82;padding:.08em .12em 0 0;color:#7a4e2a;">{{ cap }}</span>
      <sc-for list="{{ words }}" as="w" hint-placeholder-count="14">
        <span data-w="" style="display:inline-block;margin-right:.26em;">{{ w }}</span>
      </sc-for>
    </p>
    <svg viewBox="0 0 120 2" style="width:80px;height:2px;overflow:visible;"><path data-draw="" pathLength="1" d="M0 1 L120 1" style="fill:none;stroke:#9a7440;stroke-width:1;stroke-dasharray:1;stroke-dashoffset:1;"></path></svg>
  </section>

  <section data-scene="3" data-screen-label="04 Foto" data-paper="" style="position:absolute;inset:0;z-index:1;visibility:hidden;background-color:#e8d5ac;box-shadow:inset 0 0 160px rgba(95,55,18,.7), inset 0 0 50px rgba(85,48,15,.6), inset 0 0 10px rgba(60,32,10,.7);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:min(26px,3svh);padding:64px 28px max(90px,12svh);box-sizing:border-box;text-align:center;">
    <div data-ink="" style="font-size:11px;font-weight:700;letter-spacing:.38em;text-transform:uppercase;color:#7a4e2a;">Capítulo III</div>
    <div data-pin="" style="position:relative;height:min(48svh,92vw);aspect-ratio:4/5;transform:rotate(-2deg);">
      <div style="position:absolute;inset:-10px;background:#f3e8cf;box-shadow:0 10px 24px -12px rgba(60,35,15,.55);"></div>
      <div data-photo="" style="position:absolute;inset:0;overflow:hidden;">
        <image-slot id="c05-foto" shape="rect" placeholder="Foto do casal" style="width:100%;height:100%;"></image-slot>
      </div>
      <span style="position:absolute;left:-16px;top:-16px;width:36px;height:36px;background:#2e2117;clip-path:polygon(0 0,100% 0,0 100%);"></span>
      <span style="position:absolute;right:-16px;top:-16px;width:36px;height:36px;background:#2e2117;clip-path:polygon(0 0,100% 0,100% 100%);"></span>
      <span style="position:absolute;right:-16px;bottom:-16px;width:36px;height:36px;background:#2e2117;clip-path:polygon(100% 0,100% 100%,0 100%);"></span>
      <span style="position:absolute;left:-16px;bottom:-16px;width:36px;height:36px;background:#2e2117;clip-path:polygon(0 0,100% 100%,0 100%);"></span>
    </div>
    <div data-in="" style="font-family:{{ t.headFont }};font-style:italic;font-size:clamp(19px,5vw,22px);color:#5a3f26;">Guardamos esta página para sempre.</div>
  </section>

  <section data-scene="4" data-screen-label="05 Data" data-paper="" style="position:absolute;inset:0;z-index:1;visibility:hidden;background-color:#e6d2a7;box-shadow:inset 0 0 160px rgba(95,55,18,.7), inset 0 0 50px rgba(85,48,15,.6), inset 0 0 10px rgba(60,32,10,.7);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:min(18px,2.2svh);padding:72px clamp(28px,8vw,48px) max(90px,12svh);box-sizing:border-box;text-align:center;">
    <div data-ink="" style="font-size:11px;font-weight:700;letter-spacing:.38em;text-transform:uppercase;color:#7a4e2a;">Capítulo IV · A data</div>
    <div data-in="" style="font-size:12px;letter-spacing:.3em;text-transform:uppercase;color:#5a3f26;">{{ dt.weekday }}</div>
    <div style="display:flex;align-items:center;gap:clamp(14px,4vw,22px);">
      <svg viewBox="0 0 60 2" style="width:clamp(40px,12vw,60px);height:2px;overflow:visible;"><path data-draw="" pathLength="1" d="M60 1 L0 1" style="fill:none;stroke:#9a7440;stroke-width:1;stroke-dasharray:1;stroke-dashoffset:1;"></path></svg>
      <div data-ink="" style="font-family:{{ t.headFont }};font-weight:{{ t.headWeight }};font-size:min(clamp(84px,26vw,124px),15svh);line-height:1.05;">{{ dt.day }}</div>
      <svg viewBox="0 0 60 2" style="width:clamp(40px,12vw,60px);height:2px;overflow:visible;"><path data-draw="" pathLength="1" d="M0 1 L60 1" style="fill:none;stroke:#9a7440;stroke-width:1;stroke-dasharray:1;stroke-dashoffset:1;"></path></svg>
    </div>
    <div data-in="" style="font-family:{{ t.headFont }};font-style:italic;font-weight:{{ t.headWeight }};font-size:{{ t.headSize }};line-height:1.15;">de {{ dt.month }} de {{ dt.year }}</div>
    <div data-in="" style="font-size:12px;letter-spacing:.3em;text-transform:uppercase;color:#5a3f26;">às {{ dt.time }}</div>
  </section>

  <section data-scene="5" data-screen-label="06 Local" data-paper="" style="position:absolute;inset:0;z-index:1;visibility:hidden;background-color:#e8d5ac;box-shadow:inset 0 0 160px rgba(95,55,18,.7), inset 0 0 50px rgba(85,48,15,.6), inset 0 0 10px rgba(60,32,10,.7);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:20px;padding:72px clamp(28px,8vw,48px) max(90px,12svh);box-sizing:border-box;text-align:center;">
    <div data-ink="" style="font-size:11px;font-weight:700;letter-spacing:.38em;text-transform:uppercase;color:#7a4e2a;">Capítulo V · O lugar</div>
    <svg viewBox="0 0 240 90" style="width:min(240px,64vw);height:auto;overflow:visible;">
      <defs>
        <mask id="c05m" maskUnits="userSpaceOnUse" x="-10" y="-10" width="260" height="110">
          <path data-draw="" pathLength="1" d="M12 72 C60 12 110 92 150 42 S210 30 222 22" style="fill:none;stroke:#fff;stroke-width:8;stroke-dasharray:1;stroke-dashoffset:1;"></path>
        </mask>
      </defs>
      <circle cx="12" cy="72" r="3.5" style="fill:#7a4e2a;"></circle>
      <path d="M12 72 C60 12 110 92 150 42 S210 30 222 22" mask="url(#c05m)" style="fill:none;stroke:#7a4e2a;stroke-width:1.6;stroke-dasharray:2 6;stroke-linecap:round;"></path>
      <g data-x="" style="opacity:0;"><path d="M214 14 L230 30 M230 14 L214 30" style="stroke:#7a4e2a;stroke-width:2.2;stroke-linecap:round;"></path></g>
    </svg>
    <div data-ink="" style="max-width:400px;font-family:{{ t.headFont }};font-weight:{{ t.headWeight }};font-style:{{ t.headStyle }};text-transform:{{ t.headTT }};letter-spacing:{{ t.headLSsoft }};font-size:{{ t.headSize }};line-height:1.12;text-wrap:balance;">Fazenda Santa Clara</div>
    <div data-in="" style="display:flex;flex-direction:column;gap:6px;color:#5a3f26;line-height:1.6;">
      <span>Estrada X, 123</span>
      <span>Tiradentes · MG</span>
    </div>
  </section>

  <section data-scene="6" data-screen-label="07 Contracapa" data-leather="" style="position:absolute;inset:0;z-index:1;visibility:hidden;background-color:#3e2a1c;box-shadow:inset 0 0 80px rgba(0,0,0,.55);color:#ecdcbc;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:20px;padding:72px clamp(28px,8vw,48px);box-sizing:border-box;text-align:center;">
    <div style="position:absolute;inset:18px;border:1px solid rgba(0,0,0,.4);box-shadow:0 1px 0 rgba(230,190,140,.12), inset 0 1px 0 rgba(230,190,140,.12);pointer-events:none;"></div>
    <div data-in="" style="max-width:320px;font-family:{{ t.headFont }};font-style:italic;font-size:clamp(22px,6vw,28px);line-height:1.35;color:#d9b97f;text-wrap:balance;">Esta história continua no nosso site.</div>
    <div data-in="" style="font-family:{{ t.nameFont }};font-weight:{{ t.nameWeight }};font-style:{{ t.nameStyle }};text-transform:{{ t.nameTT }};letter-spacing:{{ t.nameLS }};font-size:{{ t.nameSizeSm }};line-height:{{ t.nameLH }};text-shadow:0 -1px 0 rgba(0,0,0,.5);">{{ n1 }} <span style="color:#d9b97f;">&amp;</span> {{ n2 }}</div>
    <p data-in="" style="margin:0;max-width:320px;line-height:1.7;opacity:.88;text-wrap:pretty;">Todos os detalhes do nosso grande dia estão lá.</p>
    <a data-in="" href="{{ siteUrl }}" target="_blank" rel="noopener" style="margin-top:8px;display:inline-flex;align-items:center;gap:12px;padding:17px 30px;border:1px solid #c9a46a;color:#ecdcbc;font-size:11px;letter-spacing:.26em;text-transform:uppercase;background:rgba(201,164,106,.1);">Ver o site do casal <span style="color:#d9b97f;">→</span></a>
  </section>

  <div data-coverwrap="" style="position:absolute;inset:0;z-index:4;pointer-events:none;display:flex;align-items:center;justify-content:center;perspective:1800px;">
    <div data-book="" style="position:relative;height:min(60svh,100vw);aspect-ratio:3/4.1;">
      <div data-cover="" style="position:absolute;inset:0;transform-origin:left center;transform-style:preserve-3d;">
        <div data-leather="" style="position:absolute;inset:0;backface-visibility:hidden;-webkit-backface-visibility:hidden;border-radius:4px 12px 12px 4px;background-color:#4b3323;box-shadow:inset 0 0 34px rgba(0,0,0,.55), inset -2px 0 0 rgba(0,0,0,.3);overflow:hidden;">
          <svg style="position:absolute;left:7px;top:9%;width:20px;height:82%;">
            <defs><pattern id="c05x" width="20" height="26" patternUnits="userSpaceOnUse"><path d="M4 4 L16 22 M16 4 L4 22" style="stroke:#a87048;stroke-width:2.4;stroke-linecap:round;"></path></pattern></defs>
            <rect width="100%" height="100%" style="fill:url(#c05x);"></rect>
          </svg>
          <div style="position:absolute;left:34px;top:0;bottom:0;width:2px;background:rgba(0,0,0,.35);box-shadow:1px 0 0 rgba(230,190,140,.1);"></div>
          <div style="position:absolute;top:8%;bottom:8%;left:calc(34px + 8%);right:8%;border:1px solid rgba(0,0,0,.42);box-shadow:0 1px 0 rgba(230,190,140,.13), inset 0 1px 0 rgba(230,190,140,.13);"></div>
          <div style="position:absolute;top:17%;left:34px;right:0;display:flex;flex-direction:column;align-items:center;gap:14px;">
            <div style="display:flex;align-items:center;gap:.2em;font-family:{{ t.nameFont }};font-weight:{{ t.nameWeight }};font-style:{{ t.nameStyle }};font-size:{{ t.monoSize }};line-height:1.1;color:#2f1f15;text-shadow:0 1px 0 rgba(230,190,140,.2), 0 -1px 0 rgba(0,0,0,.55);"><span>{{ i1 }}</span><span style="width:1px;height:.6em;background:rgba(0,0,0,.45);box-shadow:1px 0 0 rgba(230,190,140,.15);"></span><span>{{ i2 }}</span></div>
            <div style="font-size:10px;letter-spacing:.34em;color:#2f1f15;text-shadow:0 1px 0 rgba(230,190,140,.2);">{{ dt.short }}</div>
          </div>
          <div data-cshade="" style="position:absolute;inset:0;background:#000;opacity:0;"></div>
        </div>
        <div data-paper="" style="position:absolute;inset:0;backface-visibility:hidden;-webkit-backface-visibility:hidden;transform:rotateY(180deg);border-radius:12px 4px 4px 12px;background-color:#d6bf92;box-shadow:inset 0 0 0 9px #3e2a1c, inset 0 0 40px 9px rgba(90,55,20,.5);"></div>
        <div data-strap="" style="position:absolute;left:-3%;right:-7%;top:58%;height:12%;">
          <div data-leather="" style="position:absolute;inset:0;border-radius:3px;background-color:#33221a;box-shadow:0 4px 8px rgba(0,0,0,.5), inset 0 1px 0 rgba(230,190,140,.12), inset 0 -1px 0 rgba(0,0,0,.4);"></div>
          <div data-leather="" style="position:absolute;left:44%;width:22%;top:-14%;bottom:-14%;border-radius:4px;background-color:#4f3626;box-shadow:0 3px 6px rgba(0,0,0,.5), inset 0 1px 0 rgba(230,190,140,.14);display:flex;align-items:center;justify-content:space-between;padding:0 12%;box-sizing:border-box;">
            <span style="width:9px;height:9px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#e3c48a,#9a7440 60%,#5e4423);box-shadow:0 1px 2px rgba(0,0,0,.6);"></span>
            <span style="width:9px;height:9px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#e3c48a,#9a7440 60%,#5e4423);box-shadow:0 1px 2px rgba(0,0,0,.6);"></span>
          </div>
          <div data-key="" style="position:absolute;left:55%;top:60%;width:clamp(26px,7vw,34px);margin-left:calc(clamp(26px,7vw,34px) / -2);transform-origin:50% 8%;">
            <svg viewBox="0 0 40 100" style="display:block;width:100%;height:auto;overflow:visible;filter:drop-shadow(0 3px 3px rgba(0,0,0,.55));">
              <defs><linearGradient id="c05k" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#e3c48a"></stop><stop offset=".5" stop-color="#a9844e"></stop><stop offset="1" stop-color="#6b4e28"></stop></linearGradient></defs>
              <circle cx="20" cy="16" r="11" style="fill:none;stroke:url(#c05k);stroke-width:4.5;"></circle>
              <circle cx="20" cy="16" r="3.6" style="fill:url(#c05k);"></circle>
              <path d="M20 27 L20 88" style="stroke:url(#c05k);stroke-width:5;stroke-linecap:round;"></path>
              <path d="M18 34 L22 34 M17 40 L23 40" style="stroke:#6b4e28;stroke-width:1.4;"></path>
              <path d="M22 70 L31 70 L31 76 L26 76 L26 81 L31 81 L31 88 L22 88 Z" style="fill:url(#c05k);"></path>
            </svg>
          </div>
        </div>
      </div>
    </div>
  </div>

  <svg style="position:absolute;inset:0;z-index:5;width:100%;height:100%;pointer-events:none;overflow:visible;">
    <defs>
      <linearGradient id="c05g" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#c4a979"></stop>
        <stop offset=".42" stop-color="#efe0bd"></stop>
        <stop offset="1" stop-color="#d9c294"></stop>
      </linearGradient>
      <filter id="c05s" x="-50%" y="-50%" width="200%" height="200%">
        <feDropShadow dx="-3" dy="-2" stdDeviation="8" flood-color="#2a1a0e" flood-opacity=".4"></feDropShadow>
      </filter>
    </defs>
    <path data-flapov="" d="" style="fill:url(#c05g);stroke:rgba(110,70,30,.45);stroke-width:1;stroke-linejoin:round;filter:url(#c05s);"></path>
  </svg>

  <div style="position:absolute;left:0;right:0;bottom:clamp(30px,4.6vh,44px);z-index:7;display:flex;flex-direction:column;align-items:center;gap:10px;pointer-events:none;opacity:{{ hintOp }};transition:opacity .6s ease;">
    <span style="font-size:10px;letter-spacing:.28em;text-transform:uppercase;color:#6b4a2b;">Toque para virar a página</span>
    <div style="display:flex;gap:6px;">
      <sc-for list="{{ dots }}" as="d" hint-placeholder-count="7">
        <span style="width:{{ d.w }};height:3px;border-radius:3px;background:{{ d.bg }};transition:width .5s ease, background .5s ease;"></span>
      </sc-for>
    </div>
  </div>

</div>`;
