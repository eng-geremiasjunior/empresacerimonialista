/* eslint-disable */
// @ts-nocheck
// A lógica do Convite 02, copiada LITERAL de design_handoff_convites/Convite 02.dc.html
// (class Component) por ferramentas/convites/extrair.mjs. Valores, tempos e curvas são os do
// desenho: não reinterpretar. A base DCLogic é o motor (../../motor/dc-logic).

import { DCLogic } from "../../motor/dc-logic";

export default class Convite02 extends DCLogic {
  state = { scene: 0 };
  cur = 0;

  theme() {
    const F = {
      essencial: { nf: "'Jost',sans-serif", nw: 300, ntt: 'uppercase', nls: '.12em', ns: 'normal', s: .62, nlh: 1.15, hf: "'Jost',sans-serif", hw: 300, htt: 'uppercase', hls: '.12em', hs: 'normal', hz: [22, 6, 30], tf: "'Hanken Grotesk',sans-serif", tz: 15, tw: 400 },
      maison: { nf: "'Bodoni Moda',serif", nw: 400, ntt: 'none', nls: '-.01em', ns: 'normal', s: .9, nlh: 1.05, hf: "'Bodoni Moda',serif", hw: 400, htt: 'none', hls: '0', hs: 'normal', hz: [30, 8.4, 40], tf: "'Figtree',sans-serif", tz: 15, tw: 400 },
      atelier: { nf: "'Italiana',serif", nw: 400, ntt: 'none', nls: '.03em', ns: 'normal', s: .9, nlh: 1.1, hf: "'Italiana',serif", hw: 400, htt: 'none', hls: '.03em', hs: 'normal', hz: [30, 8.4, 40], tf: "'EB Garamond',serif", tz: 18, tw: 400 },
      caligrafia: { nf: "'Pinyon Script',cursive", nw: 400, ntt: 'none', nls: '0', ns: 'normal', s: 1.05, nlh: 1.25, hf: "'Cormorant Garamond',serif", hw: 500, htt: 'none', hls: '0', hs: 'normal', hz: [32, 9, 42], tf: "'Cormorant Garamond',serif", tz: 18, tw: 500 },
      riviera: { nf: "'Monsieur La Doulaise',cursive", nw: 400, ntt: 'none', nls: '0', ns: 'normal', s: 1.25, nlh: 1.25, hf: "'Marcellus',serif", hw: 400, htt: 'none', hls: '.02em', hs: 'normal', hz: [26, 7.4, 34], tf: "'Marcellus',serif", tz: 16, tw: 400 },
      bilhete: { nf: "'Sacramento',cursive", nw: 400, ntt: 'none', nls: '0', ns: 'normal', s: 1.12, nlh: 1.2, hf: "'Lora',serif", hw: 400, htt: 'none', hls: '0', hs: 'italic', hz: [28, 8, 36], tf: "'Lora',serif", tz: 16, tw: 400 },
      soiree: { nf: "'Poiret One',sans-serif", nw: 400, ntt: 'uppercase', nls: '.1em', ns: 'normal', s: .68, nlh: 1.15, hf: "'Poiret One',sans-serif", hw: 400, htt: 'uppercase', hls: '.1em', hs: 'normal', hz: [22, 6, 28], tf: "'Josefin Sans',sans-serif", tz: 16, tw: 400 },
      relicario: { nf: "'Playfair Display',serif", nw: 400, ntt: 'none', nls: '0', ns: 'italic', s: .9, nlh: 1.1, hf: "'Playfair Display',serif", hw: 400, htt: 'none', hls: '0', hs: 'normal', hz: [30, 8.4, 40], tf: "'Libre Baskerville',serif", tz: 15, tw: 400 }
    };
    const key = String(this.props.fonte ?? '06 Bilhete').split(' ').slice(1).join(' ').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const f = F[key] || F.bilhete, s = f.s, hz = f.hz;
    const c = (a, b, m) => `clamp(${Math.round(a * s)}px, ${(b * s).toFixed(2)}vw, ${Math.round(m * s)}px)`;
    return { nameFont: f.nf, nameWeight: f.nw, nameTT: f.ntt, nameLS: f.nls, nameStyle: f.ns, nameLH: f.nlh,
      nameSize: c(60, 17, 96), nameSizeSm: c(38, 11, 58), initSize: c(96, 28, 150), initSizeSm: c(64, 18, 100), sunMono: `${Math.round(34 * s)}px`,
      headFont: f.hf, headWeight: f.hw, headTT: f.htt, headLSsoft: f.htt === 'uppercase' ? '.06em' : f.hls, headStyle: f.hs,
      headSize: `clamp(${hz[0]}px, ${hz[1]}vw, ${hz[2]}px)`, textFont: f.tf, textSize: `${f.tz}px`, textWeight: f.tw };
  }

  componentDidMount() {
    this.reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.root = document.querySelector('[data-root]');
    this.scenes = [...document.querySelectorAll('[data-scene]')].sort((a, b) => a.dataset.scene - b.dataset.scene);
    const g = document.querySelector('[data-grain]');
    if (g) g.style.backgroundImage = `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 .42 0 0 0 0 .34 0 0 0 0 .24 0 0 0 .16 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>")`;
    this.prep();
    this.playScene(0);
    this.onClick = (e) => { if (e.target.closest && e.target.closest('a,button')) return; this.go(1); };
    this.onWheel = (e) => { const n = performance.now(); if (n - (this._wt || 0) < 900 || Math.abs(e.deltaY) < 24) return; this._wt = n; this.go(e.deltaY > 0 ? 1 : -1); };
    this.onTS = (e) => { this._ty = e.touches[0].clientY; this._tm = false; };
    this.onTE = (e) => { const dy = e.changedTouches[0].clientY - (this._ty ?? 0); if (Math.abs(dy) > 50) { this._tm = true; this.go(dy < 0 ? 1 : -1); } };
    this.onClickCap = (e) => { if (this._tm) { this._tm = false; e.stopPropagation(); } };
    this.root.addEventListener('click', this.onClickCap, true);
    this.root.addEventListener('click', this.onClick);
    this.root.addEventListener('wheel', this.onWheel, { passive: true });
    this.root.addEventListener('touchstart', this.onTS, { passive: true });
    this.root.addEventListener('touchend', this.onTE, { passive: true });
  }
  componentWillUnmount() {
    const r = this.root; if (!r) return;
    r.removeEventListener('click', this.onClickCap, true); r.removeEventListener('click', this.onClick);
    r.removeEventListener('wheel', this.onWheel); r.removeEventListener('touchstart', this.onTS); r.removeEventListener('touchend', this.onTE);
    cancelAnimationFrame(this._raf); cancelAnimationFrame(this._praf);
  }

  prep() {
    this.anims = {};
    const E = 'cubic-bezier(.2,.7,.2,1)';
    this.scenes.forEach((sc, i) => {
      const A = [], L = [];
      if (this.reduce) { this.anims[i] = { A, L }; return; }
      sc.querySelectorAll('[data-in]').forEach((el, k) => A.push(el.animate([{ opacity: 0, transform: 'translateY(16px)', filter: 'blur(7px)' }, { opacity: 1, transform: 'none', filter: 'blur(0)' }], { duration: 1200, delay: (i === 0 ? 1800 : 260) + k * 200, easing: E, fill: 'both' })));
      sc.querySelectorAll('[data-o]').forEach((el, k) => A.push(el.animate([{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'none' }], { duration: 1200, delay: k ? 3000 : 200, easing: E, fill: 'both' })));
      sc.querySelectorAll('[data-w]').forEach((el, k) => A.push(el.animate([{ opacity: 0, transform: 'translateY(18px) rotate(2deg)', filter: 'blur(6px)' }, { opacity: 1, transform: 'none', filter: 'blur(0)' }], { duration: 1100, delay: 320 + k * 75 + Math.sin(k * .8) * 50, easing: E, fill: 'both' })));
      sc.querySelectorAll('[data-hz]').forEach((el) => A.push(el.animate([{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], { duration: 1500, delay: i === 0 ? 300 : 150, easing: 'cubic-bezier(.6,0,.2,1)', fill: 'both' })));
      sc.querySelectorAll('[data-sun]').forEach((el) => A.push(el.animate([{ transform: 'translateY(110%)' }, { transform: 'none' }], { duration: 2600, delay: i === 0 ? 700 : 300, easing: 'cubic-bezier(.25,.6,.2,1)', fill: 'both' })));
      sc.querySelectorAll('[data-sunset]').forEach((el) => A.push(el.animate([{ transform: 'translateY(-40%)' }, { transform: 'translateY(18%)' }], { duration: 9000, delay: 200, easing: 'cubic-bezier(.3,.1,.3,1)', fill: 'both' })));
      sc.querySelectorAll('[data-refl]').forEach((el, k) => {
        A.push(el.animate([{ opacity: 0 }, {}], { duration: 900, delay: (i === 0 ? 1900 : 1100) + k * 140, easing: 'ease', fill: 'both' }));
        L.push(el.animate([{ transform: 'scaleX(1) translateX(0)' }, { transform: `scaleX(.62) translateX(${k % 2 ? 6 : -6}px)` }, { transform: 'scaleX(1) translateX(0)' }], { duration: 2200 + k * 380, iterations: Infinity, easing: 'ease-in-out' }));
      });
      sc.querySelectorAll('[data-wl]').forEach((el) => L.push(el.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(60px)' }], { duration: 2600, iterations: Infinity, easing: 'linear' })));
      sc.querySelectorAll('[data-cau]').forEach((el, k) => L.push(el.animate([{ transform: 'translate(0,0) scale(1)' }, { transform: `translate(${k ? -40 : 50}px,${k ? -30 : 40}px) scale(1.2)` }], { duration: 6000 + k * 2200, iterations: Infinity, direction: 'alternate', easing: 'ease-in-out' })));
      sc.querySelectorAll('[data-rip]').forEach((el, k) => L.push(el.animate([{ transform: 'scale(.25)', opacity: 0 }, { opacity: .9, offset: .2 }, { transform: 'scale(1.5)', opacity: 0 }], { duration: 5400, delay: k * 1800, iterations: Infinity, easing: 'cubic-bezier(.2,.6,.3,1)' })));
      const pz = sc.querySelector('[data-pz]');
      if (pz) A.push(pz.animate([{ transform: 'scale(1.22)' }, { transform: 'scale(1)' }], { duration: 3200, delay: 200, easing: E, fill: 'both' }));
      A.forEach((a) => a.pause()); L.forEach((a) => a.pause());
      this.anims[i] = { A, L };
    });
    if (this.reduce) document.querySelectorAll('[data-photo]').forEach((p) => (p.style.clipPath = 'none'));
  }

  playScene(i) {
    const S = this.anims[i];
    Object.keys(this.anims).forEach((k) => { if (+k !== i) this.anims[k].L.forEach((a) => a.pause()); });
    if (!S) return;
    S.L.forEach((a) => a.play());
    if (S.played) return;
    S.played = true; S.A.forEach((a) => a.play());
    const ph = this.scenes[i].querySelector('[data-photo]');
    if (ph && !this.reduce) this.photoTide(ph);
  }

  wave(W, y, A, ph) {
    const n = Math.max(24, Math.ceil(W / 14)), pts = [];
    for (let k = 0; k <= n; k++) {
      const u = k / n, x = u * W;
      pts.push([x, y + A * Math.sin(u * Math.PI * 2 * 1.15 + ph) + A * .38 * Math.sin(u * Math.PI * 2 * 3.2 - ph * 1.7)]);
    }
    return pts;
  }
  pd(pts) { return pts.map((p, k) => (k ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' '); }

  photoTide(el) {
    const W = el.offsetWidth, H = el.offsetHeight, A = Math.max(8, H * .03), t0 = performance.now(), dur = 1900;
    const loop = (now) => {
      const u = Math.max(0, Math.min(1, (now - t0) / dur)), e = 1 - Math.pow(1 - u, 3), y = H + A * 2 - e * (H + A * 4), pts = this.wave(W, y, A, (now - t0) * .005);
      el.style.clipPath = `path('${this.pd(pts)} L${W} ${H + 40} L0 ${H + 40} Z')`;
      if (u < 1) this._praf = requestAnimationFrame(loop); else el.style.clipPath = 'none';
    };
    this._praf = requestAnimationFrame(loop);
  }

  go(dir) {
    const to = this.cur + dir;
    if (this.busy || to < 0 || to >= this.scenes.length) return;
    this.tide(to, dir);
  }

  tide(to, dir) {
    const from = this.cur, inc = this.scenes[to], out = this.scenes[from];
    this.cur = to; this.setState({ scene: to });
    if (this.reduce) { out.style.visibility = 'hidden'; out.style.zIndex = 1; inc.style.visibility = 'visible'; inc.style.zIndex = 2; this.playScene(to); return; }
    this.busy = true;
    const W = this.root.clientWidth, H = this.root.clientHeight, A = Math.min(30, H * .036), band = Math.min(70, H * .085);
    const P = {}; document.querySelectorAll('[data-tw]').forEach((p) => (P[p.dataset.tw] = p));
    inc.style.visibility = 'visible'; inc.style.zIndex = 3; out.style.zIndex = 2;
    const t0 = performance.now(), dur = 1600; let played = false;
    const ease = (u) => (u < .5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);
    const loop = (now) => {
      const u = Math.max(0, Math.min(1, (now - t0) / dur)), e = ease(u), ph = (now - t0) * .0055;
      const y = dir > 0 ? H + A * 2 + band - e * (H + A * 4 + band * 2) : -A * 2 - band + e * (H + A * 4 + band * 2);
      const edge = this.wave(W, y, A, ph), ahead = this.wave(W, y - dir * band * (1 - e * .4), A * .8, ph + .9);
      const foam2 = this.wave(W, y + dir * 12, A * .9, ph - .5);
      inc.style.clipPath = dir > 0 ? `path('${this.pd(edge)} L${W} ${H + 60} L0 ${H + 60} Z')` : `path('M0 -60 L${W} -60 ${this.pd(edge.slice().reverse()).replace('M', 'L')} Z')`;
      P.band.setAttribute('d', this.pd(edge) + ' ' + this.pd(ahead.slice().reverse()).replace('M', 'L') + ' Z');
      P.foam.setAttribute('d', this.pd(edge)); P.foam2.setAttribute('d', this.pd(foam2));
      const fo = Math.sin(Math.PI * Math.min(1, u * 1.05)); P.foam.style.opacity = fo; P.band.style.opacity = fo; P.foam2.style.opacity = fo;
      if (!played && e > .28) { played = true; this.playScene(to); }
      if (u < 1) { this._raf = requestAnimationFrame(loop); return; }
      inc.style.clipPath = 'none'; inc.style.zIndex = 2; out.style.visibility = 'hidden'; out.style.zIndex = 1;
      ['band', 'foam', 'foam2'].forEach((k) => P[k].setAttribute('d', ''));
      this.busy = false;
    };
    this._raf = requestAnimationFrame(loop);
  }

  n1() { return this.props.nome1 ?? 'Marina'; }
  n2() { return this.props.nome2 ?? 'Theo'; }

  renderVals() {
    const t = this.theme(), n1 = this.n1(), n2 = this.n2(), sc = this.state.scene, n = 7;
    const mode = this.props.modoNome ?? 'Nomes';
    const d = new Date(this.props.dataISO ?? '2026-10-31T16:30:00'), p2 = (x) => String(x).padStart(2, '0');
    const refl = (top0, gap, widths, ops) => widths.map((w, k) => ({ top: `${top0 + k * gap}px`, w: `${w}px`, ml: `${-w / 2}px`, op: ops[k] }));
    const frase = this.props.frase ?? 'Que o nosso amor seja como o mar: imenso, sereno e sempre de volta.';
    return {
      t, n1, n2, i1: n1.charAt(0).toUpperCase(), i2: n2.charAt(0).toUpperCase(),
      modeInitials: mode === 'Iniciais', modeNames: mode === 'Nomes', modeBoth: mode === 'Iniciais + nomes',
      words: frase.split(/\s+/).filter(Boolean),
      dt: { weekday: d.toLocaleDateString('pt-BR', { weekday: 'long' }).split('-')[0], day: p2(d.getDate()), year: String(d.getFullYear()),
        month: d.toLocaleDateString('pt-BR', { month: 'long' }), time: `${d.getHours()}h${p2(d.getMinutes())}` },
      refl: refl(162, 13, [130, 96, 70, 44, 22], [.85, .7, .55, .4, .28]),
      reflBig: refl(184, 14, [170, 128, 92, 58, 28], [.85, .7, .55, .4, .28]),
      reflSea: refl(16, 16, [150, 118, 90, 64, 40, 20], [.85, .7, .58, .45, .32, .2]),
      siteUrl: this.props.siteUrl ?? '#',
      hintOp: sc > 0 && sc < n - 1 ? 1 : 0,
      dots: Array.from({ length: n }, (_, i) => ({ w: i === sc ? '22px' : '6px', bg: i === sc ? '#1f3d44' : 'rgba(31,61,68,.25)' }))
    };
  }
}
