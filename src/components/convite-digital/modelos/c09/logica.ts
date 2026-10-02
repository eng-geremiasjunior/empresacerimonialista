/* eslint-disable */
// @ts-nocheck
// A lógica do Convite 09, copiada LITERAL de design_handoff_convites/Convite 09.dc.html
// (class Component) por ferramentas/convites/extrair.mjs. Valores, tempos e curvas são os do
// desenho: não reinterpretar. A base DCLogic é o motor (../../motor/dc-logic).

import { DCLogic } from "../../motor/dc-logic";

export default class Convite09 extends DCLogic {
  state = { scene: 0 };
  cur = 0;

  theme() {
    const F = {
      essencial: { nf: "'Jost',sans-serif", nw: 300, ntt: 'uppercase', nls: '.12em', ns: 'normal', s: .62, nlh: 1.15, hf: "'Jost',sans-serif", hw: 300, htt: 'uppercase', hls: '.12em', hs: 'normal', hz: [22, 6, 30], tf: "'Hanken Grotesk',sans-serif", tz: 15, tw: 400 },
      maison: { nf: "'Bodoni Moda',serif", nw: 400, ntt: 'none', nls: '-.01em', ns: 'normal', s: .9, nlh: 1.05, hf: "'Bodoni Moda',serif", hw: 400, htt: 'none', hls: '0', hs: 'normal', hz: [26, 7, 34], tf: "'Figtree',sans-serif", tz: 15, tw: 400 },
      atelier: { nf: "'Italiana',serif", nw: 400, ntt: 'none', nls: '.03em', ns: 'normal', s: .9, nlh: 1.1, hf: "'Italiana',serif", hw: 400, htt: 'none', hls: '.03em', hs: 'normal', hz: [28, 7.6, 38], tf: "'EB Garamond',serif", tz: 18, tw: 400 },
      caligrafia: { nf: "'Pinyon Script',cursive", nw: 400, ntt: 'none', nls: '0', ns: 'normal', s: 1.05, nlh: 1.25, hf: "'Cormorant Garamond',serif", hw: 500, htt: 'none', hls: '0', hs: 'normal', hz: [30, 8.2, 40], tf: "'Cormorant Garamond',serif", tz: 18, tw: 500 },
      riviera: { nf: "'Monsieur La Doulaise',cursive", nw: 400, ntt: 'none', nls: '0', ns: 'normal', s: 1.25, nlh: 1.25, hf: "'Marcellus',serif", hw: 400, htt: 'none', hls: '.02em', hs: 'normal', hz: [26, 7, 32], tf: "'Marcellus',serif", tz: 16, tw: 400 },
      bilhete: { nf: "'Sacramento',cursive", nw: 400, ntt: 'none', nls: '0', ns: 'normal', s: 1.12, nlh: 1.2, hf: "'Lora',serif", hw: 400, htt: 'none', hls: '0', hs: 'italic', hz: [26, 7, 34], tf: "'Lora',serif", tz: 16, tw: 400 },
      soiree: { nf: "'Poiret One',sans-serif", nw: 400, ntt: 'uppercase', nls: '.1em', ns: 'normal', s: .68, nlh: 1.15, hf: "'Poiret One',sans-serif", hw: 400, htt: 'uppercase', hls: '.1em', hs: 'normal', hz: [22, 6, 28], tf: "'Josefin Sans',sans-serif", tz: 16, tw: 400 },
      relicario: { nf: "'Playfair Display',serif", nw: 400, ntt: 'none', nls: '0', ns: 'italic', s: .9, nlh: 1.1, hf: "'Playfair Display',serif", hw: 400, htt: 'none', hls: '0', hs: 'normal', hz: [28, 7.6, 38], tf: "'Libre Baskerville',serif", tz: 15, tw: 400 }
    };
    const key = String(this.props.fonte ?? '02 Maison').split(' ').slice(1).join(' ').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const f = F[key] || F.maison, s = f.s, hz = f.hz;
    const c = (a, b, m) => `clamp(${Math.round(a * s)}px, ${(b * s).toFixed(2)}vw, ${Math.round(m * s)}px)`;
    return { nameFont: f.nf, nameWeight: f.nw, nameTT: f.ntt, nameLS: f.nls, nameStyle: f.ns, nameLH: f.nlh,
      nameSize: `min(${c(52, 14.5, 80)}, ${(8.6 * s).toFixed(1)}svh)`, nameSizeSm: c(36, 10, 54), initSize: `min(${c(88, 25, 140)}, ${(15 * s).toFixed(1)}svh)`, initSizeSm: c(60, 16, 92),
      headFont: f.hf, headWeight: f.hw, headTT: f.htt, headLSsoft: f.htt === 'uppercase' ? '.06em' : f.hls, headStyle: f.hs,
      headSize: `clamp(${hz[0]}px, ${hz[1]}vw, ${hz[2]}px)`, textFont: f.tf, textSize: `${f.tz}px`, textWeight: f.tw };
  }

  componentDidMount() {
    this.reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.root = document.querySelector('[data-root]');
    this.sweep = document.querySelector('[data-sweep]');
    this.scenes = [...document.querySelectorAll('[data-scene]')].sort((a, b) => a.dataset.scene - b.dataset.scene);
    const noise = `url("data:image/svg+xml,${encodeURIComponent("<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 .45 0 0 0 0 .38 0 0 0 0 .28 0 0 0 .12 0'/></filter><rect width='100%' height='100%' filter='url(#n)'/></svg>")}")`;
    document.querySelectorAll('[data-card]').forEach((el) => (el.style.backgroundImage = noise));
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
  }
  componentWillUnmount() {
    cancelAnimationFrame(this._raf);
    window.removeEventListener('resize', this.onResize);
    const r = this.root; if (!r) return;
    r.removeEventListener('click', this.onClickCap, true); r.removeEventListener('click', this.onClick);
    r.removeEventListener('wheel', this.onWheel); r.removeEventListener('touchstart', this.onTS); r.removeEventListener('touchend', this.onTE);
  }

  dims() { return [this.root.clientWidth, this.root.clientHeight]; }

  layout() {
    const b = document.querySelector('[data-box]').getBoundingClientRect(), [W, H] = this.dims(), s1 = this.scenes[1];
    this.k0 = b.height / H; this.X0 = Math.max(0, (W - b.width / this.k0) / 2);
    s1.style.transform = `scale(${this.k0})`;
    s1.style.clipPath = `inset(0 ${this.X0}px)`;
    s1.style.visibility = 'visible';
  }

  prep() {
    this.anims = {};
    const E = 'cubic-bezier(.2,.7,.2,1)', D = 'cubic-bezier(.55,0,.25,1)';
    if (!this.reduce) {
      document.querySelectorAll('[data-foil]').forEach((el) => el.animate([{ backgroundPosition: '100% 0' }, { backgroundPosition: '0% 0', offset: .45 }, { backgroundPosition: '0% 0' }], { duration: 5600, iterations: Infinity, easing: 'ease-in-out' }));
      const sh = document.querySelector('[data-sheen]');
      this.sheenA = sh.animate([{ backgroundPosition: '100% 0' }, { backgroundPosition: '0% 0', offset: .5 }, { backgroundPosition: '0% 0' }], { duration: 4200, iterations: Infinity, easing: 'ease-in-out' });
    }
    this.scenes.forEach((sc, i) => {
      const A = [];
      if (this.reduce) { this.anims[i] = { A }; return; }
      sc.querySelectorAll('[data-in]').forEach((el, k) => A.push(el.animate([{ opacity: 0, transform: 'translateY(12px)', filter: 'blur(5px)' }, { opacity: 1, transform: 'none', filter: 'blur(0)' }], { duration: 1300, delay: 350 + k * 240, easing: E, fill: 'both' })));
      sc.querySelectorAll('[data-o]').forEach((el, k) => A.push(el.animate([{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: 1200, delay: k ? 1400 : 400, easing: E, fill: 'both' })));
      sc.querySelectorAll('[data-draw]').forEach((el, k) => A.push(el.animate([{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], { duration: 1500, delay: 250 + k * 120, easing: D, fill: 'both' })));
      sc.querySelectorAll('[data-w]').forEach((el, k) => A.push(el.animate([{ opacity: 0, filter: 'blur(6px)' }, { opacity: 1, filter: 'blur(0)' }], { duration: 1100, delay: 500 + k * 85, easing: E, fill: 'both' })));
      if (i > 0) sc.querySelectorAll('[data-foil]').forEach((el) => A.push(el.animate([{ opacity: 0, transform: 'scale(.94)' }, { opacity: 1, transform: 'none' }], { duration: 1400, delay: 200, easing: E, fill: 'both' })));
      const mat = sc.querySelector('[data-mat]'), pz = sc.querySelector('[data-pz]');
      if (mat) A.push(mat.animate([{ opacity: 0, transform: 'translateY(18px)' }, { opacity: 1, transform: 'none' }], { duration: 1500, delay: 250, easing: E, fill: 'both' }));
      if (pz) A.push(pz.animate([{ transform: 'scale(1.12)' }, { transform: 'scale(1)' }], { duration: 4200, delay: 250, easing: E, fill: 'both' }));
      A.forEach((a) => a.pause());
      this.anims[i] = { A };
    });
    if (this.reduce) document.querySelectorAll('[data-draw]').forEach((p) => (p.style.strokeDashoffset = 0));
  }

  playScene(i) {
    const S = this.anims[i]; if (!S || S.played) return;
    S.played = true; S.A.forEach((a) => a.play());
  }

  go(dir) {
    if (this.busy) return;
    if (this.cur === 0) { if (dir > 0) this.openBox(); return; }
    const to = this.cur + dir;
    if (to < 1 || to >= this.scenes.length) return;
    this.trans(to, dir);
  }

  setCur(i) { this.cur = i; this.setState({ scene: i }); }

  openBox() {
    this.busy = true;
    const s0 = this.scenes[0], s1 = this.scenes[1], wrap = document.querySelector('[data-coverwrap]'), q = (x) => wrap.querySelector(x);
    const done = () => {
      s1.getAnimations().forEach((a) => a.cancel());
      s1.style.transform = 'none'; s1.style.clipPath = 'none';
      wrap.style.display = 'none'; s0.style.visibility = 'hidden';
      if (this.sheenA) this.sheenA.cancel();
      this.setCur(1); this.playScene(1); this.busy = false;
    };
    if (this.reduce) return done();
    s0.querySelectorAll('[data-o]').forEach((el) => el.animate([{ opacity: getComputedStyle(el).opacity }, { opacity: 0 }], { duration: 450, fill: 'forwards' }));
    q('[data-bow]').animate([{ transform: 'scale(1)', opacity: 1 }, { transform: 'scale(1.12) rotate(-6deg)', opacity: 1, offset: .3 }, { transform: 'scale(.3) rotate(20deg)', opacity: 0 }], { duration: 750, easing: 'cubic-bezier(.5,0,.75,0)', fill: 'forwards' });
    q('[data-rh]').animate([{ transform: 'translateX(0)', opacity: 1 }, { transform: 'translateX(110%)', opacity: 0 }], { duration: 900, delay: 450, easing: 'cubic-bezier(.55,0,.75,.2)', fill: 'forwards' });
    q('[data-rv]').animate([{ transform: 'translateY(0)', opacity: 1 }, { transform: 'translateY(110%)', opacity: 0 }], { duration: 900, delay: 650, easing: 'cubic-bezier(.55,0,.75,.2)', fill: 'forwards' });
    q('[data-lid]').animate([{ transform: 'none' }, { transform: 'translateY(-16px) scale(1.015)', offset: .25 }, { transform: 'translateY(-120vh) rotate(-3deg)' }], { duration: 1700, delay: 1400, easing: 'cubic-bezier(.6,0,.3,1)', fill: 'forwards' });
    q('[data-vellum]').animate([{ transform: 'none', opacity: 1 }, { transform: 'translateY(-36%) rotate(1.5deg)', opacity: 0 }], { duration: 1300, delay: 2900, easing: 'cubic-bezier(.4,0,.2,1)', fill: 'forwards' });
    setTimeout(() => this.playScene(1), 3000);
    const zd = 4100;
    s1.animate([{ transform: `scale(${this.k0})`, clipPath: `inset(0 ${this.X0}px)` }, { transform: 'scale(1)', clipPath: 'inset(0 0px)' }], { duration: 1500, delay: zd, easing: 'cubic-bezier(.6,0,.2,1)', fill: 'forwards' });
    s0.querySelector('[data-base]').animate([{ opacity: 1 }, { opacity: 0 }], { duration: 900, delay: zd, fill: 'forwards' });
    setTimeout(done, zd + 1560);
  }

  trans(to, dir) {
    const from = this.cur, inc = this.scenes[to], out = this.scenes[from];
    this.setCur(to);
    const top = dir > 0 ? inc : out;
    const done = () => {
      top.style.clipPath = 'none';
      out.style.visibility = 'hidden'; out.style.zIndex = 1;
      inc.style.zIndex = 2;
      this.sweep.style.opacity = 0;
      this.busy = false;
    };
    inc.style.visibility = 'visible';
    if (this.reduce) { this.playScene(to); return done(); }
    this.busy = true;
    if (dir > 0) { inc.style.zIndex = 3; out.style.zIndex = 2; } else { inc.style.zIndex = 2; out.style.zIndex = 3; }
    const [, H] = this.dims(), t0 = performance.now(), dur = 1500; let played = false;
    const ease = (u) => (u < .5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);
    const step = (now) => {
      const u = Math.min(1, (now - t0) / dur), e = ease(u);
      const y = dir > 0 ? e * H : (1 - e) * H;
      top.style.clipPath = `inset(0 0 ${(H - y).toFixed(1)}px 0)`;
      this.sweep.style.transform = `translateY(${(y - 1).toFixed(1)}px)`;
      this.sweep.style.opacity = Math.min(1, Math.sin(Math.PI * u) * 2).toFixed(3);
      if (!played && (dir < 0 || e > .25)) { played = true; this.playScene(to); }
      if (u < 1) { this._raf = requestAnimationFrame(step); return; }
      done();
    };
    this._raf = requestAnimationFrame(step);
  }

  words(n, fem) {
    const u = ['zero', fem ? 'uma' : 'um', fem ? 'duas' : 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove', 'dez', 'onze', 'doze', 'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove'];
    const t = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa'];
    if (n < 20) return u[n];
    const r = n % 10; return t[Math.floor(n / 10)] + (r ? ' e ' + u[r] : '');
  }

  renderVals() {
    const t = this.theme(), n1 = this.props.nome1 ?? 'Valentina', n2 = this.props.nome2 ?? 'Arthur', sc = this.state.scene, n = 7;
    const mode = this.props.modoNome ?? 'Nomes';
    const d = new Date(this.props.dataISO ?? '2027-06-12T17:00:00'), p2 = (x) => String(x).padStart(2, '0');
    const frase = this.props.frase ?? 'O amor é paciente, o amor é bondoso. Tudo sofre, tudo crê, tudo espera, tudo suporta.';
    const wd = d.toLocaleDateString('pt-BR', { weekday: 'long' }).split('-')[0];
    const day = d.getDate() === 1 ? 'primeiro' : this.words(d.getDate()), yr = d.getFullYear() - 2000;
    const h = d.getHours(), mi = d.getMinutes();
    const hour = `${this.words(h, true)} ${h === 1 ? 'hora' : 'horas'}${mi ? ' e ' + this.words(mi) + ' minutos' : ''}`;
    const wordsDate = `${wd.charAt(0).toUpperCase() + wd.slice(1)}, ${day} de ${d.toLocaleDateString('pt-BR', { month: 'long' })} de dois mil${yr ? ' e ' + this.words(yr) : ''}, às ${hour}`;
    const dark = sc === 0 || sc === n - 1;
    return {
      t, n1, n2, i1: n1.charAt(0).toUpperCase(), i2: n2.charAt(0).toUpperCase(),
      modeInitials: mode === 'Iniciais', modeNames: mode === 'Nomes', modeBoth: mode === 'Iniciais + nomes',
      pais1: this.props.pais1 ?? 'Roberto e Helena Albuquerque', pais2: this.props.pais2 ?? 'Fernando e Lúcia Monteiro',
      words: frase.split(/\s+/).filter(Boolean), ref: this.props.referencia ?? '1 Coríntios 13',
      dt: { words: wordsDate, short: `${p2(d.getDate())} · ${p2(d.getMonth() + 1)} · ${d.getFullYear()}` },
      siteUrl: this.props.siteUrl ?? '#',
      hintOp: sc > 0 && sc < n - 1 ? 1 : 0,
      dots: Array.from({ length: n }, (_, i) => ({ w: i === sc ? '22px' : '6px', bg: i === sc ? (dark ? '#cdb283' : '#26221d') : (dark ? 'rgba(205,178,131,.4)' : 'rgba(38,34,29,.2)') }))
    };
  }
}
