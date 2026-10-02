// A base que a lógica dos convites espera (o "DCLogic" do Claude Design),
// com a mesma semântica do runtime do desenho (support.js, StreamableLogic):
// props, state, setState(patch | fn, cb) — o state muda NA HORA e a marcação
// é redesenhada depois, em lote —, forceUpdate e o ciclo componentDidMount /
// componentDidUpdate / componentWillUnmount; renderVals() dá os valores da
// marcação, mesclados por cima das props. A lógica de cada convite
// (modelos/cNN/logica.ts) é a do desenho, copiada literal; quem dá vida a
// ela é o motor (montar.ts).

export type Valores = Record<string, unknown>;
type Patch = Record<string, unknown>;

export class DCLogic {
  props: Record<string, unknown>;
  state: Record<string, unknown> = {};
  /** o motor liga aqui: agenda o redesenho da marcação (e o cb depois dele) */
  __agendar?: (cb?: () => void) => void;
  /** o motor liga aqui: a paleta e as fontes locais aplicadas a um texto */
  __ajustar?: (s: string) => string;

  constructor(props: Record<string, unknown>) {
    this.props = props || {};
  }

  setState(update: Patch | ((s: Record<string, unknown>) => Patch | null | undefined), cb?: () => void): void {
    const prev = this.state;
    const patch = typeof update === "function" ? update(prev) : update;
    this.state = { ...prev, ...(patch || {}) };
    this.__agendar?.(cb);
  }

  forceUpdate(): void {
    this.__agendar?.();
  }

  /**
   * A paleta e as fontes escolhidas, aplicadas a uma cor ou família que a
   * lógica do desenho usa direto no código (animação, canvas, style.*).
   * É a única troca permitida na lógica copiada: `'#b08d57'` vira
   * `this.ajustar('#b08d57')`.
   */
  ajustar(s: string): string {
    return this.__ajustar ? this.__ajustar(s) : s;
  }

  componentDidMount(): void {}

  componentDidUpdate(_prevProps?: Record<string, unknown>): void {}

  componentWillUnmount(): void {}

  renderVals(): Valores {
    return {};
  }
}

export type ClasseDoConvite = new (props: Record<string, unknown>) => DCLogic;
