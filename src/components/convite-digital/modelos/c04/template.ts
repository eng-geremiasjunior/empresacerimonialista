// A marcação do Convite 04, copiada LITERAL de design_handoff_convites/Convite 04.dc.html
// (entre </helmet> e o <script>) por ferramentas/convites/extrair.mjs. Não editar à mão
// além das trocas declaradas em modelo.ts.

export const TEMPLATE = String.raw`<div data-root="" style="position:relative;height:100svh;overflow:hidden;background:#2f2b27;color:#2d2a26;font-family:{{ t.textFont }};font-size:{{ t.textSize }};font-weight:{{ t.textWeight }};cursor:pointer;user-select:none;-webkit-user-select:none;">

  <section data-scene="0" data-screen-label="01 Abertura" style="position:absolute;inset:0;z-index:0;background:radial-gradient(ellipse at 50% 45%,#4a443d,#2b2824 72%);color:#f3ece1;text-align:center;">
    <div data-o="" style="position:absolute;left:0;right:0;top:max(9svh,40px);display:flex;flex-direction:column;align-items:center;gap:12px;">
      <span style="width:1px;height:26px;background:#b8975a;"></span>
      <span style="font-size:11px;font-weight:500;letter-spacing:.36em;text-transform:uppercase;color:#d9c08a;">Você recebeu um convite</span>
    </div>
    <div data-cshadow="" style="position:absolute;left:50%;top:50%;width:74%;height:37%;transform:translate(-50%,-50%);box-shadow:0 30px 70px -10px rgba(0,0,0,.6);"></div>
    <div data-o="" style="position:absolute;left:0;right:0;bottom:max(9svh,40px);display:flex;flex-direction:column;align-items:center;gap:12px;">
      <span style="font-family:{{ t.headFont }};font-style:italic;font-size:clamp(18px,2.2vw,22px);">Toque para abrir</span>
      <span style="width:1px;height:26px;background:#b8975a;"></span>
    </div>
  </section>

  <section data-scene="1" data-screen-label="02 Nomes" style="position:absolute;inset:0;z-index:3;background:#faf6ef;box-shadow:inset 0 0 0 1px rgba(184,151,90,.85);transform:translateY(-18.5%) scale(.74);clip-path:inset(50% -30% -30% -30%);perspective:2000px;">
    <div style="position:absolute;inset:14px;border:1px solid rgba(184,151,90,.55);pointer-events:none;"></div>
    <div data-crease="" style="position:absolute;left:0;right:0;top:50%;height:3px;margin-top:-1px;background:linear-gradient(180deg,rgba(45,42,38,.07),rgba(255,255,255,.8));opacity:0;"></div>
    <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:min(22px,2.6svh);padding:min(72px,8svh) clamp(32px,9vw,56px) max(90px,12svh);box-sizing:border-box;text-align:center;">
      <svg viewBox="0 0 160 12" style="width:min(140px,36vw);height:auto;overflow:visible;">
        <path data-draw="" pathLength="1" d="M0 6 L66 6" style="fill:none;stroke:#b8975a;stroke-width:1;stroke-dasharray:1;stroke-dashoffset:1;"></path>
        <path data-draw="" pathLength="1" d="M160 6 L94 6" style="fill:none;stroke:#b8975a;stroke-width:1;stroke-dasharray:1;stroke-dashoffset:1;"></path>
        <path data-in="" d="M80 0 L86 6 L80 12 L74 6 Z" style="fill:none;stroke:#b8975a;stroke-width:1;"></path>
      </svg>
      <div data-in="" style="font-family:{{ t.headFont }};font-style:italic;font-size:clamp(20px,5.4vw,24px);color:#766c60;">Com muito amor,</div>
      <div data-in="" style="display:flex;flex-direction:column;align-items:center;gap:6px;">
        <sc-if value="{{ modeNames }}" hint-placeholder-val="{{ true }}">
          <h1 style="margin:0;display:flex;flex-direction:column;align-items:center;font-weight:{{ t.nameWeight }};font-family:{{ t.nameFont }};font-style:{{ t.nameStyle }};text-transform:{{ t.nameTT }};letter-spacing:{{ t.nameLS }};font-size:{{ t.nameSize }};line-height:{{ t.nameLH }};">
            <span>{{ n1 }}</span>
            <span data-foil="" style="font-family:{{ t.headFont }};font-style:italic;font-weight:400;text-transform:none;letter-spacing:0;font-size:.42em;line-height:1.5;background:linear-gradient(110deg,#9a7a42 0%,#b8975a 30%,#ecd9a6 48%,#b8975a 62%,#8e6d38 100%);background-size:260% 100%;-webkit-background-clip:text;background-clip:text;color:transparent;">&amp;</span>
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
      <div data-in="" style="max-width:300px;font-size:11px;font-weight:500;letter-spacing:.3em;line-height:1.9;text-transform:uppercase;color:#766c60;">Convidam você para celebrar o seu casamento</div>
    </div>
    <div data-flap="" style="position:absolute;left:0;right:0;top:0;height:50%;z-index:4;transform-origin:50% 100%;transform:rotateX(-180deg);transform-style:preserve-3d;">
      <div style="position:absolute;inset:0;backface-visibility:hidden;-webkit-backface-visibility:hidden;background:#faf6ef;box-shadow:inset 0 0 0 1px rgba(184,151,90,.85);">
        <div style="position:absolute;top:14px;left:14px;right:14px;bottom:-1px;border:1px solid rgba(184,151,90,.55);border-bottom:none;"></div>
        <div data-fshade="" style="position:absolute;inset:0;background:linear-gradient(0deg,rgba(45,42,38,.22),rgba(45,42,38,.04));opacity:0;"></div>
      </div>
      <div style="position:absolute;inset:0;backface-visibility:hidden;-webkit-backface-visibility:hidden;transform:rotateX(180deg);background:#f7f2e9;box-shadow:inset 0 0 0 1px rgba(184,151,90,.85);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;text-align:center;">
        <div style="position:absolute;inset:14px;border:1px solid rgba(184,151,90,.6);"></div>
        <div style="position:absolute;inset:19px;border:1px solid rgba(184,151,90,.3);"></div>
        <div data-foil="" style="position:relative;display:flex;align-items:center;gap:.24em;font-family:{{ t.nameFont }};font-weight:{{ t.nameWeight }};font-style:{{ t.nameStyle }};font-size:{{ t.monoSize }};line-height:1.1;background:linear-gradient(110deg,#9a7a42 0%,#b8975a 30%,#ecd9a6 48%,#b8975a 62%,#8e6d38 100%);background-size:260% 100%;-webkit-background-clip:text;background-clip:text;color:transparent;"><span>{{ i1 }}</span><span style="width:1px;height:.62em;background:#b8975a;"></span><span>{{ i2 }}</span></div>
        <div style="position:relative;font-size:10px;font-weight:500;letter-spacing:.34em;text-transform:uppercase;color:#766c60;">{{ dt.short }}</div>
      </div>
    </div>
  </section>

  <section data-scene="2" data-screen-label="03 Frase" style="position:absolute;inset:0;z-index:1;visibility:hidden;background:#f4eee4;box-shadow:inset 0 0 0 1px rgba(184,151,90,.85);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:30px;padding:72px clamp(34px,10vw,60px) max(90px,12svh);box-sizing:border-box;text-align:center;">
    <div style="position:absolute;inset:14px;border:1px solid rgba(184,151,90,.55);pointer-events:none;"></div>
    <svg viewBox="0 0 120 2" style="width:90px;height:2px;overflow:visible;"><path data-draw="" pathLength="1" d="M0 1 L120 1" style="fill:none;stroke:#b8975a;stroke-width:1;stroke-dasharray:1;stroke-dashoffset:1;"></path></svg>
    <p style="margin:0;max-width:420px;display:flex;flex-wrap:wrap;justify-content:center;gap:.08em .3em;font-family:{{ t.headFont }};font-style:italic;font-weight:{{ t.headWeight }};font-size:clamp(25px,6.6vw,34px);line-height:1.38;">
      <sc-for list="{{ words }}" as="w" hint-placeholder-count="14">
        <span data-w="" style="display:inline-block;">{{ w }}</span>
      </sc-for>
    </p>
    <svg viewBox="0 0 120 2" style="width:90px;height:2px;overflow:visible;"><path data-draw="" pathLength="1" d="M120 1 L0 1" style="fill:none;stroke:#b8975a;stroke-width:1;stroke-dasharray:1;stroke-dashoffset:1;"></path></svg>
  </section>

  <section data-scene="3" data-screen-label="04 Foto" style="position:absolute;inset:0;z-index:1;visibility:hidden;background:#faf6ef;box-shadow:inset 0 0 0 1px rgba(184,151,90,.85);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:min(30px,3.4svh);padding:72px 28px max(90px,12svh);box-sizing:border-box;text-align:center;">
    <div style="position:absolute;inset:14px;border:1px solid rgba(184,151,90,.55);pointer-events:none;"></div>
    <div style="position:relative;height:min(52svh,96vw);aspect-ratio:4/5;">
      <svg viewBox="0 0 100 125" preserveAspectRatio="none" style="position:absolute;left:-11px;top:-11px;width:calc(100% + 22px);height:calc(100% + 22px);overflow:visible;">
        <path data-draw="" pathLength="1" d="M0 0 L100 0 L100 125 L0 125 Z" style="fill:none;stroke:#b8975a;stroke-width:1;vector-effect:non-scaling-stroke;stroke-dasharray:1;stroke-dashoffset:1;"></path>
      </svg>
      <div data-photo="" style="position:absolute;inset:0;overflow:hidden;box-shadow:0 18px 40px -22px rgba(45,42,38,.5);">
        <div data-pz="" style="position:absolute;inset:0;">
          <image-slot id="c04-foto" shape="rect" placeholder="Foto do casal" style="width:100%;height:100%;"></image-slot>
        </div>
      </div>
    </div>
    <div data-in="" style="font-family:{{ t.headFont }};font-style:italic;font-size:clamp(20px,5.4vw,24px);color:#766c60;">Cada página nos trouxe até aqui.</div>
  </section>

  <section data-scene="4" data-screen-label="05 Data" style="position:absolute;inset:0;z-index:1;visibility:hidden;background:#f4eee4;box-shadow:inset 0 0 0 1px rgba(184,151,90,.85);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:min(20px,2.4svh);padding:72px clamp(28px,8vw,48px) max(90px,12svh);box-sizing:border-box;text-align:center;">
    <div style="position:absolute;inset:14px;border:1px solid rgba(184,151,90,.55);pointer-events:none;"></div>
    <div data-in="" style="font-size:11px;font-weight:500;letter-spacing:.34em;text-transform:uppercase;color:#766c60;">Guarde esta data</div>
    <div data-in="" style="font-family:{{ t.headFont }};font-weight:{{ t.headWeight }};font-style:{{ t.headStyle }};text-transform:{{ t.headTT }};letter-spacing:{{ t.headLSsoft }};font-size:{{ t.headSize }};line-height:1.1;">{{ dt.month }}</div>
    <div style="display:flex;align-items:center;gap:clamp(14px,4vw,22px);">
      <svg viewBox="0 0 60 2" style="width:clamp(44px,14vw,64px);height:2px;overflow:visible;"><path data-draw="" pathLength="1" d="M60 1 L0 1" style="fill:none;stroke:#b8975a;stroke-width:1;stroke-dasharray:1;stroke-dashoffset:1;"></path></svg>
      <div data-in="" style="font-family:{{ t.headFont }};font-weight:{{ t.headWeight }};font-size:min(clamp(84px,26vw,124px),15svh);line-height:1;">{{ dt.day }}</div>
      <svg viewBox="0 0 60 2" style="width:clamp(44px,14vw,64px);height:2px;overflow:visible;"><path data-draw="" pathLength="1" d="M0 1 L60 1" style="fill:none;stroke:#b8975a;stroke-width:1;stroke-dasharray:1;stroke-dashoffset:1;"></path></svg>
    </div>
    <div data-in="" style="font-family:{{ t.headFont }};font-weight:{{ t.headWeight }};font-style:{{ t.headStyle }};letter-spacing:{{ t.headLSsoft }};font-size:clamp(22px,6vw,28px);line-height:1.1;">{{ dt.year }}</div>
    <div data-in="" style="display:flex;align-items:center;gap:14px;font-size:12px;font-weight:500;letter-spacing:.26em;text-transform:uppercase;">
      <span>{{ dt.weekday }}</span><span style="width:4px;height:4px;transform:rotate(45deg);border:1px solid #b8975a;"></span><span>às {{ dt.time }}</span>
    </div>
  </section>

  <section data-scene="5" data-screen-label="06 Local" style="position:absolute;inset:0;z-index:1;visibility:hidden;background:#faf6ef;box-shadow:inset 0 0 0 1px rgba(184,151,90,.85);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:20px;padding:72px clamp(28px,8vw,48px) max(90px,12svh);box-sizing:border-box;text-align:center;">
    <div style="position:absolute;inset:14px;border:1px solid rgba(184,151,90,.55);pointer-events:none;"></div>
    <svg viewBox="0 0 160 12" style="width:min(140px,36vw);height:auto;overflow:visible;">
      <path data-draw="" pathLength="1" d="M0 6 L66 6" style="fill:none;stroke:#b8975a;stroke-width:1;stroke-dasharray:1;stroke-dashoffset:1;"></path>
      <path data-draw="" pathLength="1" d="M160 6 L94 6" style="fill:none;stroke:#b8975a;stroke-width:1;stroke-dasharray:1;stroke-dashoffset:1;"></path>
      <path data-in="" d="M80 0 L86 6 L80 12 L74 6 Z" style="fill:none;stroke:#b8975a;stroke-width:1;"></path>
    </svg>
    <div data-in="" style="font-size:11px;font-weight:500;letter-spacing:.34em;text-transform:uppercase;color:#766c60;">Onde vamos dizer sim</div>
    <div data-in="" style="max-width:400px;font-family:{{ t.headFont }};font-weight:{{ t.headWeight }};font-style:{{ t.headStyle }};text-transform:{{ t.headTT }};letter-spacing:{{ t.headLSsoft }};font-size:{{ t.headSize }};line-height:1.12;text-wrap:balance;">Quinta das Oliveiras</div>
    <div data-in="" style="display:flex;flex-direction:column;gap:6px;color:#766c60;line-height:1.6;">
      <span>Estrada X, 123</span>
      <span>Campinas · SP</span>
    </div>
  </section>

  <section data-scene="6" data-screen-label="07 Final" style="position:absolute;inset:0;z-index:1;visibility:hidden;background:radial-gradient(ellipse at 50% 40%,#4a443d,#2b2824 75%);color:#f3ece1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:20px;padding:72px clamp(28px,8vw,48px);box-sizing:border-box;text-align:center;">
    <div style="position:absolute;inset:14px;border:1px solid rgba(184,151,90,.45);pointer-events:none;"></div>
    <div data-in="" style="max-width:320px;font-family:{{ t.headFont }};font-style:italic;font-size:clamp(22px,6vw,28px);line-height:1.35;color:#d9c08a;text-wrap:balance;">A próxima página, escrevemos com você.</div>
    <div data-in="" style="font-family:{{ t.nameFont }};font-weight:{{ t.nameWeight }};font-style:{{ t.nameStyle }};text-transform:{{ t.nameTT }};letter-spacing:{{ t.nameLS }};font-size:{{ t.nameSizeSm }};line-height:{{ t.nameLH }};">{{ n1 }} <span style="color:#d9c08a;">&amp;</span> {{ n2 }}</div>
    <p data-in="" style="margin:0;max-width:320px;line-height:1.7;opacity:.88;text-wrap:pretty;">Todos os detalhes do nosso grande dia estão no nosso site.</p>
    <a data-in="" href="{{ siteUrl }}" target="_blank" rel="noopener" style="margin-top:8px;display:inline-flex;align-items:center;gap:12px;padding:17px 30px;border:1px solid #b8975a;color:#f3ece1;font-size:11px;font-weight:500;letter-spacing:.26em;text-transform:uppercase;background:rgba(184,151,90,.08);">Ver o site do casal <span style="color:#d9c08a;">→</span></a>
  </section>

  <svg style="position:absolute;inset:0;z-index:5;width:100%;height:100%;pointer-events:none;overflow:visible;">
    <defs>
      <linearGradient id="c04g" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#d6c9b2"></stop>
        <stop offset=".42" stop-color="#fdfaf4"></stop>
        <stop offset="1" stop-color="#ece2d1"></stop>
      </linearGradient>
      <filter id="c04s" x="-50%" y="-50%" width="200%" height="200%">
        <feDropShadow dx="-3" dy="-2" stdDeviation="7" flood-color="#2d2a26" flood-opacity=".3"></feDropShadow>
      </filter>
    </defs>
    <path data-flapov="" d="" style="fill:url(#c04g);stroke:rgba(184,151,90,.8);stroke-width:1;stroke-linejoin:round;filter:url(#c04s);"></path>
  </svg>

  <div style="position:absolute;left:0;right:0;bottom:clamp(30px,4.6vh,44px);z-index:7;display:flex;flex-direction:column;align-items:center;gap:10px;pointer-events:none;opacity:{{ hintOp }};transition:opacity .6s ease;">
    <span style="font-size:10px;font-weight:500;letter-spacing:.28em;text-transform:uppercase;color:#766c60;">Toque para virar a página</span>
    <div style="display:flex;gap:6px;">
      <sc-for list="{{ dots }}" as="d" hint-placeholder-count="7">
        <span style="width:{{ d.w }};height:3px;border-radius:3px;background:{{ d.bg }};transition:width .5s ease, background .5s ease;"></span>
      </sc-for>
    </div>
  </div>

</div>`;
