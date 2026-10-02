// A marcação do Convite 08, copiada LITERAL de design_handoff_convites/Convite 08.dc.html
// (entre </helmet> e o <script>) por ferramentas/convites/extrair.mjs. Não editar à mão
// além das trocas declaradas em modelo.ts.

export const TEMPLATE = String.raw`<div data-root="" style="position:relative;height:100svh;overflow:hidden;background:#1a0c10;color:#2f2420;font-family:{{ t.textFont }};font-size:{{ t.textSize }};font-weight:{{ t.textWeight }};cursor:pointer;user-select:none;-webkit-user-select:none;">

  <svg style="position:absolute;width:0;height:0;">
    <defs>
      <filter id="c06rin" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence data-turb="" type="fractalNoise" baseFrequency="0.006 0.05" numOctaves="2" seed="3" result="t"></feTurbulence><feDisplacementMap data-disp="in" in="SourceGraphic" in2="t" scale="0" xChannelSelector="R" yChannelSelector="G"></feDisplacementMap></filter>
      <filter id="c06rout" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence data-turb="" type="fractalNoise" baseFrequency="0.006 0.05" numOctaves="2" seed="9" result="t"></feTurbulence><feDisplacementMap data-disp="out" in="SourceGraphic" in2="t" scale="0" xChannelSelector="R" yChannelSelector="G"></feDisplacementMap></filter>
      <filter id="c06wave" x="-5%" y="-20%" width="110%" height="140%"><feTurbulence data-wturb="" type="fractalNoise" baseFrequency="0.01 0.14" numOctaves="1" seed="5" result="t"></feTurbulence><feDisplacementMap in="SourceGraphic" in2="t" scale="7" xChannelSelector="R" yChannelSelector="G"></feDisplacementMap></filter>
      <clipPath id="c06ogee" clipPathUnits="objectBoundingBox"><path d="M0 1 L0 .4 C0 .26 .22 .22 .36 .14 C.44 .1 .48 .06 .5 0 C.52 .06 .56 .1 .64 .14 C.78 .22 1 .26 1 .4 L1 1 Z"></path></clipPath>
    </defs>
  </svg>

  <section data-scene="0" data-screen-label="01 Abertura" style="position:absolute;inset:0;z-index:5;color:#efe0c4;text-align:center;">
    <div data-cur="l" style="position:absolute;left:0;top:0;bottom:0;width:51%;transform-origin:0 50%;background:repeating-linear-gradient(90deg,#3e0812 0,#7a1626 14px,#a32a38 20px,#7a1626 26px,#3e0812 40px);box-shadow:inset -14px 0 24px rgba(0,0,0,.5);"></div>
    <div data-cur="r" style="position:absolute;right:0;top:0;bottom:0;width:51%;transform-origin:100% 50%;background:repeating-linear-gradient(90deg,#3e0812 0,#7a1626 14px,#a32a38 20px,#7a1626 26px,#3e0812 40px);box-shadow:inset 14px 0 24px rgba(0,0,0,.5);"></div>
    <div data-val="" style="position:absolute;left:0;right:0;top:0;height:78px;">
      <div style="position:absolute;inset:0;background:linear-gradient(180deg,#5a0f1c,#7a1626);box-shadow:0 8px 16px rgba(0,0,0,.5);"></div>
      <div style="position:absolute;left:0;right:0;top:70px;height:22px;background:radial-gradient(circle at 50% 0,#7a1626 0 18px,transparent 19px) 0 0/39px 22px repeat-x;"></div>
      <div style="position:absolute;left:0;right:0;top:76px;height:2px;background:linear-gradient(90deg,#8c6a34,#f3dca6,#8c6a34);"></div>
    </div>
    <div data-glow="" style="position:absolute;left:50%;top:40px;width:420px;height:340px;margin-left:-210px;background:radial-gradient(ellipse at 50% 40%,rgba(255,226,160,.55),rgba(255,210,130,0) 65%);opacity:0;pointer-events:none;"></div>
    <svg data-lus="" viewBox="0 0 200 150" style="position:absolute;left:50%;top:84px;width:min(190px,46vw);transform:translateX(-50%);height:auto;overflow:visible;filter:saturate(.25) brightness(.55);">
      <defs><linearGradient id="c06g2" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f3dca6"></stop><stop offset=".5" stop-color="#c9a15e"></stop><stop offset="1" stop-color="#8c6a34"></stop></linearGradient></defs>
      <path d="M100 -10 L100 30" style="stroke:url(#c06g2);stroke-width:1.5;"></path>
      <path d="M100 30 C70 30 30 50 22 78 M100 30 C130 30 170 50 178 78 M100 30 C84 40 64 60 60 86 M100 30 C116 40 136 60 140 86 M100 30 L100 96" style="fill:none;stroke:url(#c06g2);stroke-width:1.6;"></path>
      <path d="M22 78 C40 94 70 100 100 100 C130 100 160 94 178 78" style="fill:none;stroke:url(#c06g2);stroke-width:1.2;"></path>
      <path data-drop="" d="M22.0 80.0 l-3.4 7 l3.4 8 l3.4 -8 Z" style="fill:#fff6e2;"></path><path data-drop="" d="M35.0 85.7 l-3.4 7 l3.4 8 l3.4 -8 Z" style="fill:#fff6e2;"></path><path data-drop="" d="M48.0 91.0 l-3.4 7 l3.4 8 l3.4 -8 Z" style="fill:#fff6e2;"></path><path data-drop="" d="M61.0 95.6 l-3.4 7 l3.4 8 l3.4 -8 Z" style="fill:#fff6e2;"></path><path data-drop="" d="M74.0 99.1 l-3.4 7 l3.4 8 l3.4 -8 Z" style="fill:#fff6e2;"></path><path data-drop="" d="M87.0 101.3 l-3.4 7 l3.4 8 l3.4 -8 Z" style="fill:#fff6e2;"></path><path data-drop="" d="M100.0 102.0 l-3.4 7 l3.4 8 l3.4 -8 Z" style="fill:#fff6e2;"></path><path data-drop="" d="M113.0 101.3 l-3.4 7 l3.4 8 l3.4 -8 Z" style="fill:#fff6e2;"></path><path data-drop="" d="M126.0 99.1 l-3.4 7 l3.4 8 l3.4 -8 Z" style="fill:#fff6e2;"></path><path data-drop="" d="M139.0 95.6 l-3.4 7 l3.4 8 l3.4 -8 Z" style="fill:#fff6e2;"></path><path data-drop="" d="M152.0 91.0 l-3.4 7 l3.4 8 l3.4 -8 Z" style="fill:#fff6e2;"></path><path data-drop="" d="M165.0 85.7 l-3.4 7 l3.4 8 l3.4 -8 Z" style="fill:#fff6e2;"></path><path data-drop="" d="M178.0 80.0 l-3.4 7 l3.4 8 l3.4 -8 Z" style="fill:#fff6e2;"></path>
      <path d="M18 70 l4 -10 l4 10 Z M56 78 l4 -10 l4 10 Z M96 88 l4 -10 l4 10 Z M136 78 l4 -10 l4 10 Z M174 70 l4 -10 l4 10 Z" style="fill:#ffe6a8;"></path>
    </svg>
    <div data-o="" style="position:absolute;left:0;right:0;top:min(46svh,330px);font-size:11px;font-weight:600;letter-spacing:.36em;text-transform:uppercase;color:#d9b97f;">Você recebeu um convite</div>
    <div data-o="" style="position:absolute;left:0;right:0;bottom:max(10svh,44px);display:flex;flex-direction:column;align-items:center;gap:10px;">
      <span style="font-family:{{ t.headFont }};font-style:italic;font-size:clamp(18px,2.2vw,22px);">Toque para abrir as cortinas</span>
      <span style="width:1px;height:24px;background:#d9b97f;"></span>
    </div>
  </section>

  <section data-scene="1" data-screen-label="02 Nomes" style="position:absolute;inset:0;z-index:2;background:radial-gradient(ellipse at 50% 40%,#fbf6ec,#efe3cf 78%);display:flex;align-items:center;justify-content:center;padding:min(56px,7svh) 24px max(96px,13svh);box-sizing:border-box;text-align:center;">
    <div style="position:relative;width:min(340px,84vw);height:100%;max-height:640px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:min(20px,2.4svh);padding:22% 22px 24px;box-sizing:border-box;">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" style="position:absolute;inset:0;width:100%;height:100%;overflow:visible;">
        <path data-draw="" pathLength="1" d="M0 100 L0 40 C0 26 22 22 36 14 C44 10 48 6 50 0 C52 6 56 10 64 14 C78 22 100 26 100 40 L100 100" style="fill:none;stroke:#b48a4a;stroke-width:1.3;vector-effect:non-scaling-stroke;stroke-dasharray:1;stroke-dashoffset:1;"></path>
        <path data-draw="" pathLength="1" d="M3 100 L3 41 C3 28 24 24 37 17 C45 13 48 9 50 4 C52 9 55 13 63 17 C76 24 97 28 97 41 L97 100" style="fill:none;stroke:rgba(180,138,74,.5);stroke-width:1;vector-effect:non-scaling-stroke;stroke-dasharray:1;stroke-dashoffset:1;"></path>
      </svg>
      <div data-in="" style="position:relative;font-size:11px;font-weight:600;letter-spacing:.36em;text-transform:uppercase;color:#7a1626;">Você está convidado</div>
      <div data-in="" style="position:relative;display:flex;flex-direction:column;align-items:center;gap:6px;">
        <sc-if value="{{ modeNames }}" hint-placeholder-val="{{ true }}">
          <h1 style="margin:0;display:flex;flex-direction:column;align-items:center;font-weight:{{ t.nameWeight }};font-family:{{ t.nameFont }};font-style:{{ t.nameStyle }};text-transform:{{ t.nameTT }};letter-spacing:{{ t.nameLS }};font-size:{{ t.nameSize }};line-height:{{ t.nameLH }};">
            <span>{{ n1 }}</span>
            <span style="font-family:{{ t.headFont }};font-style:italic;font-weight:400;text-transform:none;letter-spacing:0;font-size:.42em;line-height:1.5;color:#b48a4a;">&amp;</span>
            <span>{{ n2 }}</span>
          </h1>
        </sc-if>
        <sc-if value="{{ modeInitials }}" hint-placeholder-val="{{ false }}">
          <div style="display:flex;align-items:center;gap:.22em;font-family:{{ t.nameFont }};font-weight:{{ t.nameWeight }};font-style:{{ t.nameStyle }};font-size:{{ t.initSize }};line-height:1;"><span>{{ i1 }}</span><span style="width:1px;height:.7em;background:#b48a4a;"></span><span>{{ i2 }}</span></div>
        </sc-if>
        <sc-if value="{{ modeBoth }}" hint-placeholder-val="{{ false }}">
          <div style="display:flex;align-items:center;gap:.22em;font-family:{{ t.nameFont }};font-weight:{{ t.nameWeight }};font-style:{{ t.nameStyle }};font-size:{{ t.initSizeSm }};line-height:1;"><span>{{ i1 }}</span><span style="width:1px;height:.7em;background:#b48a4a;"></span><span>{{ i2 }}</span></div>
          <div style="font-family:{{ t.nameFont }};font-weight:{{ t.nameWeight }};font-style:{{ t.nameStyle }};text-transform:{{ t.nameTT }};letter-spacing:{{ t.nameLS }};font-size:{{ t.nameSizeSm }};line-height:{{ t.nameLH }};">{{ n1 }} &amp; {{ n2 }}</div>
        </sc-if>
      </div>
      <div data-in="" style="position:relative;max-width:240px;font-family:{{ t.headFont }};font-style:italic;font-size:clamp(18px,4.8vw,21px);line-height:1.5;color:#5a4038;text-wrap:balance;">para celebrar o nosso casamento</div>
    </div>
  </section>

  <section data-scene="2" data-screen-label="03 Frase" style="position:absolute;inset:0;z-index:1;visibility:hidden;background:radial-gradient(ellipse at 50% 45%,#f6ecdc,#e9dcc6 80%);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:30px;padding:72px clamp(32px,9vw,56px) max(96px,13svh);box-sizing:border-box;text-align:center;">
    <div style="display:flex;gap:7px;">
      <sc-for list="{{ tess }}" as="q" hint-placeholder-count="9">
        <span data-tess="" style="width:7px;height:7px;transform:rotate(45deg);background:{{ q.c }};"></span>
      </sc-for>
    </div>
    <p style="margin:0;max-width:420px;display:flex;flex-wrap:wrap;justify-content:center;gap:.08em .3em;font-family:{{ t.headFont }};font-style:italic;font-weight:{{ t.headWeight }};font-size:clamp(25px,6.6vw,34px);line-height:1.38;">
      <sc-for list="{{ words }}" as="w" hint-placeholder-count="14">
        <span data-w="" style="display:inline-block;">{{ w }}</span>
      </sc-for>
    </p>
    <div data-in="" style="font-size:12px;font-weight:600;letter-spacing:.3em;text-transform:uppercase;color:#7a1626;">{{ n1 }} &amp; {{ n2 }}</div>
  </section>

  <section data-scene="3" data-screen-label="04 Foto" style="position:absolute;inset:0;z-index:1;visibility:hidden;background:linear-gradient(180deg,#fbf6ec 0%,#efe3cf 62%,#cfd8dc 62.2%,#b9c7cd 100%);display:flex;flex-direction:column;align-items:center;justify-content:flex-start;padding:max(9svh,48px) 28px 0;box-sizing:border-box;text-align:center;overflow:hidden;">
    <div data-in="" style="font-family:{{ t.headFont }};font-style:italic;font-size:clamp(19px,5vw,22px);color:#5a4038;margin-bottom:min(22px,2.6svh);">Refletidos um no outro.</div>
    <div data-pwrap="" style="position:relative;height:min(46svh,100vw);aspect-ratio:3/4;-webkit-box-reflect:below 2px linear-gradient(transparent 55%,rgba(0,0,0,.4));">
      <div data-photo="" style="position:absolute;inset:0;clip-path:url(#c06ogee);">
        <div data-pz="" style="position:absolute;inset:0;">
          <image-slot id="c08-foto" shape="rect" placeholder="Foto do casal" style="width:100%;height:100%;"></image-slot>
        </div>
      </div>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" style="position:absolute;inset:0;width:100%;height:100%;overflow:visible;">
        <path data-draw="" pathLength="1" d="M0 100 L0 40 C0 26 22 22 36 14 C44 10 48 6 50 0 C52 6 56 10 64 14 C78 22 100 26 100 40 L100 100" style="fill:none;stroke:#b48a4a;stroke-width:2.4;vector-effect:non-scaling-stroke;stroke-dasharray:1;stroke-dashoffset:1;"></path>
      </svg>
    </div>
    <div data-water="" style="position:absolute;left:0;right:0;top:62%;bottom:0;pointer-events:none;background:repeating-linear-gradient(180deg,rgba(255,255,255,0) 0 9px,rgba(255,255,255,.28) 10px,rgba(255,255,255,0) 12px);filter:url(#c06wave);opacity:.8;"></div>
  </section>

  <section data-scene="4" data-screen-label="05 Data" style="position:absolute;inset:0;z-index:1;visibility:hidden;background:radial-gradient(ellipse at 50% 40%,#fbf6ec,#efe3cf 78%);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:min(20px,2.4svh);padding:64px clamp(28px,8vw,48px) max(96px,13svh);box-sizing:border-box;text-align:center;">
    <div data-in="" style="font-size:11px;font-weight:600;letter-spacing:.34em;text-transform:uppercase;color:#7a1626;">Guarde esta data</div>
    <svg data-dial="" viewBox="0 0 200 200" style="width:min(210px,54vw,28svh);height:auto;overflow:visible;">
      <defs>
        <radialGradient id="c06blue" cx="50%" cy="45%" r="60%"><stop offset="0" stop-color="#2d5578"></stop><stop offset="1" stop-color="#14283f"></stop></radialGradient>
        <linearGradient id="c06g3" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f3dca6"></stop><stop offset=".5" stop-color="#c9a15e"></stop><stop offset="1" stop-color="#8c6a34"></stop></linearGradient>
      </defs>
      <circle cx="100" cy="100" r="96" style="fill:#1f3b57;stroke:url(#c06g3);stroke-width:3;"></circle>
      <circle cx="100" cy="100" r="66" style="fill:url(#c06blue);stroke:url(#c06g3);stroke-width:1.4;"></circle>
      <sc-for list="{{ nums }}" as="m" hint-placeholder-count="12">
        <text x="{{ m.x }}" y="{{ m.y }}" style="font-family:'Cormorant Garamond',serif;font-size:13px;font-weight:600;fill:#e6c789;text-anchor:middle;dominant-baseline:central;">{{ m.r }}</text>
      </sc-for>
      <sc-for list="{{ stars }}" as="s" hint-placeholder-count="10">
        <path data-twk="" d="M{{ s.x }} {{ s.y }} l1.4 3.2 l3.4 .3 l-2.6 2.2 l.8 3.3 l-3 -1.8 l-3 1.8 l.8 -3.3 l-2.6 -2.2 l3.4 -.3 Z" style="fill:#e6c789;"></path>
      </sc-for>
      <g data-hand="" style="transform-box:view-box;transform-origin:100px 100px;">
        <path d="M100 108 L100 30" style="stroke:url(#c06g3);stroke-width:2.6;stroke-linecap:round;"></path>
        <path d="M100 22 L104.5 32 L100 36 L95.5 32 Z" style="fill:#f3dca6;"></path>
        <circle cx="100" cy="52" r="8" style="fill:#f3dca6;stroke:#8c6a34;stroke-width:1;"></circle>
      </g>
      <circle cx="100" cy="100" r="5" style="fill:#e6c789;"></circle>
    </svg>
    <div data-in="" style="font-family:{{ t.headFont }};font-weight:{{ t.headWeight }};font-style:{{ t.headStyle }};text-transform:{{ t.headTT }};letter-spacing:{{ t.headLSsoft }};font-size:{{ t.headSize }};line-height:1.12;">{{ dt.full }}</div>
    <div data-in="" style="display:flex;align-items:center;gap:14px;font-size:13px;font-weight:600;letter-spacing:.26em;text-transform:uppercase;">
      <span>{{ dt.weekday }}</span><span style="width:4px;height:4px;transform:rotate(45deg);background:#b48a4a;"></span><span>às {{ dt.time }}</span>
    </div>
  </section>

  <section data-scene="5" data-screen-label="06 Local" style="position:absolute;inset:0;z-index:1;visibility:hidden;background:linear-gradient(180deg,#14223a,#1f3b57 70%,#14223a);color:#efe4d2;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:20px;padding:56px clamp(28px,8vw,48px) max(96px,13svh);box-sizing:border-box;text-align:center;">
    <svg viewBox="0 0 200 170" style="width:min(180px,46vw,24svh);height:auto;overflow:visible;">
      <defs><radialGradient id="c06glow"><stop offset="0" stop-color="rgba(255,214,140,.75)"></stop><stop offset="1" stop-color="rgba(255,214,140,0)"></stop></radialGradient></defs>
      <circle data-flame="" cx="100" cy="56" r="52" style="fill:url(#c06glow);"></circle>
      <path d="M100 0 L100 18" style="stroke:#c9a15e;stroke-width:1.4;"></path>
      <path d="M88 26 L112 26 L106 18 L94 18 Z" style="fill:#c9a15e;"></path>
      <rect x="86" y="26" width="28" height="54" style="fill:rgba(255,226,170,.22);stroke:#c9a15e;stroke-width:1.6;"></rect>
      <path d="M100 26 L100 80 M86 53 L114 53" style="stroke:rgba(201,161,94,.6);stroke-width:.8;"></path>
      <ellipse data-flame="" cx="100" cy="58" rx="5" ry="9" style="fill:#ffe1a0;"></ellipse>
      <path d="M84 80 L116 80 L110 88 L90 88 Z" style="fill:#c9a15e;"></path>
      <path data-draw="" pathLength="1" d="M10 112 Q35 104 60 112 T110 112 T160 112 T210 112" style="fill:none;stroke:#c9a15e;stroke-width:1.2;stroke-dasharray:1;stroke-dashoffset:1;"></path>
      <path data-draw="" pathLength="1" d="M-10 130 Q15 122 40 130 T90 130 T140 130 T190 130" style="fill:none;stroke:rgba(201,161,94,.7);stroke-width:1;stroke-dasharray:1;stroke-dashoffset:1;"></path>
      <path data-draw="" pathLength="1" d="M20 148 Q45 140 70 148 T120 148 T170 148 T220 148" style="fill:none;stroke:rgba(201,161,94,.45);stroke-width:1;stroke-dasharray:1;stroke-dashoffset:1;"></path>
      <path data-glint="" d="M96 118 L104 118 M93 136 L107 136 M97 154 L103 154" style="stroke:#ffe1a0;stroke-width:2;stroke-linecap:round;"></path>
    </svg>
    <div data-in="" style="font-size:11px;font-weight:600;letter-spacing:.34em;text-transform:uppercase;color:#d9b97f;">Onde vamos dizer sim</div>
    <div data-in="" style="max-width:400px;font-family:{{ t.headFont }};font-weight:{{ t.headWeight }};font-style:{{ t.headStyle }};text-transform:{{ t.headTT }};letter-spacing:{{ t.headLSsoft }};font-size:{{ t.headSize }};line-height:1.12;text-wrap:balance;">Villa Serenissima</div>
    <div data-in="" style="display:flex;flex-direction:column;gap:6px;opacity:.85;line-height:1.6;">
      <span>Rua X, 123</span>
      <span>São Paulo · SP</span>
    </div>
  </section>

  <section data-scene="6" data-screen-label="07 Final" style="position:absolute;inset:0;z-index:1;visibility:hidden;background:linear-gradient(180deg,#121c33 0%,#2a3358 26%,#7a4660 46%,#e0875a 60%,#26334c 60.15%,#111a29 100%);color:#f6ece0;overflow:hidden;text-align:center;">
    <div style="position:absolute;left:0;right:0;top:0;height:60%;overflow:hidden;pointer-events:none;">
      <div data-sun="" style="position:absolute;left:68%;bottom:-26px;width:68px;height:68px;margin-left:-34px;border-radius:50%;background:radial-gradient(circle,#ffe0a6,#f2955f 70%);box-shadow:0 0 60px 20px rgba(242,149,95,.45);"></div>
    </div>
    <svg viewBox="0 0 400 120" style="position:absolute;left:50%;bottom:40%;width:min(100%,560px);height:auto;transform:translateX(-50%);overflow:visible;">
      <path d="M0 120 L0 92 L20 92 L20 84 L34 84 L34 92 L48 92 L48 78 L56 70 L64 78 L64 92 L80 92 L80 30 L83 22 L86 12 L89 22 L92 30 L92 92 L100 92 L100 74 Q110 58 120 74 L122 74 Q132 50 142 74 L144 74 Q154 58 164 74 L164 92 L190 92 L190 86 L250 86 L250 70 Q262 38 274 70 L274 86 L290 86 L290 78 Q296 68 302 78 L302 92 L330 92 L330 84 L360 84 L360 90 L400 90 L400 120 Z" style="fill:#160f1c;"></path>
      <sc-for list="{{ wins }}" as="w" hint-placeholder-count="16">
        <rect data-win="" x="{{ w.x }}" y="{{ w.y }}" width="2.4" height="3.4" style="fill:#ffd88a;opacity:0;"></rect>
      </sc-for>
    </svg>
    <svg viewBox="0 0 400 120" style="position:absolute;left:50%;top:60%;width:min(100%,560px);height:auto;transform:translateX(-50%) scaleY(-1);overflow:visible;opacity:.35;filter:url(#c06wave);">
      <path d="M0 120 L0 92 L20 92 L20 84 L34 84 L34 92 L48 92 L48 78 L56 70 L64 78 L64 92 L80 92 L80 30 L83 22 L86 12 L89 22 L92 30 L92 92 L100 92 L100 74 Q110 58 120 74 L122 74 Q132 50 142 74 L144 74 Q154 58 164 74 L164 92 L190 92 L190 86 L250 86 L250 70 Q262 38 274 70 L274 86 L290 86 L290 78 Q296 68 302 78 L302 92 L330 92 L330 84 L360 84 L360 90 L400 90 L400 120 Z" style="fill:#0b0810;"></path>
    </svg>
    <div data-water="" style="position:absolute;left:0;right:0;top:60.2%;bottom:0;pointer-events:none;background:repeating-linear-gradient(180deg,rgba(242,149,95,0) 0 10px,rgba(242,149,95,.2) 11px,rgba(242,149,95,0) 13px);filter:url(#c06wave);"></div>
    <div style="position:absolute;left:0;right:0;top:0;height:46%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:min(16px,2svh);padding:max(7svh,32px) clamp(28px,8vw,48px) 0;box-sizing:border-box;">
      <div data-in="" style="max-width:320px;font-family:{{ t.headFont }};font-style:italic;font-size:clamp(21px,5.6vw,26px);line-height:1.35;color:#f0d6a4;text-wrap:balance;">E ao entardecer, começa o nosso para sempre.</div>
      <div data-in="" style="font-family:{{ t.nameFont }};font-weight:{{ t.nameWeight }};font-style:{{ t.nameStyle }};text-transform:{{ t.nameTT }};letter-spacing:{{ t.nameLS }};font-size:{{ t.nameSizeSm }};line-height:{{ t.nameLH }};">{{ n1 }} <span style="color:#f0d6a4;">&amp;</span> {{ n2 }}</div>
    </div>
    <div style="position:absolute;left:0;right:0;top:66%;bottom:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;padding:0 clamp(28px,8vw,48px) 24px;box-sizing:border-box;">
      <p data-in="" style="margin:0;max-width:320px;line-height:1.6;text-wrap:pretty;">Todos os detalhes do nosso grande dia estão no nosso site.</p>
      <a data-in="" href="{{ siteUrl }}" target="_blank" rel="noopener" style="display:inline-flex;align-items:center;gap:12px;padding:17px 30px;border-radius:999px;background:linear-gradient(135deg,#f3dca6,#c9a15e);color:#2a1a1e;font-size:11px;font-weight:600;letter-spacing:.24em;text-transform:uppercase;box-shadow:0 14px 30px -14px rgba(0,0,0,.7);">Ver o site do casal <span>→</span></a>
    </div>
  </section>

  <div style="position:absolute;left:0;right:0;bottom:clamp(26px,4.4vh,42px);z-index:7;display:flex;flex-direction:column;align-items:center;gap:10px;pointer-events:none;opacity:{{ hintOp }};transition:opacity .6s ease;">
    <span style="font-size:10px;font-weight:600;letter-spacing:.28em;text-transform:uppercase;color:{{ hintColor }};">Toque para continuar</span>
    <div style="display:flex;gap:6px;">
      <sc-for list="{{ dots }}" as="d" hint-placeholder-count="7">
        <span style="width:{{ d.w }};height:3px;border-radius:3px;background:{{ d.bg }};transition:width .5s ease, background .5s ease;"></span>
      </sc-for>
    </div>
  </div>

</div>`;
