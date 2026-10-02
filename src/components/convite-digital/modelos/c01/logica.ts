/* eslint-disable */
// @ts-nocheck
// A lógica do Convite 01, copiada LITERAL de design_handoff_convites/Convite 01.dc.html
// (class Component) por ferramentas/convites/extrair.mjs. Valores, tempos e curvas são os do
// desenho: não reinterpretar. A base DCLogic é o motor (../../motor/dc-logic).

import { DCLogic } from "../../motor/dc-logic";

export default class Convite01 extends DCLogic {
  state = { scene: 0 };

  theme() {
    const F = {
      essencial: { nf: "'Jost',sans-serif", nw: 300, ntt: 'uppercase', nls: '.12em', ns: 'normal', s: .62, nlh: 1.15, hf: "'Jost',sans-serif", hw: 300, htt: 'uppercase', hls: '.12em', hs: 'normal', hz: [22, 6, 30], tf: "'Hanken Grotesk',sans-serif", tz: 15, tw: 400 },
      maison: { nf: "'Bodoni Moda',serif", nw: 400, ntt: 'none', nls: '-.01em', ns: 'normal', s: .9, nlh: 1.05, hf: "'Bodoni Moda',serif", hw: 400, htt: 'none', hls: '0', hs: 'normal', hz: [30, 8.4, 40], tf: "'Figtree',sans-serif", tz: 15, tw: 400 },
      atelier: { nf: "'Italiana',serif", nw: 400, ntt: 'none', nls: '.03em', ns: 'normal', s: .9, nlh: 1.1, hf: "'Italiana',serif", hw: 400, htt: 'none', hls: '.03em', hs: 'normal', hz: [30, 8.4, 40], tf: "'EB Garamond',serif", tz: 18, tw: 400 },
      caligrafia: { nf: "'Pinyon Script',cursive", nw: 400, ntt: 'none', nls: '0', ns: 'normal', s: 1.05, nlh: 1.25, hf: "'Cormorant Garamond',serif", hw: 500, htt: 'none', hls: '0', hs: 'normal', hz: [32, 9, 42], tf: "'Cormorant Garamond',serif", tz: 18, tw: 500 },
      riviera: { nf: "'Monsieur La Doulaise',cursive", nw: 400, ntt: 'none', nls: '0', ns: 'normal', s: 1.25, nlh: 1.25, hf: "'Marcellus',serif", hw: 400, htt: 'none', hls: '.02em', hs: 'normal', hz: [26, 7.4, 34], tf: "'Marcellus',serif", tz: 16, tw: 400 },
      bilhete: { nf: "'Sacramento',cursive", nw: 400, ntt: 'none', nls: '0', ns: 'normal', s: 1.1, nlh: 1.2, hf: "'Lora',serif", hw: 400, htt: 'none', hls: '0', hs: 'italic', hz: [26, 7.4, 34], tf: "'Lora',serif", tz: 16, tw: 400 },
      soiree: { nf: "'Poiret One',sans-serif", nw: 400, ntt: 'uppercase', nls: '.1em', ns: 'normal', s: .68, nlh: 1.15, hf: "'Poiret One',sans-serif", hw: 400, htt: 'uppercase', hls: '.1em', hs: 'normal', hz: [22, 6, 28], tf: "'Josefin Sans',sans-serif", tz: 16, tw: 400 },
      relicario: { nf: "'Playfair Display',serif", nw: 400, ntt: 'none', nls: '0', ns: 'italic', s: .9, nlh: 1.1, hf: "'Playfair Display',serif", hw: 400, htt: 'none', hls: '0', hs: 'normal', hz: [30, 8.4, 40], tf: "'Libre Baskerville',serif", tz: 15, tw: 400 }
    };
    const key = String(this.props.fonte ?? '04 Caligrafia').split(' ').slice(1).join(' ').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const f = F[key] || F.caligrafia, s = f.s, hz = f.hz;
    const c = (a, b, m) => `clamp(${Math.round(a * s)}px, ${(b * s).toFixed(2)}vw, ${Math.round(m * s)}px)`;
    return { paper: '#fcf8f1', ink: '#1f2a44', muted: '#586074', gold: '#b08d57', goldText: '#86652f', line: '#e4d9c7', lineStrong: '#c3b49c',
      nameFont: f.nf, nameWeight: f.nw, nameTT: f.ntt, nameLS: f.nls, nameStyle: f.ns, nameLH: f.nlh,
      nameSize: c(60, 17, 96), nameSizeSm: c(38, 11, 58), initSize: c(96, 28, 150), initSizeSm: c(64, 18, 100), monoSize: `${Math.round(46 * s)}px`,
      headFont: f.hf, headWeight: f.hw, headTT: f.htt, headLSsoft: f.htt === 'uppercase' ? '.06em' : f.hls, headStyle: f.hs,
      headSize: `clamp(${hz[0]}px, ${hz[1]}vw, ${hz[2]}px)`, textFont: f.tf, textSize: `${f.tz}px`, textWeight: f.tw };
  }

  componentDidMount() {
    this.reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.sc = document.querySelector('[data-scroller]');
    this.prep();
    this.onScr = () => { if (!this._sraf) this._sraf = requestAnimationFrame(() => { this._sraf = null; this.syncScene(); }); };
    this.onTap = (e) => this.advance(e);
    if (this.sc) { this.sc.addEventListener('scroll', this.onScr, { passive: true }); this.sc.addEventListener('click', this.onTap); }
    addEventListener('resize', this.onScr);
    this.syncScene();
    this.runOpening();
  }
  syncScene() {
    const sc = this.sc; if (!sc) return;
    const i = Math.max(0, Math.min(6, Math.round(sc.scrollTop / Math.max(1, sc.clientHeight))));
    if (i !== this.state.scene) this.setState({ scene: i });
    this.playScene(i);
  }
  componentWillUnmount() { if (this.sc) { this.sc.removeEventListener('scroll', this.onScr); this.sc.removeEventListener('click', this.onTap); } removeEventListener('resize', this.onScr); cancelAnimationFrame(this._raf); (this._timers || []).forEach(clearTimeout); }

  prep() {
    this.anims = {};
    if (this.reduce) {
      document.querySelectorAll('[data-bl],[data-arch]').forEach((l) => (l.style.strokeDashoffset = 0));
      document.querySelectorAll('[data-bd]').forEach((d) => (d.style.opacity = 1));
      document.querySelectorAll('[data-photo]').forEach((p) => (p.style.clipPath = 'none'));
      document.querySelectorAll('[data-photo-z]').forEach((p) => (p.style.transform = 'none'));
      return;
    }
    const E = 'cubic-bezier(.2,.7,.2,1)', B = 'cubic-bezier(.45,0,.25,1)';
    document.querySelectorAll('[data-scene]').forEach((sc) => {
      const i = +sc.dataset.scene; if (!i) return;
      const A = [];
      sc.querySelectorAll('[data-in]').forEach((el, k) => A.push(el.animate([{ opacity: 0, transform: 'translateY(18px)', filter: 'blur(8px)' }, { opacity: 1, transform: 'none', filter: 'blur(0)' }], { duration: 1200, delay: 150 + k * 220, easing: E, fill: 'both' })));
      sc.querySelectorAll('[data-bowline]').forEach((bl) => {
        const d = 500, ln = bl.querySelector('[data-bl]'), bow = bl.querySelector('[data-bow]'), dia = bl.querySelector('[data-bd]');
        A.push(ln.animate([{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], { duration: 1600, delay: d, easing: B, fill: 'both' }));
        A.push(bow.animate([{ transform: 'translate(0px,10px) rotate(-3deg)', opacity: 0 }, { opacity: 1, offset: .12 }, { transform: 'translate(170px,8px) rotate(2deg)', opacity: 1, offset: .55 }, { opacity: 1, offset: .86 }, { transform: 'translate(330px,10px) rotate(-2deg)', opacity: 0 }], { duration: 1600, delay: d, easing: B, fill: 'both' }));
        A.push(dia.animate([{ opacity: 0, transform: 'rotate(45deg) scale(0)', transformOrigin: '150px 22px' }, { opacity: 1, transform: 'rotate(45deg) scale(1)', transformOrigin: '150px 22px' }], { duration: 600, delay: d + 1000, easing: 'cubic-bezier(.34,1.56,.64,1)', fill: 'both' }));
      });
      const arch = sc.querySelector('[data-arch]'), ph = sc.querySelector('[data-photo]'), pz = sc.querySelector('[data-photo-z]');
      if (arch) A.push(arch.animate([{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], { duration: 2000, easing: B, fill: 'both' }));
      if (ph) A.push(ph.animate([{ clipPath: 'inset(100% 0 0 0)' }, { clipPath: 'inset(0 0 0 0)' }], { duration: 1600, delay: 300, easing: 'cubic-bezier(.77,0,.18,1)', fill: 'both' }));
      if (pz) A.push(pz.animate([{ transform: 'scale(1.25)' }, { transform: 'scale(1)' }], { duration: 2600, delay: 300, easing: E, fill: 'both' }));
      A.forEach((a) => a.pause()); this.anims[i] = A;
    });
  }
  playScene(i) {
    const A = this.anims[i]; if (!A || A.played) return;
    A.played = true; A.forEach((a) => a.play());
    this.kick = 1; this.runStrings();
  }

  runOpening() {
    const q = (s) => document.querySelector(s), os = [...document.querySelectorAll('[data-os]')], bow = q('[data-obow]');
    const mono = q('[data-o="mono"]'), hint = q('[data-o="hint"]'), top = q('[data-o="top"]');
    if (this.reduce) { os.forEach((p) => (p.style.strokeDashoffset = 0)); mono.style.opacity = 1; hint.style.opacity = 1; return; }
    const E = 'cubic-bezier(.2,.7,.2,1)';
    top.animate([{ opacity: 0, letterSpacing: '.5em' }, { opacity: 1, letterSpacing: '.36em' }], { duration: 1400, easing: E, fill: 'both' });
    os.forEach((p, i) => p.animate([{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], { duration: 1100, delay: 300 + i * 140, easing: 'cubic-bezier(.6,0,.2,1)', fill: 'both' }));
    const bd = 1700, bdur = 1500;
    bow.animate([{ transform: 'translate(-20px,0) rotate(-4deg)', opacity: 0 }, { opacity: 1, offset: .1 }, { transform: 'translate(160px,0) rotate(1deg)', opacity: 1, offset: .55 }, { opacity: 1, offset: .85 }, { transform: 'translate(340px,0) rotate(-2deg)', opacity: 0 }], { duration: bdur, delay: bd, easing: 'cubic-bezier(.45,0,.3,1)', fill: 'both' });
    this.oAmp = [0, 0, 0, 0];
    this._timers = [70, 90, 110, 130].map((x, i) => setTimeout(() => { this.oAmp[i] = 1; this.runOpenStrings(os); }, bd + bdur * ((x + 20) / 360)));
    os.forEach((p) => p.animate([{ opacity: 1 }, { opacity: .3 }], { duration: 900, delay: 3500, fill: 'forwards' }));
    mono.animate([{ opacity: 0, transform: 'scale(.9)', filter: 'blur(10px)' }, { opacity: 1, transform: 'none', filter: 'blur(0)' }], { duration: 1300, delay: 3400, easing: E, fill: 'forwards' });
    hint.animate([{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'none' }], { duration: 900, delay: 4300, easing: E, fill: 'forwards' });
  }
  runOpenStrings(os) {
    if (this._oraf) return;
    const X = [70, 90, 110, 130];
    const loop = (t) => {
      let any = false;
      os.forEach((p, i) => { this.oAmp[i] *= .955; const o = this.oAmp[i] * 9 * Math.sin(t / (26 + i * 6)); if (this.oAmp[i] > .01) any = true; p.setAttribute('d', `M${X[i]} 20 Q${(X[i] + o).toFixed(2)} 150 ${X[i]} 280`); });
      if (!any) { os.forEach((p, i) => p.setAttribute('d', `M${X[i]} 20 Q${X[i]} 150 ${X[i]} 280`)); this._oraf = null; return; }
      this._oraf = requestAnimationFrame(loop);
    };
    this._oraf = requestAnimationFrame(loop);
  }

  runStrings() {
    if (this._raf || this.reduce) return;
    const paths = [...document.querySelectorAll('[data-str]')], X = [14, 38, 62, 86];
    const loop = (t) => {
      this.kick = (this.kick || 0) * .965;
      const amp = this.kick * 12;
      paths.forEach((p, i) => { const o = amp * Math.sin(t / (32 + i * 8) + i * 1.7); p.setAttribute('d', `M${X[i]} 0 Q${(X[i] + o).toFixed(2)} 500 ${X[i]} 1000`); });
      if (amp < .02) { paths.forEach((p, i) => p.setAttribute('d', `M${X[i]} 0 Q${X[i]} 500 ${X[i]} 1000`)); this._raf = null; return; }
      this._raf = requestAnimationFrame(loop);
    };
    this._raf = requestAnimationFrame(loop);
  }

  advance = (e) => {
    if (e && e.target && e.target.closest && e.target.closest('a,button')) return;
    if (!this.sc) return;
    if (this.state.scene === 0 && Math.round(this.sc.scrollTop) < 4 && !this.reduce) return this.expand();
    const sc = this.sc, h = sc.clientHeight, n = 7, i = Math.min(n - 1, Math.round(sc.scrollTop / h) + 1);
    sc.scrollTo({ top: i * h, behavior: this.reduce ? 'auto' : 'smooth' });
    setTimeout(() => this.syncScene(), 900);
  };

  expand() {
    if (this._exp) return; this._exp = true;
    const q = (s) => document.querySelector(s), x = q('[data-x]'), hole = q('[data-xh]'), out = q('[data-xo]'), op = q('[data-xop]');
    const mono = q('[data-o="mono"]'), hint = q('[data-o="hint"]'), top = q('[data-o="top"]'), os = [...document.querySelectorAll('[data-os]')];
    const sc = this.sc;
    if (!x || !hole) { this._exp = false; sc.scrollTo({ top: sc.clientHeight, behavior: 'smooth' }); return; }
    const violin = (this.props.formaAbertura ?? 'Violino') === 'Violino', cx0 = violin ? 50 : 43, cy0 = violin ? 50 : 67;
    const W = innerWidth, H = innerHeight, k0 = Math.min(H * .5, W * .9) / 130, k1 = Math.hypot(W, H) / (violin ? 9 : 11);
    const fades = [mono, hint, top, ...os].filter(Boolean).map((el) => el.animate([{ opacity: getComputedStyle(el).opacity }, { opacity: 0 }], { duration: 350, fill: 'forwards' }));
    x.style.visibility = 'visible'; x.style.opacity = 1;
    const set = (k) => {
      const tr = `translate(${(W / 2).toFixed(1)} ${(H / 2).toFixed(1)}) scale(${k.toFixed(5)}) translate(${-cx0} ${-cy0})`;
      hole.setAttribute('transform', tr); out.setAttribute('transform', tr);
      if (op) op.style.strokeWidth = (1.3 / Math.max(k, .0001)).toFixed(4);
    };
    set(0);
    setTimeout(() => {
      sc.style.scrollBehavior = 'auto'; sc.scrollTop = sc.clientHeight; this.syncScene();
      const spring = (t) => 1 - Math.exp(-6 * t) * Math.cos(7 * t), inout = (t) => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      const T1 = 900, P = 450, T2 = 1250, t0 = performance.now();
      const loop = (now) => {
        const t = now - t0;
        if (t < T1) set(k0 * spring(t / T1));
        else if (t < T1 + P) set(k0);
        else if (t < T1 + P + T2) { const u = inout((t - T1 - P) / T2); set(k0 * Math.pow(k1 / k0, u)); if (out) out.style.opacity = String(Math.max(0, 1 - u * 1.6)); }
        else {
          x.style.visibility = 'hidden'; set(0); if (out) out.style.opacity = '1';
          fades.forEach((a) => a.cancel()); this._exp = false; return;
        }
        requestAnimationFrame(loop);
      };
      requestAnimationFrame(loop);
      this.kick = 1; this.runStrings();
    }, 380);
  }

  n1() { return this.props.nome1 ?? 'Clara'; }
  n2() { return this.props.nome2 ?? 'Vicente'; }

  renderVals() {
    const t = this.theme(), n1 = this.n1(), n2 = this.n2(), sc = this.state.scene, n = 7;
    const mode = this.props.modoNome ?? 'Nomes';
    const d = new Date(this.props.dataISO ?? '2026-10-31T16:30:00'), p2 = (x) => String(x).padStart(2, '0');
    const dark = sc === 0 || sc === n - 1;
    return {
      t, n1, n2, i1: n1.charAt(0).toUpperCase(), i2: n2.charAt(0).toUpperCase(),
      modeInitials: mode === 'Iniciais', modeNames: mode === 'Nomes', modeBoth: mode === 'Iniciais + nomes',
      dt: { weekday: d.toLocaleDateString('pt-BR', { weekday: 'long' }).split('-')[0], day: p2(d.getDate()), year: String(d.getFullYear()),
        month: d.toLocaleDateString('pt-BR', { month: 'long' }), time: `${d.getHours()}h${p2(d.getMinutes())}` },
      siteUrl: this.props.siteUrl ?? '#',
      shapeViolin: (this.props.formaAbertura ?? 'Violino') === 'Violino', shapeNote: (this.props.formaAbertura ?? 'Violino') === 'Nota musical',
      stringsOp: sc > 0 ? .7 : 0, frameOp: sc > 0 && sc < n - 1 ? .7 : 0,
      hintOp: sc > 0 && sc < n - 1 ? 1 : 0, hintColor: dark ? '#dcc393' : t.goldText,
      dots: Array.from({ length: n }, (_, i) => ({ w: i === sc ? '22px' : '6px', bg: i === sc ? (dark ? '#dcc393' : t.ink) : (dark ? 'rgba(220,195,147,.4)' : t.lineStrong) }))
    };
  }
}
