/* eslint-disable */
// @ts-nocheck
// A lógica do Convite 05, copiada LITERAL de design_handoff_convites/Convite 05.dc.html
// (class Component) por ferramentas/convites/extrair.mjs. Valores, tempos e curvas são os do
// desenho: não reinterpretar. A base DCLogic é o motor (../../motor/dc-logic).

import { DCLogic } from "../../motor/dc-logic";

export default class Convite05 extends DCLogic {
  state = { scene: 0 };
  cur = 0;
  restR = 0;
  curlT0 = Infinity;

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
    const key = String(this.props.fonte ?? '08 Relicário').split(' ').slice(1).join(' ').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const f = F[key] || F.relicario, s = f.s, hz = f.hz;
    const c = (a, b, m) => `clamp(${Math.round(a * s)}px, ${(b * s).toFixed(2)}vw, ${Math.round(m * s)}px)`;
    return { nameFont: f.nf, nameWeight: f.nw, nameTT: f.ntt, nameLS: f.nls, nameStyle: f.ns, nameLH: f.nlh,
      nameSize: `min(${c(60, 17, 96)}, ${(10.5 * s).toFixed(1)}svh)`, nameSizeSm: c(38, 11, 58), initSize: `min(${c(96, 28, 150)}, ${(17 * s).toFixed(1)}svh)`, initSizeSm: c(64, 18, 100), monoSize: `min(${c(64, 17, 84)}, ${(8.5 * s).toFixed(1)}svh)`,
      headFont: f.hf, headWeight: f.hw, headTT: f.htt, headLSsoft: f.htt === 'uppercase' ? '.06em' : f.hls, headStyle: f.hs,
      headSize: `clamp(${hz[0]}px, ${hz[1]}vw, ${hz[2]}px)`, textFont: f.tf, textSize: `${f.tz}px`, textWeight: f.tw };
  }

  textures() {
    const noise = (r, g, b, a, fr) => `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='220' height='220'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='${fr}' numOctaves='3' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 ${r} 0 0 0 0 ${g} 0 0 0 0 ${b} 0 0 0 ${a} 0'/></filter><rect width='100%' height='100%' filter='url(#n)'/></svg>`)}")`;
    const paper = [noise(.36, .22, .08, .42, .9), noise(.4, .24, .08, .55, .012), noise(.3, .18, .06, .22, .045),
      'radial-gradient(circle at 18% 22%, rgba(120,70,25,.35) 0 2px, transparent 3px)', 'radial-gradient(circle at 23% 27%, rgba(120,70,25,.28) 0 1.5px, transparent 2.5px)', 'radial-gradient(circle at 74% 64%, rgba(120,70,25,.3) 0 2.5px, transparent 4px)', 'radial-gradient(circle at 70% 69%, rgba(120,70,25,.22) 0 1.5px, transparent 2.5px)', 'radial-gradient(circle at 40% 82%, rgba(120,70,25,.25) 0 2px, transparent 3px)', 'radial-gradient(circle at 88% 38%, rgba(120,70,25,.25) 0 1.5px, transparent 2.5px)',
      'radial-gradient(circle at 80% 18%, transparent 0 52px, rgba(115,68,24,.22) 54px, rgba(115,68,24,.1) 58px, transparent 61px)',
      'linear-gradient(104deg, transparent 0 61.6%, rgba(90,52,18,.16) 61.8%, rgba(255,245,220,.22) 62.1%, transparent 62.5%)',
      'linear-gradient(180deg, transparent 0 37.7%, rgba(90,52,18,.12) 37.85%, rgba(255,245,220,.18) 38.1%, transparent 38.4%)',
      'radial-gradient(ellipse at 86% 10%, rgba(130,80,28,.3), transparent 30%)', 'radial-gradient(ellipse at 10% 90%, rgba(125,75,25,.32), transparent 40%)', 'radial-gradient(ellipse at 55% 45%, rgba(255,240,205,.25), transparent 45%)',
      'linear-gradient(90deg, rgba(65,36,12,.42), rgba(65,36,12,0) 8%)'].join(',');
    const leather = [noise(.08, .05, .02, .55, .9), this.ajustar('radial-gradient(ellipse at 30% 22%, rgba(200,150,100,.16), transparent 55%)'), 'radial-gradient(ellipse at 80% 85%, rgba(0,0,0,.4), transparent 60%)', this.ajustar('radial-gradient(ellipse at 62% 42%, rgba(120,80,50,.22), transparent 45%)')].join(',');
    document.querySelectorAll('[data-paper]').forEach((el) => (el.style.backgroundImage = paper));
    document.querySelectorAll('[data-leather]').forEach((el) => (el.style.backgroundImage = leather));
  }

  componentDidMount() {
    this.reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.root = document.querySelector('[data-root]');
    this.flapov = document.querySelector('[data-flapov]');
    this.grad = document.getElementById('c05g');
    this.scenes = [...document.querySelectorAll('[data-scene]')].sort((a, b) => a.dataset.scene - b.dataset.scene);
    this.textures();
    this.layout();
    this.prep();
    this.playScene(0);
    this.onResize = () => { if (this.cur === 0 && !this.busy) this.layout(); };
    window.addEventListener('resize', this.onResize);
    this.onClick = (e) => { if (e.target.closest && e.target.closest('a,button')) return; this.go(1); };
    this.onWheel = (e) => { const n = performance.now(); if (n - (this._wt || 0) < 900 || Math.abs(e.deltaY) < 24) return; this._wt = n; this.go(e.deltaY > 0 ? 1 : -1); };
    this.onTS = (e) => { this._ty = e.touches[0].clientY; this._tm = false; };
    this.onTE = (e) => { const dy = e.changedTouches[0].clientY - (this._ty ?? 0); if (Math.abs(dy) > 50) { this._tm = true; this.go(dy < 0 ? 1 : -1); } };
    this.onClickCap = (e) => { if (this._tm) { this._tm = false; e.stopPropagation(); } };
    const r = this.root;
    r.addEventListener('click', this.onClickCap, true); r.addEventListener('click', this.onClick);
    r.addEventListener('wheel', this.onWheel, { passive: true });
    r.addEventListener('touchstart', this.onTS, { passive: true }); r.addEventListener('touchend', this.onTE, { passive: true });
    const loop = (now) => {
      this._loop = requestAnimationFrame(loop);
      if (this.busy || this.cur < 1 || this.cur > 5) return;
      const k = Math.min(1, Math.max(0, (now - this.curlT0) / 900)), ke = 1 - Math.pow(1 - k, 3);
      const rr = this.reduce ? (k > 0 ? 34 : 0) : ke * (32 + 7 * Math.sin((now - this.curlT0) / 430));
      this.restR = rr;
      this.peel(this.scenes[this.cur], this.restP(rr));
    };
    this._loop = requestAnimationFrame(loop);
  }
  componentWillUnmount() {
    cancelAnimationFrame(this._loop); cancelAnimationFrame(this._raf);
    window.removeEventListener('resize', this.onResize);
    const r = this.root; if (!r) return;
    r.removeEventListener('click', this.onClickCap, true); r.removeEventListener('click', this.onClick);
    r.removeEventListener('wheel', this.onWheel); r.removeEventListener('touchstart', this.onTS); r.removeEventListener('touchend', this.onTE);
  }

  layout() {
    const b = document.querySelector('[data-book]').getBoundingClientRect(), [W, H] = this.dims(), s1 = this.scenes[1];
    this.k0 = b.height / H; this.X0 = Math.max(0, (W - b.width / this.k0) / 2);
    s1.style.transform = `scale(${this.k0})`;
    s1.style.clipPath = `inset(0 ${this.X0}px)`;
    s1.style.visibility = 'visible';
  }

  prep() {
    this.anims = {};
    const E = 'cubic-bezier(.2,.7,.2,1)', D = 'cubic-bezier(.55,0,.25,1)';
    const key = document.querySelector('[data-key]');
    if (!this.reduce) this.keyIdle = key.animate([{ transform: 'rotate(-7deg)' }, { transform: 'rotate(7deg)' }], { duration: 1500, iterations: Infinity, direction: 'alternate', easing: 'ease-in-out' });
    this.scenes.forEach((sc, i) => {
      const A = [];
      if (this.reduce) { this.anims[i] = { A }; return; }
      sc.querySelectorAll('[data-in]').forEach((el, k) => A.push(el.animate([{ opacity: 0, transform: 'translateY(12px)', filter: 'blur(6px)' }, { opacity: 1, transform: 'none', filter: 'blur(0)' }], { duration: 1200, delay: 450 + k * 220, easing: E, fill: 'both' })));
      sc.querySelectorAll('[data-ink]').forEach((el, k) => A.push(el.animate([{ clipPath: 'inset(-20% 100% -20% 0)', filter: 'blur(3px)', opacity: .4 }, { clipPath: 'inset(-20% -6% -20% 0)', filter: 'blur(0)', opacity: 1 }], { duration: 1500, delay: 150 + k * 350, easing: 'cubic-bezier(.45,.05,.35,1)', fill: 'both' })));
      sc.querySelectorAll('[data-o]').forEach((el, k) => A.push(el.animate([{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: 1200, delay: k ? 1400 : 400, easing: E, fill: 'both' })));
      sc.querySelectorAll('[data-draw]').forEach((el, k) => A.push(el.animate([{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], { duration: el.closest('mask') ? 2200 : 1500, delay: 300 + k * 140, easing: D, fill: 'both' })));
      const cap = sc.querySelector('[data-cap]');
      if (cap) A.push(cap.animate([{ opacity: 0, filter: 'blur(10px)', transform: 'scale(1.3)' }, { opacity: 1, filter: 'blur(0)', transform: 'none' }], { duration: 1400, delay: 400, easing: E, fill: 'both' }));
      sc.querySelectorAll('[data-w]').forEach((el, k) => A.push(el.animate([{ opacity: 0, filter: 'blur(6px)' }, { opacity: 1, filter: 'blur(0)' }], { duration: 1000, delay: 800 + k * 90, easing: E, fill: 'both' })));
      const pin = sc.querySelector('[data-pin]'), ph = sc.querySelector('[data-photo]');
      if (pin) A.push(pin.animate([{ opacity: 0, transform: 'rotate(-7deg) translateY(30px) scale(.94)' }, { opacity: 1, transform: 'rotate(-2deg)' }], { duration: 1300, delay: 300, easing: 'cubic-bezier(.3,1.3,.5,1)', fill: 'both' }));
      if (ph) A.push(ph.animate([{ filter: 'sepia(1) contrast(.85) brightness(1.08)' }, { filter: 'sepia(1) contrast(.85) brightness(1.08)', offset: .3 }, { filter: 'sepia(.12) contrast(1) brightness(1)' }], { duration: 3600, delay: 300, easing: 'ease-in-out', fill: 'both' }));
      const x = sc.querySelector('[data-x]');
      if (x) A.push(x.animate([{ opacity: 0, transform: 'scale(.4)', transformOrigin: '222px 22px' }, { opacity: 1, transform: 'scale(1)', transformOrigin: '222px 22px' }], { duration: 600, delay: 2300, easing: 'cubic-bezier(.34,1.56,.64,1)', fill: 'both' }));
      A.forEach((a) => a.pause());
      this.anims[i] = { A };
    });
    if (this.reduce) document.querySelectorAll('[data-draw]').forEach((p) => (p.style.strokeDashoffset = 0));
  }

  playScene(i) {
    const S = this.anims[i]; if (!S || S.played) return;
    S.played = true; S.A.forEach((a) => a.play());
  }

  dims() { return [this.root.clientWidth, this.root.clientHeight]; }
  restP(r) { const [W, H] = this.dims(); return [W - r, H - r * 1.15]; }

  clip(poly, g) {
    const out = [];
    for (let i = 0; i < poly.length; i++) {
      const A = poly[i], B = poly[(i + 1) % poly.length], ga = g(A), gb = g(B);
      if (ga >= 0) out.push(A);
      if ((ga >= 0) !== (gb >= 0)) { const t = ga / (ga - gb); out.push([A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t]); }
    }
    return out;
  }

  peel(page, P) {
    const [W, H] = this.dims(), dx = W - P[0], dy = H - P[1], L = Math.hypot(dx, dy);
    if (L < .5) { page.style.clipPath = 'none'; this.flapov.setAttribute('d', ''); return; }
    const n = [dx / L, dy / L], M = [(W + P[0]) / 2, (H + P[1]) / 2];
    const f = (X) => (X[0] - M[0]) * n[0] + (X[1] - M[1]) * n[1];
    const rect = [[0, 0], [W, 0], [W, H], [0, H]];
    const vis = this.clip(rect, (X) => -f(X)), cut = this.clip(rect, f);
    page.style.clipPath = vis.length > 2 ? `polygon(${vis.map((p) => `${p[0].toFixed(1)}px ${p[1].toFixed(1)}px`).join(',')})` : 'polygon(0 0,0 0,0 0)';
    if (cut.length < 3) { this.flapov.setAttribute('d', ''); return; }
    const fl = cut.map((X) => { const d = f(X); return [X[0] - 2 * d * n[0], X[1] - 2 * d * n[1]]; });
    this.flapov.setAttribute('d', 'M' + fl.map((p) => p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join('L') + 'Z');
    const g = this.grad;
    g.setAttribute('x1', M[0].toFixed(1)); g.setAttribute('y1', M[1].toFixed(1));
    g.setAttribute('x2', (M[0] - n[0] * L / 2).toFixed(1)); g.setAttribute('y2', (M[1] - n[1] * L / 2).toFixed(1));
  }

  go(dir) {
    if (this.busy) return;
    if (this.cur === 0) { if (dir > 0) this.openBook(); return; }
    const to = this.cur + dir;
    if (to < 1 || to > 6) return;
    dir > 0 ? this.turnFwd() : this.turnBack();
  }

  setCur(i) { this.cur = i; this.setState({ scene: i }); }

  openBook() {
    this.busy = true;
    const s0 = this.scenes[0], s1 = this.scenes[1], wrap = document.querySelector('[data-coverwrap]');
    const cover = wrap.querySelector('[data-cover]'), strap = wrap.querySelector('[data-strap]'), key = wrap.querySelector('[data-key]'), shade = wrap.querySelector('[data-cshade]'), stack = s0.querySelector('[data-stackwrap]');
    const done = () => {
      s1.style.transform = 'none'; s1.style.clipPath = 'none';
      s1.getAnimations().forEach((a) => a.cancel());
      wrap.style.display = 'none'; s0.style.visibility = 'hidden';
      const n = this.scenes[2]; n.style.visibility = 'visible'; n.style.zIndex = 2;
      this.setCur(1); this.playScene(1);
      this.curlT0 = performance.now() + (this.reduce ? 0 : 1800);
      this.busy = false;
    };
    if (this.reduce) return done();
    s0.querySelectorAll('[data-o]').forEach((el) => el.animate([{ opacity: getComputedStyle(el).opacity }, { opacity: 0 }], { duration: 450, fill: 'forwards' }));
    if (this.keyIdle) this.keyIdle.cancel();
    key.animate([{ transform: 'rotate(0deg) rotateY(0deg)' }, { transform: 'rotate(0deg) rotateY(180deg)', offset: .55 }, { transform: 'translateY(26px) rotateY(180deg)', opacity: 0 }], { duration: 1000, easing: 'cubic-bezier(.45,0,.3,1)', fill: 'forwards' });
    strap.animate([{ transform: 'translateX(0)', opacity: 1 }, { transform: 'translateX(118%)', opacity: 0 }], { duration: 950, delay: 750, easing: 'cubic-bezier(.55,0,.75,.2)', fill: 'forwards' });
    cover.animate([{ transform: 'rotateY(0deg)' }, { transform: 'rotateY(-166deg)' }], { duration: 1900, delay: 1500, easing: 'cubic-bezier(.6,0,.3,1)', fill: 'forwards' });
    shade.animate([{ opacity: 0 }, { opacity: .55 }], { duration: 1000, delay: 1500, easing: 'ease-in', fill: 'forwards' });
    setTimeout(() => this.playScene(1), 2100);
    const zd = 3300;
    s1.animate([{ transform: `scale(${this.k0})`, clipPath: `inset(0 ${this.X0}px)` }, { transform: 'scale(1)', clipPath: 'inset(0 0px)' }], { duration: 1500, delay: zd, easing: 'cubic-bezier(.6,0,.2,1)', fill: 'forwards' });
    wrap.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 700, delay: zd, fill: 'forwards' });
    stack.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 900, delay: zd, fill: 'forwards' });
    setTimeout(done, zd + 1560);
  }

  turnFwd() {
    const i = this.cur, page = this.scenes[i], nxt = this.scenes[i + 1], n2 = this.scenes[i + 2];
    this.busy = true;
    nxt.style.visibility = 'visible'; nxt.style.zIndex = 2;
    this.setCur(i + 1);
    const finish = () => {
      page.style.visibility = 'hidden'; page.style.zIndex = 1; page.style.clipPath = 'none'; this.flapov.setAttribute('d', '');
      nxt.style.zIndex = 3;
      if (n2) { n2.style.visibility = 'visible'; n2.style.zIndex = 2; }
      this.curlT0 = performance.now() + (this.reduce ? 0 : 1400); this.restR = 0;
      this.busy = false;
    };
    if (this.reduce) { this.playScene(i + 1); return finish(); }
    const [W, H] = this.dims(), P0 = this.restP(this.restR), P1 = [-1.3 * W, H];
    const t0 = performance.now(), dur = 1400; let played = false;
    const ease = (u) => (u < .5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);
    const step = (now) => {
      const u = Math.min(1, (now - t0) / dur), e = ease(u);
      this.peel(page, [P0[0] + (P1[0] - P0[0]) * e, P0[1] + (P1[1] - P0[1]) * e - Math.sin(Math.PI * e) * H * .16]);
      if (!played && e > .4) { played = true; this.playScene(i + 1); }
      if (u < 1) { this._raf = requestAnimationFrame(step); return; }
      finish();
    };
    this._raf = requestAnimationFrame(step);
  }

  turnBack() {
    const i = this.cur, page = this.scenes[i], prev = this.scenes[i - 1], after = this.scenes[i + 1];
    this.busy = true;
    page.style.clipPath = 'none'; this.flapov.setAttribute('d', '');
    prev.style.visibility = 'visible'; prev.style.zIndex = 4;
    this.setCur(i - 1);
    const finish = () => {
      prev.style.clipPath = 'none'; this.flapov.setAttribute('d', '');
      prev.style.zIndex = 3; page.style.zIndex = 2;
      if (after) { after.style.visibility = 'hidden'; after.style.zIndex = 1; }
      this.curlT0 = performance.now() + (this.reduce ? 0 : 500); this.restR = 0;
      this.busy = false;
    };
    if (this.reduce) return finish();
    const [W, H] = this.dims(), P0 = [W, H], P1 = [-1.3 * W, H];
    this.peel(prev, P1);
    const t0 = performance.now(), dur = 1300;
    const ease = (u) => (u < .5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);
    const step = (now) => {
      const u = Math.min(1, (now - t0) / dur), e = 1 - ease(u);
      this.peel(prev, [P0[0] + (P1[0] - P0[0]) * e, P0[1] + (P1[1] - P0[1]) * e - Math.sin(Math.PI * e) * H * .16]);
      if (u < 1) { this._raf = requestAnimationFrame(step); return; }
      finish();
    };
    this._raf = requestAnimationFrame(step);
  }

  renderVals() {
    const t = this.theme(), n1 = this.props.nome1 ?? 'Helena', n2 = this.props.nome2 ?? 'Miguel', sc = this.state.scene, n = 7;
    const mode = this.props.modoNome ?? 'Nomes';
    const d = new Date(this.props.dataISO ?? '2027-04-17T16:00:00'), p2 = (x) => String(x).padStart(2, '0');
    const frase = (this.props.frase ?? 'Há histórias que já nascem escritas. A nossa estava só esperando por este capítulo.').trim();
    const dark = sc === 0 || sc === n - 1;
    return {
      t, n1, n2, i1: n1.charAt(0).toUpperCase(), i2: n2.charAt(0).toUpperCase(),
      modeInitials: mode === 'Iniciais', modeNames: mode === 'Nomes', modeBoth: mode === 'Iniciais + nomes',
      cap: frase.charAt(0), words: frase.slice(1).split(/\s+/).filter(Boolean),
      dt: { weekday: d.toLocaleDateString('pt-BR', { weekday: 'long' }).split('-')[0], day: p2(d.getDate()), month: d.toLocaleDateString('pt-BR', { month: 'long' }), year: d.getFullYear(),
        short: `${p2(d.getDate())} · ${p2(d.getMonth() + 1)} · ${d.getFullYear()}`, time: `${d.getHours()}h${p2(d.getMinutes())}` },
      siteUrl: this.props.siteUrl ?? '#',
      hintOp: sc > 0 && sc < n - 1 ? 1 : 0,
      dots: Array.from({ length: n }, (_, i) => ({ w: i === sc ? '22px' : '6px', bg: i === sc ? (dark ? '#d9b97f' : '#3b2a1a') : (dark ? 'rgba(217,185,127,.4)' : 'rgba(59,42,26,.22)') }))
    };
  }
}
