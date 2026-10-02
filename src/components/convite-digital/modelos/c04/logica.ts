/* eslint-disable */
// @ts-nocheck
// A lógica do Convite 04, copiada LITERAL de design_handoff_convites/Convite 04.dc.html
// (class Component) por ferramentas/convites/extrair.mjs. Valores, tempos e curvas são os do
// desenho: não reinterpretar. A base DCLogic é o motor (../../motor/dc-logic).

import { DCLogic } from "../../motor/dc-logic";

export default class Convite04 extends DCLogic {
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
    const key = String(this.props.fonte ?? '03 Atelier').split(' ').slice(1).join(' ').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const f = F[key] || F.atelier, s = f.s, hz = f.hz;
    const c = (a, b, m) => `clamp(${Math.round(a * s)}px, ${(b * s).toFixed(2)}vw, ${Math.round(m * s)}px)`;
    return { nameFont: f.nf, nameWeight: f.nw, nameTT: f.ntt, nameLS: f.nls, nameStyle: f.ns, nameLH: f.nlh,
      nameSize: `min(${c(60, 17, 96)}, ${(10.5 * s).toFixed(1)}svh)`, nameSizeSm: c(38, 11, 58), initSize: `min(${c(96, 28, 150)}, ${(17 * s).toFixed(1)}svh)`, initSizeSm: c(64, 18, 100), monoSize: `min(${c(76, 21, 104)}, ${(10 * s).toFixed(1)}svh)`,
      headFont: f.hf, headWeight: f.hw, headTT: f.htt, headLSsoft: f.htt === 'uppercase' ? '.06em' : f.hls, headStyle: f.hs,
      headSize: `clamp(${hz[0]}px, ${hz[1]}vw, ${hz[2]}px)`, textFont: f.tf, textSize: `${f.tz}px`, textWeight: f.tw };
  }

  componentDidMount() {
    this.reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.root = document.querySelector('[data-root]');
    this.flapov = document.querySelector('[data-flapov]');
    this.grad = document.getElementById('c04g');
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
    const loop = (now) => {
      this._loop = requestAnimationFrame(loop);
      if (this.busy || this.cur < 1 || this.cur > 5) return;
      const k = Math.min(1, Math.max(0, (now - this.curlT0) / 900)), ke = 1 - Math.pow(1 - k, 3);
      const r = this.reduce ? (k > 0 ? 34 : 0) : ke * (32 + 7 * Math.sin((now - this.curlT0) / 430));
      this.restR = r;
      this.peel(this.scenes[this.cur], this.restP(r));
    };
    this._loop = requestAnimationFrame(loop);
  }
  componentWillUnmount() {
    cancelAnimationFrame(this._loop); cancelAnimationFrame(this._raf);
    const r = this.root; if (!r) return;
    r.removeEventListener('click', this.onClickCap, true); r.removeEventListener('click', this.onClick);
    r.removeEventListener('wheel', this.onWheel); r.removeEventListener('touchstart', this.onTS); r.removeEventListener('touchend', this.onTE);
  }

  prep() {
    this.anims = {};
    const E = 'cubic-bezier(.2,.7,.2,1)', D = 'cubic-bezier(.55,0,.25,1)';
    document.querySelectorAll('[data-foil]').forEach((el) => {
      if (!this.reduce) el.animate([{ backgroundPosition: '100% 0' }, { backgroundPosition: '0% 0', offset: .45 }, { backgroundPosition: '0% 0' }], { duration: 5200, iterations: Infinity, easing: 'ease-in-out' });
    });
    this.scenes.forEach((sc, i) => {
      const A = [], L = [];
      if (this.reduce) { this.anims[i] = { A, L }; return; }
      sc.querySelectorAll('[data-in]').forEach((el, k) => A.push(el.animate([{ opacity: 0, transform: 'translateY(14px)', filter: 'blur(6px)' }, { opacity: 1, transform: 'none', filter: 'blur(0)' }], { duration: 1200, delay: 250 + k * 200, easing: E, fill: 'both' })));
      sc.querySelectorAll('[data-o]').forEach((el, k) => A.push(el.animate([{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: 1200, delay: k ? 1400 : 400, easing: E, fill: 'both' })));
      sc.querySelectorAll('[data-draw]').forEach((el, k) => A.push(el.animate([{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], { duration: 1500, delay: 150 + k * 120, easing: D, fill: 'both' })));
      sc.querySelectorAll('[data-w]').forEach((el, k) => A.push(el.animate([{ opacity: 0, transform: 'translateY(12px)', filter: 'blur(7px)' }, { opacity: 1, transform: 'none', filter: 'blur(0)' }], { duration: 1100, delay: 350 + k * 90, easing: E, fill: 'both' })));
      const ph = sc.querySelector('[data-photo]'), pz = sc.querySelector('[data-pz]');
      if (ph) A.push(ph.animate([{ opacity: 0, clipPath: 'inset(0 0 100% 0)' }, { opacity: 1, clipPath: 'inset(0 0 0 0)' }], { duration: 1800, delay: 400, easing: D, fill: 'both' }));
      if (pz) A.push(pz.animate([{ transform: 'scale(1.12)' }, { transform: 'scale(1)' }], { duration: 3200, delay: 400, easing: E, fill: 'both' }));
      const sh = sc.querySelector('[data-cshadow]');
      if (sh) A.push(sh.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 1200, delay: 200, fill: 'both' }));
      A.forEach((a) => a.pause()); L.forEach((a) => a.pause());
      this.anims[i] = { A, L };
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
    if (this.cur === 0) { if (dir > 0) this.openCard(); return; }
    const to = this.cur + dir;
    if (to < 1 || to > 6) return;
    dir > 0 ? this.turnFwd() : this.turnBack();
  }

  setCur(i) { this.cur = i; this.setState({ scene: i }); }

  openCard() {
    this.busy = true;
    const s0 = this.scenes[0], s1 = this.scenes[1], flap = s1.querySelector('[data-flap]'), shade = s1.querySelector('[data-fshade]'), shadow = s0.querySelector('[data-cshadow]');
    const done = () => {
      s1.style.transform = 'none'; s1.style.clipPath = 'none'; flap.style.display = 'none';
      s1.getAnimations().forEach((a) => a.cancel());
      s0.style.visibility = 'hidden';
      s1.querySelector('[data-crease]').style.opacity = 1;
      const n = this.scenes[2]; n.style.visibility = 'visible'; n.style.zIndex = 2;
      this.setCur(1); this.playScene(1);
      this.curlT0 = performance.now() + (this.reduce ? 0 : 2200);
      this.busy = false;
    };
    if (this.reduce) return done();
    s0.querySelectorAll('[data-o]').forEach((el) => el.animate([{ opacity: getComputedStyle(el).opacity }, { opacity: 0 }], { duration: 450, fill: 'forwards' }));
    const E = 'cubic-bezier(.65,0,.35,1)', D = 1500, T = 2600, d0 = 300;
    flap.animate([{ transform: 'rotateX(-180deg)' }, { transform: 'rotateX(0deg)' }], { duration: D, delay: d0, easing: E, fill: 'forwards' });
    shade.animate([{ opacity: .9 }, { opacity: .9, offset: .5 }, { opacity: 0 }], { duration: D, delay: d0, easing: 'ease-out', fill: 'forwards' });
    s1.animate([{ transform: 'translateY(-18.5%) scale(.74)', easing: E }, { transform: 'translateY(0) scale(.74)', offset: D / T, easing: 'cubic-bezier(.5,0,.2,1)' }, { transform: 'translateY(0) scale(1)' }], { duration: T, delay: d0, fill: 'forwards' });
    shadow.animate([{ height: '37%', opacity: 1, easing: E }, { height: '74%', opacity: 1, offset: D / T }, { height: '100%', width: '100%', opacity: 0 }], { duration: T, delay: d0, fill: 'forwards' });
    setTimeout(() => { s1.style.clipPath = 'none'; }, d0 + D / 2);
    setTimeout(done, d0 + T + 60);
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
    const t = this.theme(), n1 = this.props.nome1 ?? 'Beatriz', n2 = this.props.nome2 ?? 'Rafael', sc = this.state.scene, n = 7;
    const mode = this.props.modoNome ?? 'Nomes';
    const d = new Date(this.props.dataISO ?? '2026-11-21T16:30:00'), p2 = (x) => String(x).padStart(2, '0');
    const frase = this.props.frase ?? 'Algumas histórias são escritas devagar, página por página, até virarem para sempre.';
    const dark = sc === 0 || sc === n - 1;
    const month = d.toLocaleDateString('pt-BR', { month: 'long' });
    return {
      t, n1, n2, i1: n1.charAt(0).toUpperCase(), i2: n2.charAt(0).toUpperCase(),
      modeInitials: mode === 'Iniciais', modeNames: mode === 'Nomes', modeBoth: mode === 'Iniciais + nomes',
      words: frase.split(/\s+/).filter(Boolean),
      dt: { weekday: d.toLocaleDateString('pt-BR', { weekday: 'long' }).split('-')[0], day: p2(d.getDate()), month: month.charAt(0).toUpperCase() + month.slice(1), year: d.getFullYear(),
        short: `${p2(d.getDate())} · ${p2(d.getMonth() + 1)} · ${d.getFullYear()}`, time: `${d.getHours()}h${p2(d.getMinutes())}` },
      siteUrl: this.props.siteUrl ?? '#',
      hintOp: sc > 0 && sc < n - 1 ? 1 : 0,
      dots: Array.from({ length: n }, (_, i) => ({ w: i === sc ? '22px' : '6px', bg: i === sc ? (dark ? '#d9c08a' : '#2d2a26') : (dark ? 'rgba(217,192,138,.4)' : 'rgba(45,42,38,.2)') }))
    };
  }
}
