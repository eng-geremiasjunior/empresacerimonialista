// A marcação do Convite 02, copiada LITERAL de design_handoff_convites/Convite 02.dc.html
// (entre </helmet> e o <script>) por ferramentas/convites/extrair.mjs. Não editar à mão
// além das trocas declaradas em modelo.ts.

export const TEMPLATE = String.raw`<div data-root="" style="position:relative;height:100svh;overflow:hidden;background:#f3ebdf;color:#1f3d44;font-family:{{ t.textFont }};font-size:{{ t.textSize }};font-weight:{{ t.textWeight }};cursor:pointer;user-select:none;-webkit-user-select:none;">

  <section data-scene="0" data-screen-label="01 Abertura" style="position:absolute;inset:0;z-index:2;background:#f3ebdf;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:clamp(22px,4vh,36px);padding:24px;box-sizing:border-box;text-align:center;">
    <div data-o="top" style="font-size:11px;font-weight:600;letter-spacing:.36em;text-transform:uppercase;color:#a85a42;">Você recebeu um convite</div>
    <div style="position:relative;width:min(320px,82vw);height:250px;">
      <div style="position:absolute;left:0;right:0;top:0;height:150px;overflow:hidden;">
        <div data-sun="" style="position:absolute;left:50%;bottom:-80px;width:160px;height:160px;margin-left:-80px;border-radius:50%;background:radial-gradient(circle at 50% 38%,#f6dcae,#e8b778 56%,#d9966a);display:flex;justify-content:center;padding-top:30px;box-sizing:border-box;">
          <span style="font-family:{{ t.nameFont }};font-weight:{{ t.nameWeight }};font-style:{{ t.nameStyle }};font-size:{{ t.sunMono }};line-height:1;color:#1f3d44;">{{ i1 }}<span style="font-size:.6em;color:#a85a42;"> &amp; </span>{{ i2 }}</span>
        </div>
      </div>
      <div data-hz="" style="position:absolute;left:0;right:0;top:150px;height:1px;background:#1f3d44;opacity:.55;"></div>
      <sc-for list="{{ refl }}" as="r" hint-placeholder-count="5">
        <span data-refl="" style="position:absolute;left:50%;top:{{ r.top }};width:{{ r.w }};height:2px;margin-left:{{ r.ml }};border-radius:2px;background:#e8b778;opacity:{{ r.op }};"></span>
      </sc-for>
    </div>
    <div data-o="hint" style="display:flex;flex-direction:column;align-items:center;gap:10px;">
      <span style="font-family:{{ t.headFont }};font-style:italic;font-size:clamp(18px,2.2vw,22px);">Toque para abrir</span>
      <span style="width:1px;height:28px;background:#1f3d44;opacity:.5;"></span>
    </div>
  </section>

  <section data-scene="1" data-screen-label="02 Nomes" style="position:absolute;inset:0;z-index:1;visibility:hidden;background:#faf6ef;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:26px;padding:72px clamp(28px,8vw,48px);box-sizing:border-box;text-align:center;">
    <div data-in="" style="max-width:300px;font-size:11px;font-weight:600;letter-spacing:.32em;line-height:1.8;text-transform:uppercase;color:#a85a42;">Com alegria, convidamos você para o casamento de</div>
    <div data-in="" style="display:flex;flex-direction:column;align-items:center;gap:6px;">
      <sc-if value="{{ modeNames }}" hint-placeholder-val="{{ true }}">
        <h1 style="margin:0;display:flex;flex-direction:column;align-items:center;font-weight:{{ t.nameWeight }};font-family:{{ t.nameFont }};font-style:{{ t.nameStyle }};text-transform:{{ t.nameTT }};letter-spacing:{{ t.nameLS }};font-size:{{ t.nameSize }};line-height:{{ t.nameLH }};">
          <span>{{ n1 }}</span>
          <span style="font-family:{{ t.headFont }};font-style:italic;font-weight:400;text-transform:none;letter-spacing:0;font-size:.4em;line-height:1.5;color:#a85a42;">&amp;</span>
          <span>{{ n2 }}</span>
        </h1>
      </sc-if>
      <sc-if value="{{ modeInitials }}" hint-placeholder-val="{{ false }}">
        <div style="display:flex;align-items:center;gap:.22em;font-family:{{ t.nameFont }};font-weight:{{ t.nameWeight }};font-style:{{ t.nameStyle }};font-size:{{ t.initSize }};line-height:1;"><span>{{ i1 }}</span><span style="width:1px;height:.7em;background:#c9a46a;"></span><span>{{ i2 }}</span></div>
      </sc-if>
      <sc-if value="{{ modeBoth }}" hint-placeholder-val="{{ false }}">
        <div style="display:flex;align-items:center;gap:.22em;font-family:{{ t.nameFont }};font-weight:{{ t.nameWeight }};font-style:{{ t.nameStyle }};font-size:{{ t.initSizeSm }};line-height:1;"><span>{{ i1 }}</span><span style="width:1px;height:.7em;background:#c9a46a;"></span><span>{{ i2 }}</span></div>
        <div style="font-family:{{ t.nameFont }};font-weight:{{ t.nameWeight }};font-style:{{ t.nameStyle }};text-transform:{{ t.nameTT }};letter-spacing:{{ t.nameLS }};font-size:{{ t.nameSizeSm }};line-height:{{ t.nameLH }};">{{ n1 }} &amp; {{ n2 }}</div>
      </sc-if>
    </div>
    <div data-in="" style="width:min(240px,70%);height:18px;overflow:hidden;">
      <svg viewBox="0 0 240 18" style="display:block;width:100%;height:100%;overflow:visible;">
        <g data-wl="">
          <path d="M-240 9 q15 -7 30 0 t30 0 t30 0 t30 0 t30 0 t30 0 t30 0 t30 0 t30 0 t30 0 t30 0 t30 0 t30 0 t30 0 t30 0 t30 0" style="fill:none;stroke:#c9a46a;stroke-width:1.3;stroke-linecap:round;"></path>
        </g>
      </svg>
    </div>
  </section>

  <section data-scene="2" data-screen-label="03 Frase" style="position:absolute;inset:0;z-index:1;visibility:hidden;background:#f3ebdf;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:30px;padding:72px clamp(32px,9vw,56px);box-sizing:border-box;text-align:center;">
    <div data-in="" style="width:46px;height:12px;">
      <svg viewBox="0 0 46 12" style="display:block;width:100%;height:100%;"><path d="M1 6 q5.5 -5 11 0 t11 0 t11 0 t11 0" style="fill:none;stroke:#a85a42;stroke-width:1.4;stroke-linecap:round;"></path></svg>
    </div>
    <p style="margin:0;max-width:420px;display:flex;flex-wrap:wrap;justify-content:center;gap:.08em .3em;font-family:{{ t.headFont }};font-style:italic;font-weight:{{ t.headWeight }};font-size:clamp(25px,6.6vw,34px);line-height:1.38;">
      <sc-for list="{{ words }}" as="w" hint-placeholder-count="14">
        <span data-w="" style="display:inline-block;">{{ w }}</span>
      </sc-for>
    </p>
    <div data-in="" style="font-size:12px;font-weight:600;letter-spacing:.3em;text-transform:uppercase;color:#a85a42;">{{ n1 }} &amp; {{ n2 }}</div>
  </section>

  <section data-scene="3" data-screen-label="04 Foto" style="position:absolute;inset:0;z-index:1;visibility:hidden;background:#faf6ef;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:28px;padding:72px 28px;box-sizing:border-box;text-align:center;">
    <div style="position:relative;height:min(58svh,120vw);aspect-ratio:3/4;border-radius:46% 54% 48% 52% / 34% 36% 64% 66%;overflow:hidden;box-shadow:0 40px 60px -40px rgba(31,61,68,.55);">
      <div data-photo="" style="position:absolute;inset:0;clip-path:inset(100% 0 0 0);">
        <div data-pz="" style="position:absolute;inset:0;">
          <image-slot id="c02-foto" shape="rect" placeholder="Foto do casal" style="width:100%;height:100%;"></image-slot>
        </div>
        <div data-cau="0" style="position:absolute;left:-30%;top:-20%;width:90%;height:70%;pointer-events:none;border-radius:50%;background:radial-gradient(closest-side,rgba(255,246,226,.38),rgba(255,246,226,0));mix-blend-mode:screen;"></div>
        <div data-cau="1" style="position:absolute;right:-30%;bottom:-10%;width:80%;height:60%;pointer-events:none;border-radius:50%;background:radial-gradient(closest-side,rgba(255,240,214,.3),rgba(255,240,214,0));mix-blend-mode:screen;"></div>
      </div>
    </div>
    <div data-in="" style="font-family:{{ t.headFont }};font-style:italic;font-size:clamp(20px,5.4vw,24px);color:#4e6262;">Sem pressa, como a maré.</div>
  </section>

  <section data-scene="4" data-screen-label="05 Data" style="position:absolute;inset:0;z-index:1;visibility:hidden;background:#f3ebdf;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:24px;padding:72px clamp(28px,8vw,48px);box-sizing:border-box;text-align:center;">
    <div data-in="" style="font-size:11px;font-weight:600;letter-spacing:.34em;text-transform:uppercase;color:#a85a42;">Guarde esta data</div>
    <div style="position:relative;width:min(340px,86vw);height:270px;">
      <div style="position:absolute;left:0;right:0;top:0;height:170px;overflow:hidden;">
        <div data-sun="" style="position:absolute;left:50%;bottom:-100px;width:200px;height:200px;margin-left:-100px;border-radius:50%;background:radial-gradient(circle at 50% 38%,#f6dcae,#e8b778 56%,#d9966a);"></div>
      </div>
      <div data-in="" style="position:absolute;left:0;right:0;top:34px;display:flex;justify-content:center;font-family:{{ t.headFont }};font-weight:{{ t.headWeight }};font-size:clamp(96px,30vw,136px);line-height:1;color:#1f3d44;font-variant-numeric:lining-nums;">{{ dt.day }}</div>
      <div data-hz="" style="position:absolute;left:0;right:0;top:170px;height:1px;background:#1f3d44;opacity:.55;"></div>
      <sc-for list="{{ reflBig }}" as="r" hint-placeholder-count="5">
        <span data-refl="" style="position:absolute;left:50%;top:{{ r.top }};width:{{ r.w }};height:2px;margin-left:{{ r.ml }};border-radius:2px;background:#e8b778;opacity:{{ r.op }};"></span>
      </sc-for>
    </div>
    <div data-in="" style="display:flex;align-items:center;gap:14px;font-size:13px;font-weight:600;letter-spacing:.28em;text-transform:uppercase;">
      <span>{{ dt.weekday }}</span><span style="width:4px;height:4px;border-radius:50%;background:#a85a42;"></span><span>{{ dt.month }}</span><span style="width:4px;height:4px;border-radius:50%;background:#a85a42;"></span><span>{{ dt.year }}</span>
    </div>
    <div data-in="" style="font-family:{{ t.headFont }};font-style:italic;font-size:clamp(22px,6vw,26px);">às {{ dt.time }}, ao entardecer</div>
  </section>

  <section data-scene="5" data-screen-label="06 Local" style="position:absolute;inset:0;z-index:1;visibility:hidden;background:#faf6ef;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:72px clamp(28px,8vw,48px);box-sizing:border-box;text-align:center;overflow:hidden;">
    <div style="position:absolute;left:50%;top:50%;width:0;height:0;">
      <span data-rip="0" style="position:absolute;left:-210px;top:-210px;width:420px;height:420px;border-radius:50%;border:1px solid rgba(47,106,115,.4);opacity:0;"></span>
      <span data-rip="1" style="position:absolute;left:-210px;top:-210px;width:420px;height:420px;border-radius:50%;border:1px solid rgba(47,106,115,.4);opacity:0;"></span>
      <span data-rip="2" style="position:absolute;left:-210px;top:-210px;width:420px;height:420px;border-radius:50%;border:1px solid rgba(47,106,115,.4);opacity:0;"></span>
    </div>
    <div style="position:relative;display:flex;flex-direction:column;align-items:center;gap:20px;">
      <div data-in="" style="font-size:11px;font-weight:600;letter-spacing:.34em;text-transform:uppercase;color:#a85a42;">Cerimônia e recepção</div>
      <div data-in="" style="max-width:400px;font-family:{{ t.headFont }};font-weight:{{ t.headWeight }};font-style:{{ t.headStyle }};text-transform:{{ t.headTT }};letter-spacing:{{ t.headLSsoft }};font-size:{{ t.headSize }};line-height:1.12;text-wrap:balance;">Casa Maré</div>
      <div data-in="" style="width:46px;height:12px;"><svg viewBox="0 0 46 12" style="display:block;width:100%;height:100%;"><path d="M1 6 q5.5 -5 11 0 t11 0 t11 0 t11 0" style="fill:none;stroke:#c9a46a;stroke-width:1.4;stroke-linecap:round;"></path></svg></div>
      <div data-in="" style="display:flex;flex-direction:column;gap:6px;color:#4e6262;line-height:1.6;">
        <span>Rua X, 123</span>
        <span>Ilhabela · SP</span>
      </div>
    </div>
  </section>

  <section data-scene="6" data-screen-label="07 Final" style="position:absolute;inset:0;z-index:1;visibility:hidden;background:linear-gradient(180deg,#f6ead9 0%,#efcfae 38%,#e2a487 58%,#c97e6c 63%,#2f5a63 63.2%,#1d3a42 100%);display:flex;flex-direction:column;align-items:center;box-sizing:border-box;text-align:center;overflow:hidden;">
    <div style="position:relative;flex:none;height:63%;width:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px;padding:56px clamp(28px,8vw,48px) 70px;box-sizing:border-box;">
      <div data-in="" style="font-size:11px;font-weight:600;letter-spacing:.34em;text-transform:uppercase;color:#8e4a36;">Esperamos você</div>
      <div data-in="" style="font-family:{{ t.nameFont }};font-weight:{{ t.nameWeight }};font-style:{{ t.nameStyle }};text-transform:{{ t.nameTT }};letter-spacing:{{ t.nameLS }};font-size:{{ t.nameSizeSm }};line-height:{{ t.nameLH }};color:#1f3d44;">{{ n1 }} <span style="color:#8e4a36;">&amp;</span> {{ n2 }}</div>
      <p data-in="" style="margin:0;max-width:320px;line-height:1.65;color:#1f3d44;text-wrap:pretty;">Todos os detalhes do nosso grande dia estão no nosso site.</p>
      <a data-in="" href="{{ siteUrl }}" target="_blank" rel="noopener" style="margin-top:6px;display:inline-flex;align-items:center;gap:12px;padding:18px 30px;border-radius:999px;background:#1f3d44;color:#faf6ef;font-size:11px;font-weight:600;letter-spacing:.24em;text-transform:uppercase;">Ver o site do casal <span>→</span></a>
      <div style="position:absolute;left:0;right:0;bottom:0;height:90px;overflow:hidden;pointer-events:none;">
        <div data-sunset="" style="position:absolute;left:50%;bottom:-70px;width:140px;height:140px;margin-left:-70px;border-radius:50%;background:radial-gradient(circle at 50% 40%,#fbe3b6,#efb57f 60%,#de8d63);"></div>
      </div>
    </div>
    <div style="position:relative;flex:1;width:100%;">
      <sc-for list="{{ reflSea }}" as="r" hint-placeholder-count="6">
        <span data-refl="" style="position:absolute;left:50%;top:{{ r.top }};width:{{ r.w }};height:2px;margin-left:{{ r.ml }};border-radius:2px;background:#efb57f;opacity:{{ r.op }};"></span>
      </sc-for>
    </div>
  </section>

  <svg data-tide="" style="position:absolute;inset:0;z-index:5;width:100%;height:100%;pointer-events:none;overflow:visible;">
    <path data-tw="band" d="" style="fill:rgba(47,106,115,.16);"></path>
    <path data-tw="foam2" d="" style="fill:none;stroke:rgba(47,106,115,.32);stroke-width:1.2;"></path>
    <path data-tw="foam" d="" style="fill:none;stroke:#ffffff;stroke-width:3.5;stroke-linecap:round;stroke-linejoin:round;"></path>
  </svg>

  <div data-grain="" style="position:absolute;inset:0;z-index:6;pointer-events:none;opacity:.55;"></div>

  <div style="position:absolute;left:0;right:0;bottom:clamp(24px,4vh,38px);z-index:7;display:flex;flex-direction:column;align-items:center;gap:10px;pointer-events:none;opacity:{{ hintOp }};transition:opacity .6s ease;">
    <span style="font-size:10px;font-weight:600;letter-spacing:.28em;text-transform:uppercase;color:#a85a42;">Toque para continuar</span>
    <div style="display:flex;gap:6px;">
      <sc-for list="{{ dots }}" as="d" hint-placeholder-count="7">
        <span style="width:{{ d.w }};height:3px;border-radius:3px;background:{{ d.bg }};transition:width .5s ease, background .5s ease;"></span>
      </sc-for>
    </div>
  </div>

</div>`;
