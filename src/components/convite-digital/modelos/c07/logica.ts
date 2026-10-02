/* eslint-disable */
// @ts-nocheck
// A lógica do Convite 07, copiada LITERAL de design_handoff_convites/Convite 07.dc.html
// (class Component) por ferramentas/convites/extrair.mjs. Valores, tempos e curvas são os do
// desenho: não reinterpretar. A base DCLogic é o motor (../../motor/dc-logic).

import { DCLogic } from "../../motor/dc-logic";

export default class Convite07 extends DCLogic {
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
      nameSize: `min(${c(56, 15.5, 88)}, ${(9.5 * s).toFixed(1)}svh)`, nameSizeSm: c(36, 10, 54), initSize: `min(${c(88, 25, 140)}, ${(15 * s).toFixed(1)}svh)`, initSizeSm: c(60, 16, 92),
      headFont: f.hf, headWeight: f.hw, headTT: f.htt, headLSsoft: f.htt === 'uppercase' ? '.06em' : f.hls, headStyle: f.hs,
      headSize: `clamp(${hz[0]}px, ${hz[1]}vw, ${hz[2]}px)`, textFont: f.tf, textSize: `${f.tz}px`, textWeight: f.tw };
  }

  componentDidMount() {
    this.reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.root = document.querySelector('[data-root]');
    this.scenes = [...document.querySelectorAll('[data-scene]')].sort((a, b) => a.dataset.scene - b.dataset.scene);
    this.dIn = document.querySelector('[data-disp="in"]'); this.dOut = document.querySelector('[data-disp="out"]');
    this.turbs = [...document.querySelectorAll('[data-turb]')]; this.wturb = document.querySelector('[data-wturb]');
    this.extra0();
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
    if (!this.reduce) { let last = 0; const wl = (now) => { this._wl = requestAnimationFrame(wl); if (now - last < 60) return; last = now; if (this.cur === 3 || this.cur === 6) this.wturb.setAttribute('baseFrequency', `0.01 ${(0.14 + 0.025 * Math.sin(now / 520)).toFixed(4)}`); }; this._wl = requestAnimationFrame(wl); }
  }
  componentWillUnmount() {
    cancelAnimationFrame(this._raf); cancelAnimationFrame(this._wl);
    const r = this.root; if (!r) return;
    r.removeEventListener('click', this.onClickCap, true); r.removeEventListener('click', this.onClick);
    r.removeEventListener('wheel', this.onWheel); r.removeEventListener('touchstart', this.onTS); r.removeEventListener('touchend', this.onTE);
  }

  prep() {
    this.anims = {};
    const E = 'cubic-bezier(.2,.7,.2,1)', D = 'cubic-bezier(.55,0,.25,1)';
    const d = new Date(this.props.dataISO ?? '2027-06-12T17:00:00');
    this.scenes.forEach((sc, i) => {
      const A = [], L = [];
      if (this.reduce) { this.anims[i] = { A, L }; return; }
      sc.querySelectorAll('[data-in]').forEach((el, k) => A.push(el.animate([{ opacity: 0, transform: 'translateY(14px)', filter: 'blur(6px)' }, { opacity: 1, transform: 'none', filter: 'blur(0)' }], { duration: 1200, delay: 300 + k * 220, easing: E, fill: 'both' })));
      sc.querySelectorAll('[data-o]').forEach((el, k) => A.push(el.animate([{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: 1200, delay: k ? 1800 : 500, easing: E, fill: 'both' })));
      sc.querySelectorAll('[data-draw]').forEach((el, k) => { let L0 = 1; if (el.style.vectorEffect === 'non-scaling-stroke') { L0 = this.screenLen(el); el.removeAttribute('pathLength'); el.style.strokeDasharray = L0; el.style.strokeDashoffset = L0; } A.push(el.animate([{ strokeDashoffset: L0 }, { strokeDashoffset: 0 }], { duration: 2000, delay: 200 + k * 260, easing: D, fill: 'both' })); });
      sc.querySelectorAll('[data-w]').forEach((el, k) => A.push(el.animate([{ opacity: 0, transform: 'translateY(12px)', filter: 'blur(7px)' }, { opacity: 1, transform: 'none', filter: 'blur(0)' }], { duration: 1100, delay: 600 + k * 90, easing: E, fill: 'both' })));
      sc.querySelectorAll('[data-tess]').forEach((el, k, all) => { const m = Math.abs(k - (all.length - 1) / 2); A.push(el.animate([{ opacity: 0, transform: 'rotate(45deg) scale(0)' }, { opacity: 1, transform: 'rotate(45deg) scale(1)' }], { duration: 600, delay: 200 + m * 110, easing: 'cubic-bezier(.34,1.56,.64,1)', fill: 'both' })); });
      const pw = sc.querySelector('[data-pwrap]'), pz = sc.querySelector('[data-pz]');
      if (pw) A.push(pw.animate([{ opacity: 0, filter: 'brightness(1.6) blur(8px)' }, { opacity: 1, filter: 'brightness(1) blur(0)' }], { duration: 2000, delay: 300, easing: E, fill: 'both' }));
      if (pz) A.push(pz.animate([{ transform: 'scale(1.15)' }, { transform: 'scale(1)' }], { duration: 3400, delay: 300, easing: E, fill: 'both' }));
      const dial = sc.querySelector('[data-dial]'), hand = sc.querySelector('[data-hand]');
      if (dial) A.push(dial.animate([{ opacity: 0, transform: 'scale(.85) rotate(-20deg)' }, { opacity: 1, transform: 'none' }], { duration: 1400, delay: 200, easing: E, fill: 'both' }));
      if (hand) A.push(hand.animate([{ transform: 'rotate(0deg)' }, { transform: `rotate(${720 + ((d.getHours() % 12) + d.getMinutes() / 60) * 30}deg)` }], { duration: 3000, delay: 900, easing: 'cubic-bezier(.3,.1,.2,1)', fill: 'both' }));
      sc.querySelectorAll('[data-twk]').forEach((el, k) => L.push(el.animate([{ opacity: 1 }, { opacity: .3 }, { opacity: 1 }], { duration: 1600 + (k * 311) % 1400, delay: (k * 197) % 1200, iterations: Infinity })));
      sc.querySelectorAll('[data-flame]').forEach((el, k) => L.push(el.animate([{ opacity: 1, transform: 'scale(1)' }, { opacity: .78, transform: 'scale(.94)' }, { opacity: .95, transform: 'scale(1.03)' }, { opacity: 1, transform: 'scale(1)' }], { duration: 1300 + k * 400, iterations: Infinity, easing: 'ease-in-out' })));
      sc.querySelectorAll('[data-glint]').forEach((el) => L.push(el.animate([{ opacity: .9, transform: 'translateX(0)' }, { opacity: .4, transform: 'translateX(2px)' }, { opacity: .9, transform: 'translateX(0)' }], { duration: 1700, iterations: Infinity, easing: 'ease-in-out' })));
      sc.querySelectorAll('[data-win]').forEach((el, k) => A.push(el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 500, delay: 1400 + ((k * 263) % 1800), fill: 'both' })));
      const sun = sc.querySelector('[data-sun]');
      if (sun) A.push(sun.animate([{ transform: 'translateY(-18px)' }, { transform: 'translateY(10px)' }], { duration: 9000, easing: 'ease-out', fill: 'both' }));
      A.forEach((a) => a.pause()); L.forEach((a) => a.pause());
      this.anims[i] = { A, L };
    });
    if (this.reduce) document.querySelectorAll('[data-draw]').forEach((p) => (p.style.strokeDashoffset = 0));
  }

  screenLen(p) {
    const vis = []; let s = p.closest('section'); const hid = s && getComputedStyle(s).visibility === 'hidden';
    if (hid) s.style.visibility = 'visible';
    const n = p.getTotalLength(), m = p.getScreenCTM(); let L = 0, prev = null;
    for (let i = 0; i <= 80; i++) { const q = p.getPointAtLength(n * i / 80), x = m.a * q.x + m.c * q.y, y = m.b * q.x + m.d * q.y; if (prev) L += Math.hypot(x - prev[0], y - prev[1]); prev = [x, y]; }
    if (hid) s.style.visibility = '';
    return Math.ceil(L + 4);
  }

  playScene(i) {
    Object.keys(this.anims).forEach((k) => { if (+k !== i) this.anims[k].L.forEach((a) => a.pause()); });
    const S = this.anims[i]; if (!S) return;
    S.L.forEach((a) => a.play());
    if (S.played) return;
    S.played = true; S.A.forEach((a) => a.play());
  }

  go(dir) {
    if (this.busy) return;
    if (this.cur === 0) { if (dir > 0) this.open0(); return; }
    const to = this.cur + dir;
    if (to < 1 || to >= this.scenes.length) return;
    this.trans(to, dir);
  }

  setCur(i) { this.cur = i; this.setState({ scene: i }); }

  finishOpen() {
    this.scenes[0].style.visibility = 'hidden';
    this.setCur(1); this.playScene(1); this.busy = false;
  }

  open0() {
    this.busy = true;
    const s0 = this.scenes[0], s1 = this.scenes[1], q = (x) => s0.querySelector(x);
    if (this.reduce) return this.finishOpen();
    s0.querySelectorAll('[data-o]').forEach((el) => el.animate([{ opacity: getComputedStyle(el).opacity }, { opacity: 0 }], { duration: 500, fill: 'forwards' }));
    q('[data-seal="l"]').animate([{ transform: 'none', opacity: 1 }, { transform: 'translate(-26px,60px) rotate(-38deg)', opacity: 0 }], { duration: 800, easing: 'cubic-bezier(.5,0,.8,.4)', fill: 'forwards' });
    q('[data-seal="r"]').animate([{ transform: 'none', opacity: 1 }, { transform: 'translate(26px,64px) rotate(42deg)', opacity: 0 }], { duration: 800, easing: 'cubic-bezier(.5,0,.8,.4)', fill: 'forwards' });
    q('[data-flap]').animate([{ transform: 'rotateX(0deg)', zIndex: 5 }, { transform: 'rotateX(90deg)', zIndex: 5, offset: .5 }, { transform: 'rotateX(90deg)', zIndex: 2, offset: .51 }, { transform: 'rotateX(180deg)', zIndex: 2 }], { duration: 1000, delay: 500, easing: 'cubic-bezier(.5,0,.3,1)', fill: 'forwards' });
    q('[data-card]').animate([{ transform: 'translateY(0)' }, { transform: 'translateY(-150px)' }], { duration: 1100, delay: 1400, easing: 'cubic-bezier(.4,0,.2,1)', fill: 'forwards' });
    q('[data-env]').animate([{ opacity: 1, transform: 'scale(1)' }, { opacity: 0, transform: 'scale(1.4) translateY(40px)' }], { duration: 900, delay: 2500, easing: 'ease-in', fill: 'forwards' });
    s0.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 1000, delay: 2600, easing: 'ease-in-out', fill: 'forwards' });
    s1.animate([{ transform: 'scale(.92)', filter: 'brightness(1.1)' }, { transform: 'scale(1)', filter: 'brightness(1)' }], { duration: 1600, delay: 2600, easing: 'cubic-bezier(.2,.7,.2,1)' });
    setTimeout(() => this.playScene(1), 2900);
    setTimeout(() => this.finishOpen(), 3700);
  }

  extra0() {
    const bands = [this.ajustar('#5a0f1c'), this.ajustar('#e9dcc3'), '#1f3b57', this.ajustar('#b48a4a'), this.ajustar('#efe4d0'), this.ajustar('#7a1626'), '#2a4c6a', this.ajustar('#e9dcc3'), this.ajustar('#c9a15e'), this.ajustar('#3e0812')];
    let y = 0, rects = '';
    for (let i = 0; y < 520; i++) { const h = 8 + ((i * 37) % 22); rects += `<rect x='-60' y='${y - 60}' width='520' height='${h}' fill='${bands[i % bands.length]}'/>`; y += h; }
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='400' height='400'><filter id='m' x='0' y='0' width='100%' height='100%'><feTurbulence type='fractalNoise' baseFrequency='.008 .02' numOctaves='3' seed='7'/><feDisplacementMap in='SourceGraphic' scale='120' xChannelSelector='R' yChannelSelector='G'/></filter><g filter='url(#m)'>${rects}</g></svg>`;
    const url = `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
    document.querySelectorAll('[data-marble]').forEach((el) => { el.style.backgroundImage = url; el.style.backgroundSize = '400px 400px'; el.style.backgroundPosition = 'center'; });
  }

  trans(to, dir) {
    const from = this.cur, inc = this.scenes[to], out = this.scenes[from];
    this.setCur(to);
    const done = () => {
      out.style.visibility = 'hidden'; out.style.zIndex = 1; out.style.opacity = ''; out.style.filter = '';
      inc.style.zIndex = 2; inc.style.opacity = ''; inc.style.filter = ''; inc.style.transform = '';
      this.busy = false;
    };
    inc.style.visibility = 'visible';
    if (this.reduce) { this.playScene(to); return done(); }
    this.busy = true;
    inc.style.zIndex = 3; out.style.zIndex = 2;
    inc.style.filter = 'url(#c06rin)'; out.style.filter = 'url(#c06rout)';
    inc.style.opacity = 0;
    const t0 = performance.now(), dur = 1700; let played = false;
    const step = (now) => {
      const u = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - u, 3);
      this.dIn.setAttribute('scale', (90 * Math.pow(1 - e, 1.6)).toFixed(1));
      this.dOut.setAttribute('scale', (70 * Math.min(1, u * 1.8)).toFixed(1));
      const bf = `0.006 ${(0.05 + 0.02 * Math.sin(now / 160)).toFixed(4)}`;
      this.turbs.forEach((t) => t.setAttribute('baseFrequency', bf));
      inc.style.opacity = Math.min(1, u * 1.7).toFixed(3);
      inc.style.transform = `translateY(${((1 - e) * 16 * (dir > 0 ? 1 : -1)).toFixed(1)}px)`;
      out.style.opacity = Math.max(0, 1 - u * 1.6).toFixed(3);
      if (!played && u > .22) { played = true; this.playScene(to); }
      if (u < 1) { this._raf = requestAnimationFrame(step); return; }
      done();
    };
    this._raf = requestAnimationFrame(step);
  }

  renderVals() {
    const t = this.theme(), n1 = this.props.nome1 ?? 'Sofia', n2 = this.props.nome2 ?? 'Matteo', sc = this.state.scene, n = 7;
    const mode = this.props.modoNome ?? 'Nomes';
    const d = new Date(this.props.dataISO ?? '2027-06-12T17:00:00'), p2 = (x) => String(x).padStart(2, '0');
    const frase = this.props.frase ?? 'Como a luz sobre os canais, o amor encontrou o seu caminho até nós.';
    const R = ['XII', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'];
    const dark = sc === 0 || sc === 5 || sc === 6;
    return {
      t, n1, n2, i1: n1.charAt(0).toUpperCase(), i2: n2.charAt(0).toUpperCase(),
      modeInitials: mode === 'Iniciais', modeNames: mode === 'Nomes', modeBoth: mode === 'Iniciais + nomes',
      words: frase.split(/\s+/).filter(Boolean),
      tess: Array.from({ length: 9 }, (_, k) => ({ c: k === 4 ? '#7a1626' : k % 2 ? '#1f3b57' : '#b48a4a' })),
      nums: R.map((r, k) => { const a = (k * 30 - 90) * Math.PI / 180; return { r, x: (100 + 81 * Math.cos(a)).toFixed(2), y: (100 + 81 * Math.sin(a)).toFixed(2) }; }),
      stars: [[70, 70], [128, 66], [62, 112], [138, 120], [96, 146], [118, 86], [80, 94], [108, 128], [76, 134], [130, 100]].map(([x, y]) => ({ x, y: y - 5 })),
      wins: [[84, 40], [87, 54], [85, 66], [108, 82], [132, 80], [154, 82], [198, 92], [212, 92], [226, 90], [240, 92], [260, 78], [266, 92], [296, 86], [338, 90], [350, 92], [26, 90], [56, 84], [372, 96]].map(([x, y]) => ({ x, y })),
      dt: { weekday: d.toLocaleDateString('pt-BR', { weekday: 'long' }).split('-')[0], full: `${d.getDate()} de ${d.toLocaleDateString('pt-BR', { month: 'long' })} de ${d.getFullYear()}`, time: `${d.getHours()}h${p2(d.getMinutes())}` },
      siteUrl: this.props.siteUrl ?? '#',
      hintOp: sc > 0 && sc < n - 1 ? 1 : 0,
      hintColor: dark ? '#d9b97f' : '#7a1626',
      dots: Array.from({ length: n }, (_, i) => ({ w: i === sc ? '22px' : '6px', bg: i === sc ? (dark ? '#d9b97f' : '#2f2420') : (dark ? 'rgba(217,185,127,.4)' : 'rgba(47,36,32,.22)') }))
    };
  }
}
