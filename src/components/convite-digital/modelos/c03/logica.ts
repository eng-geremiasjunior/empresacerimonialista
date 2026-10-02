/* eslint-disable */
// @ts-nocheck
// A lógica do Convite 03, copiada LITERAL de design_handoff_convites/Convite 03.dc.html
// (class Component) por ferramentas/convites/extrair.mjs. Valores, tempos e curvas são os do
// desenho: não reinterpretar. A base DCLogic é o motor (../../motor/dc-logic).

import { DCLogic } from "../../motor/dc-logic";

export default class Convite03 extends DCLogic {
  state = { scene: 0 };
  cur = 0;

  theme() {
    const F = {
      essencial: { nf: "'Jost',sans-serif", nw: 300, ntt: 'uppercase', nls: '.12em', ns: 'normal', s: .62, nlh: 1.15, hf: "'Jost',sans-serif", hw: 300, htt: 'uppercase', hls: '.12em', hs: 'normal', hz: [22, 6, 30], tf: "'Hanken Grotesk',sans-serif", tz: 15, tw: 400 },
      maison: { nf: "'Bodoni Moda',serif", nw: 400, ntt: 'none', nls: '-.01em', ns: 'normal', s: .9, nlh: 1.05, hf: "'Bodoni Moda',serif", hw: 400, htt: 'none', hls: '0', hs: 'normal', hz: [28, 7.6, 38], tf: "'Figtree',sans-serif", tz: 15, tw: 400 },
      atelier: { nf: "'Italiana',serif", nw: 400, ntt: 'none', nls: '.03em', ns: 'normal', s: .9, nlh: 1.1, hf: "'Italiana',serif", hw: 400, htt: 'none', hls: '.03em', hs: 'normal', hz: [28, 7.6, 38], tf: "'EB Garamond',serif", tz: 18, tw: 400 },
      caligrafia: { nf: "'Pinyon Script',cursive", nw: 400, ntt: 'none', nls: '0', ns: 'normal', s: 1.05, nlh: 1.25, hf: "'Cormorant Garamond',serif", hw: 500, htt: 'none', hls: '0', hs: 'normal', hz: [30, 8.2, 40], tf: "'Cormorant Garamond',serif", tz: 18, tw: 500 },
      riviera: { nf: "'Monsieur La Doulaise',cursive", nw: 400, ntt: 'none', nls: '0', ns: 'normal', s: 1.25, nlh: 1.25, hf: "'Marcellus',serif", hw: 400, htt: 'none', hls: '.02em', hs: 'normal', hz: [26, 7, 32], tf: "'Marcellus',serif", tz: 16, tw: 400 },
      bilhete: { nf: "'Sacramento',cursive", nw: 400, ntt: 'none', nls: '0', ns: 'normal', s: 1.12, nlh: 1.2, hf: "'Lora',serif", hw: 400, htt: 'none', hls: '0', hs: 'italic', hz: [26, 7, 34], tf: "'Lora',serif", tz: 16, tw: 400 },
      soiree: { nf: "'Poiret One',sans-serif", nw: 400, ntt: 'uppercase', nls: '.1em', ns: 'normal', s: .68, nlh: 1.15, hf: "'Poiret One',sans-serif", hw: 400, htt: 'uppercase', hls: '.1em', hs: 'normal', hz: [22, 6, 28], tf: "'Josefin Sans',sans-serif", tz: 16, tw: 400 },
      relicario: { nf: "'Playfair Display',serif", nw: 400, ntt: 'none', nls: '0', ns: 'italic', s: .9, nlh: 1.1, hf: "'Playfair Display',serif", hw: 400, htt: 'none', hls: '0', hs: 'normal', hz: [28, 7.6, 38], tf: "'Libre Baskerville',serif", tz: 15, tw: 400 }
    };
    const key = String(this.props.fonte ?? '04 Caligrafia').split(' ').slice(1).join(' ').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const f = F[key] || F.caligrafia, s = f.s, hz = f.hz;
    const c = (a, b, m) => `clamp(${Math.round(a * s)}px, ${(b * s).toFixed(2)}vw, ${Math.round(m * s)}px)`;
    return { nameFont: f.nf, nameWeight: f.nw, nameTT: f.ntt, nameLS: f.nls, nameStyle: f.ns, nameLH: f.nlh,
      nameSize: `min(${c(60, 17, 96)}, ${(10.5 * s).toFixed(1)}svh)`, nameSizeSm: c(38, 11, 58), initSize: `min(${c(96, 28, 150)}, ${(17 * s).toFixed(1)}svh)`, initSizeSm: c(64, 18, 100), crestSize: `${Math.round(26 * s)}px`,
      headFont: f.hf, headWeight: f.hw, headTT: f.htt, headLSsoft: f.htt === 'uppercase' ? '.06em' : f.hls, headStyle: f.hs,
      headSize: `clamp(${hz[0]}px, ${hz[1]}vw, ${hz[2]}px)`, textFont: f.tf, textSize: `${f.tz}px`, textWeight: f.tw };
  }

  componentDidMount() {
    this.reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.root = document.querySelector('[data-root]');
    this.sparkL = document.querySelector('[data-spark]');
    this.scenes = [...document.querySelectorAll('[data-scene]')].sort((a, b) => a.dataset.scene - b.dataset.scene);
    this.prep();
    this.playScene(0);
    this.onClick = (e) => { if (e.target.closest && e.target.closest('a,button')) return; this.go(1); };
    this.onWheel = (e) => { const n = performance.now(); if (n - (this._wt || 0) < 900 || Math.abs(e.deltaY) < 24) return; this._wt = n; this.go(e.deltaY > 0 ? 1 : -1); };
    this.onTS = (e) => { this._ty = e.touches[0].clientY; this._tm = false; };
    this.onTE = (e) => { const dy = e.changedTouches[0].clientY - (this._ty ?? 0); if (Math.abs(dy) > 50) { this._tm = true; this.go(dy < 0 ? 1 : -1); } };
    this.onClickCap = (e) => { if (this._tm) { this._tm = false; e.stopPropagation(); } };
    const r = this.root;
    r.addEventListener('click', this.onClickCap, true); r.addEventListener('click', this.onClick);
    r.addEventListener('wheel', this.onWheel, { passive: true });
    r.addEventListener('touchstart', this.onTS, { passive: true }); r.addEventListener('touchend', this.onTE, { passive: true });
  }
  componentWillUnmount() {
    const r = this.root; if (!r) return;
    r.removeEventListener('click', this.onClickCap, true); r.removeEventListener('click', this.onClick);
    r.removeEventListener('wheel', this.onWheel); r.removeEventListener('touchstart', this.onTS); r.removeEventListener('touchend', this.onTE);
    cancelAnimationFrame(this._raf);
  }

  prep() {
    this.anims = {};
    const E = 'cubic-bezier(.2,.7,.2,1)', D = 'cubic-bezier(.55,0,.25,1)';
    const draw = (el, dur, delay) => el.animate([{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], { duration: dur, delay, easing: D, fill: 'both' });
    const d = new Date(this.props.dataISO ?? '2026-10-31T16:30:00');
    this.scenes.forEach((sc, i) => {
      const A = [], L = [];
      if (this.reduce) { this.anims[i] = { A, L }; return; }
      sc.querySelectorAll('[data-in]').forEach((el, k) => A.push(el.animate([{ opacity: 0, transform: 'translateY(16px)', filter: 'blur(7px)' }, { opacity: 1, transform: 'none', filter: 'blur(0)' }], { duration: 1200, delay: 260 + k * 220, easing: E, fill: 'both' })));
      sc.querySelectorAll('[data-o]').forEach((el, k) => A.push(el.animate([{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'none' }], { duration: 1200, delay: k ? 2200 : 300, easing: E, fill: 'both' })));
      sc.querySelectorAll('[data-frame]').forEach((el, k) => A.push(draw(el, 1800, 400 + k * 250)));
      sc.querySelectorAll('[data-door]').forEach((el) => A.push(el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 1200, delay: 700, easing: 'ease', fill: 'both' })));
      const crest = sc.querySelector('[data-crest]');
      if (crest) { A.push(crest.animate([{ opacity: 0, transform: 'translate(-50%,-50%) scale(.6)' }, { opacity: 1, transform: 'translate(-50%,-50%) scale(1)' }], { duration: 900, delay: 1500, easing: 'cubic-bezier(.34,1.56,.64,1)', fill: 'both' }));
        L.push(crest.animate([{ boxShadow: this.ajustar('0 6px 16px rgba(0,0,0,.35), 0 0 0 0 rgba(241,217,164,.5)') }, { boxShadow: this.ajustar('0 6px 16px rgba(0,0,0,.35), 0 0 0 14px rgba(241,217,164,0)') }], { duration: 2200, delay: 2400, iterations: Infinity, easing: 'ease-out' })); }
      const light = sc.querySelector('[data-light]');
      if (light) L.push(light.animate([{ opacity: .85 }, { opacity: 1 }], { duration: 2400, iterations: Infinity, direction: 'alternate', easing: 'ease-in-out' }));
      sc.querySelectorAll('[data-w]').forEach((el, k) => A.push(el.animate([{ opacity: 0, transform: 'translateY(14px)', filter: 'blur(8px)' }, { opacity: 1, transform: 'none', filter: 'blur(0)' }], { duration: 1100, delay: 320 + k * 90, easing: E, fill: 'both' })));
      sc.querySelectorAll('[data-tiara]').forEach((el, k) => A.push(draw(el, 1500, 500 + k * 350)));
      const gems = sc.querySelector('[data-gems]');
      if (gems) { A.push(gems.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 700, delay: 2000, fill: 'both' })); L.push(gems.animate([{ opacity: 1 }, { opacity: .55 }, { opacity: 1 }], { duration: 1800, delay: 2800, iterations: Infinity })); }
      const arch = sc.querySelector('[data-arch]');
      if (arch) A.push(draw(arch, 2000, 200));
      const ph = sc.querySelector('[data-photo]'), pz = sc.querySelector('[data-pz]'), sh = sc.querySelector('[data-sheen]');
      if (ph) A.push(ph.animate([{ opacity: 0, filter: 'brightness(2.2) saturate(0) blur(10px)' }, { opacity: 1, offset: .3 }, { opacity: 1, filter: 'brightness(1) saturate(1) blur(0)' }], { duration: 2400, delay: 300, easing: E, fill: 'both' }));
      if (pz) A.push(pz.animate([{ transform: 'scale(1.18)' }, { transform: 'scale(1)' }], { duration: 3200, delay: 300, easing: E, fill: 'both' }));
      if (sh) L.push(sh.animate([{ transform: 'translateX(-120%) skewX(-10deg)' }, { transform: 'translateX(260%) skewX(-10deg)', offset: .35 }, { transform: 'translateX(260%) skewX(-10deg)' }], { duration: 5200, delay: 2200, iterations: Infinity, easing: 'cubic-bezier(.4,0,.2,1)' }));
      const dial = sc.querySelector('[data-dial]'), ticks = sc.querySelector('[data-ticks]');
      if (dial) A.push(draw(dial, 1400, 300));
      if (ticks) A.push(ticks.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 700, delay: 1100, fill: 'both' }));
      const hh = sc.querySelector('[data-hand="h"]'), mm = sc.querySelector('[data-hand="m"]');
      if (hh && mm) {
        const ma = 720 + d.getMinutes() * 6, ha = 360 + (d.getHours() % 12) * 30 + d.getMinutes() * .5;
        A.push(mm.animate([{ transform: 'rotate(0deg)' }, { transform: `rotate(${ma}deg)` }], { duration: 2800, delay: 900, easing: 'cubic-bezier(.3,.1,.2,1)', fill: 'both' }));
        A.push(hh.animate([{ transform: 'rotate(0deg)' }, { transform: `rotate(${ha}deg)` }], { duration: 2800, delay: 900, easing: 'cubic-bezier(.3,.1,.2,1)', fill: 'both' }));
      }
      sc.querySelectorAll('[data-castle]').forEach((el, k) => A.push(draw(el, k ? 900 : 2600, k ? 1700 + k * 250 : 200)));
      const castle = sc.querySelector('[data-castle]');
      if (castle) A.push(castle.animate([{ fill: this.ajustar('rgba(198,161,91,0)') }, { fill: this.ajustar('rgba(198,161,91,.1)') }], { duration: 1000, delay: 2700, fill: 'both' }));
      const flags = sc.querySelector('[data-flags]');
      if (flags) { A.push(flags.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 700, delay: 2600, fill: 'both' }));
        sc.querySelectorAll('[data-flag]').forEach((f, k) => L.push(f.animate([{ transform: 'skewY(0deg)' }, { transform: 'skewY(-8deg)' }, { transform: 'skewY(0deg)' }], { duration: 1600 + k * 300, iterations: Infinity, easing: 'ease-in-out' }))); }
      sc.querySelectorAll('[data-star]').forEach((el, k) => L.push(el.animate([{ opacity: .15 }, { opacity: 1 }, { opacity: .15 }], { duration: 1800 + (k * 337) % 2600, delay: (k * 211) % 2000, iterations: Infinity, easing: 'ease-in-out' })));
      sc.querySelectorAll('[data-dust]').forEach((el, k) => L.push(el.animate([{ transform: 'translateY(0)', opacity: 0 }, { opacity: .9, offset: .4 }, { transform: `translate(${k % 2 ? 14 : -14}px,-90px)`, opacity: 0 }], { duration: 4200 + (k * 523) % 3000, delay: (k * 397) % 3000, iterations: Infinity, easing: 'ease-in-out' })));
      const sh6 = sc.querySelector('[data-shoot]');
      if (sh6) L.push(sh6.animate([{ transform: 'rotate(18deg) translateX(0)', opacity: 0 }, { opacity: 1, offset: .1 }, { transform: 'rotate(18deg) translateX(320px)', opacity: 0, offset: .32 }, { transform: 'rotate(18deg) translateX(320px)', opacity: 0 }], { duration: 5200, delay: 1600, iterations: Infinity, easing: 'cubic-bezier(.3,.1,.3,1)' }));
      A.forEach((a) => a.pause()); L.forEach((a) => a.pause());
      this.anims[i] = { A, L };
    });
    if (this.reduce) document.querySelectorAll('[data-frame],[data-tiara],[data-arch],[data-dial],[data-castle]').forEach((p) => (p.style.strokeDashoffset = 0));
  }

  playScene(i) {
    Object.keys(this.anims).forEach((k) => { if (+k !== i) this.anims[k].L.forEach((a) => a.pause()); });
    const S = this.anims[i]; if (!S) return;
    S.L.forEach((a) => a.play());
    if (S.played) return;
    S.played = true; S.A.forEach((a) => a.play());
  }

  archPath(cx, cy, a, hr) {
    const r = a / 2, b = a * hr, x0 = cx - r, y0 = cy - b / 2, yr = y0 + r;
    return `M${x0.toFixed(1)} ${(y0 + b).toFixed(1)} L${x0.toFixed(1)} ${yr.toFixed(1)} A${r.toFixed(1)} ${r.toFixed(1)} 0 0 1 ${(x0 + a).toFixed(1)} ${yr.toFixed(1)} L${(x0 + a).toFixed(1)} ${(y0 + b).toFixed(1)} Z`;
  }

  spark(x, y, big) {
    const s = document.createElement('span'), z = big ? 10 + Math.random() * 10 : 6 + Math.random() * 8;
    s.textContent = '✦';
    s.style.cssText = `position:absolute;left:${x}px;top:${y}px;font-size:${z}px;line-height:1;color:${Math.random() > .3 ? this.ajustar('#f1d9a4') : '#fff6e6'};transform:translate(-50%,-50%);pointer-events:none;`;
    this.sparkL.appendChild(s);
    const dx = (Math.random() * 2 - 1) * (big ? 90 : 26), dy = -10 - Math.random() * (big ? 110 : 36);
    s.animate([{ transform: 'translate(-50%,-50%) scale(0) rotate(0deg)', opacity: 0 }, { transform: 'translate(-50%,-50%) scale(1.1) rotate(45deg)', opacity: 1, offset: .3 },
      { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(0) rotate(120deg)`, opacity: 0 }], { duration: 800 + Math.random() * 700, easing: 'cubic-bezier(.2,.7,.3,1)' }).onfinish = () => s.remove();
  }

  go(dir) {
    const to = this.cur + dir;
    if (this.busy || to < 0 || to >= this.scenes.length) return;
    if (this.cur === 0 && dir > 0) return this.openGate();
    this.trans(to, dir);
  }

  openGate() {
    if (this.reduce) return this.trans(1, 1);
    this.busy = true;
    const sc = this.scenes[0], q = (s) => sc.querySelector(s), gate = q('[data-gate]'), crest = q('[data-crest]'), light = q('[data-light]');
    this.anims[0].L.forEach((a) => a.pause());
    sc.querySelectorAll('[data-o]').forEach((el) => el.animate([{ opacity: getComputedStyle(el).opacity }, { opacity: 0 }], { duration: 400, fill: 'forwards' }));
    crest.animate([{ transform: 'translate(-50%,-50%) scale(1)', opacity: 1 }, { transform: 'translate(-50%,-50%) scale(1.25)', opacity: 1, offset: .35 }, { transform: 'translate(-50%,-50%) scale(.2)', opacity: 0 }], { duration: 650, easing: 'cubic-bezier(.4,0,.2,1)', fill: 'forwards' });
    const doorE = { duration: 1500, delay: 380, easing: 'cubic-bezier(.55,0,.25,1)', fill: 'forwards' };
    q('[data-door="l"]').animate([{ transform: 'rotateY(0deg)' }, { transform: 'rotateY(-112deg)' }], doorE);
    q('[data-door="r"]').animate([{ transform: 'rotateY(0deg)' }, { transform: 'rotateY(112deg)' }], doorE);
    light.animate([{ filter: 'brightness(1)', boxShadow: this.ajustar('0 0 60px 10px rgba(246,222,176,.25)') }, { filter: 'brightness(1.25)', boxShadow: this.ajustar('0 0 140px 50px rgba(246,222,176,.55)') }], { duration: 1500, delay: 380, easing: 'ease', fill: 'forwards' });
    const rr = this.root.getBoundingClientRect(), g = gate.getBoundingClientRect();
    const cx = g.left + g.width / 2 - rr.left, cy = g.top + g.height / 2 - rr.top;
    for (let k = 0; k < 18; k++) setTimeout(() => this.spark(cx + (Math.random() * 2 - 1) * g.width * .4, cy + (Math.random() * 2 - 1) * g.height * .35, true), 500 + k * 60);
    setTimeout(() => this.trans(1, 1, { cx, cy, a0: g.width * .92, hr: 460 / 300 }), 1500);
  }

  trans(to, dir, o) {
    const from = this.cur, inc = this.scenes[to], out = this.scenes[from];
    this.cur = to; this.setState({ scene: to });
    if (this.reduce) { out.style.visibility = 'hidden'; out.style.zIndex = 1; inc.style.visibility = 'visible'; inc.style.zIndex = 2; this.playScene(to); this.busy = false; return; }
    this.busy = true;
    const W = this.root.clientWidth, H = this.root.clientHeight;
    const hr = o ? o.hr : 1.4, cx = o ? o.cx : W / 2, cy = o ? o.cy : H * .52, a0 = o ? o.a0 : 0;
    const aMax = Math.max(2 * Math.max(cx, W - cx), (2 * cy) / (hr - 1), (2 * (H - cy)) / hr) * 1.04;
    const top = dir > 0 ? inc : out;
    const P = {}; document.querySelectorAll('[data-ovp]').forEach((p) => (P[p.dataset.ovp] = p));
    if (dir > 0) { inc.style.visibility = 'visible'; inc.style.zIndex = 3; out.style.zIndex = 2; }
    else { inc.style.visibility = 'visible'; inc.style.zIndex = 2; out.style.zIndex = 3; }
    const t0 = performance.now(), dur = o ? 1700 : 1500; let played = false;
    const ease = (u) => (u < .5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);
    const loop = (now) => {
      const u = Math.min(1, (now - t0) / dur), e = ease(u);
      const a = dir > 0 ? a0 + (aMax - a0) * Math.pow(e, 1.35) : aMax * Math.pow(1 - e, 1.35);
      const d = this.archPath(cx, cy, Math.max(.1, a), hr);
      top.style.clipPath = `path('${d}')`;
      P.wide.setAttribute('d', d); P.thin.setAttribute('d', d);
      const fo = dir > 0 ? Math.max(0, 1 - Math.pow(e, 1.6) * 1.15) : Math.min(1, e * 1.5) * (1 - Math.pow(e, 6));
      P.wide.style.opacity = fo; P.thin.style.opacity = fo;
      if (fo > .2 && a > 4) {
        const r = a / 2, yr = cy - (a * hr) / 2 + r;
        for (let k = 0; k < 2; k++) {
          const th = Math.PI + Math.random() * Math.PI, x = cx + r * Math.cos(th), y = yr + r * Math.sin(th);
          if (x > -10 && x < W + 10 && y > -10 && y < H + 10) this.spark(x, y, false);
          else { const side = Math.random() > .5 ? cx + r : cx - r, sy = yr + Math.random() * (a * hr - r); if (side > 0 && side < W && sy > 0 && sy < H) this.spark(side, sy, false); }
        }
      }
      if (!played && (dir < 0 || e > .25)) { played = true; this.playScene(to); }
      if (u < 1) { this._raf = requestAnimationFrame(loop); return; }
      top.style.clipPath = 'none';
      inc.style.zIndex = 2; out.style.visibility = 'hidden'; out.style.zIndex = 1;
      P.wide.setAttribute('d', ''); P.thin.setAttribute('d', '');
      this.busy = false;
    };
    this._raf = requestAnimationFrame(loop);
  }

  n1() { return this.props.nome1 ?? 'Isabela'; }
  n2() { return this.props.nome2 ?? 'Henrique'; }

  renderVals() {
    const t = this.theme(), n1 = this.n1(), n2 = this.n2(), sc = this.state.scene, n = 7;
    const mode = this.props.modoNome ?? 'Nomes';
    const d = new Date(this.props.dataISO ?? '2026-10-31T16:30:00'), p2 = (x) => String(x).padStart(2, '0');
    const rnd = (k) => { const x = Math.sin(k * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
    const stars = (seed) => Array.from({ length: 34 }, (_, k) => ({ x: `${(rnd(seed + k) * 100).toFixed(1)}%`, y: `${(rnd(seed + k + 50) * 100).toFixed(1)}%`, z: `${(1 + rnd(seed + k + 99) * 2.2).toFixed(1)}px`, o: (.3 + rnd(seed + k + 7) * .6).toFixed(2) }));
    const frase = this.props.frase ?? 'Todo conto de fadas começa com um encontro. O nosso ganhou um para sempre.';
    const dark = sc === 0 || sc === n - 1;
    return {
      t, n1, n2, i1: n1.charAt(0).toUpperCase(), i2: n2.charAt(0).toUpperCase(),
      modeInitials: mode === 'Iniciais', modeNames: mode === 'Nomes', modeBoth: mode === 'Iniciais + nomes',
      words: frase.split(/\s+/).filter(Boolean),
      stars0: stars(1), stars6: stars(200),
      dust: Array.from({ length: 12 }, (_, k) => ({ x: `${(8 + rnd(k + 400) * 84).toFixed(1)}%`, y: `${(20 + rnd(k + 450) * 70).toFixed(1)}%`, z: `${(2 + rnd(k + 480) * 3).toFixed(1)}px` })),
      ticks: Array.from({ length: 12 }, (_, k) => { const a = (k * 30 - 90) * Math.PI / 180, big = k % 3 === 0, r1 = big ? 70 : 74, r2 = 80;
        return { x1: (100 + r1 * Math.cos(a)).toFixed(2), y1: (100 + r1 * Math.sin(a)).toFixed(2), x2: (100 + r2 * Math.cos(a)).toFixed(2), y2: (100 + r2 * Math.sin(a)).toFixed(2), w: big ? 2.4 : 1.2 }; }),
      dt: { weekday: d.toLocaleDateString('pt-BR', { weekday: 'long' }).split('-')[0], full: `${d.getDate()} de ${d.toLocaleDateString('pt-BR', { month: 'long' })} de ${d.getFullYear()}`, time: `${d.getHours()}h${p2(d.getMinutes())}` },
      siteUrl: this.props.siteUrl ?? '#',
      hintOp: sc > 0 && sc < n - 1 ? 1 : 0,
      dots: Array.from({ length: n }, (_, i) => ({ w: i === sc ? '22px' : '6px', bg: i === sc ? (dark ? '#e6cf9a' : '#3a2433') : (dark ? 'rgba(230,207,154,.4)' : 'rgba(58,36,51,.22)') }))
    };
  }
}
