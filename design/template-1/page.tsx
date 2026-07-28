"use client"
import { useState, useEffect } from "react"

const TOKENS = {
  brown900: "#3C2415",
  brown700: "#4A3728",
  brown600: "#6B5A4B",
  gold: "#B8935A",
  border: "#E8DDD2",
  paper: "#F9F5F0",
  paperLight: "#FDFCFB",
  offWhite: "#FFFCF8",
}

export default function PropostaV2Page() {
  const [coupleName, setCoupleName] = useState("Marina & João")
  const [guests, setGuests] = useState(150)
  const [pack, setPack] = useState<"essencial" | "completa" | "premium">("completa")
  const [extras, setExtras] = useState({ campo: false, lua: false })
  const [countdown, setCountdown] = useState({ d: 10, h: 0, m: 0, s: 0 })
  const [showAccept, setShowAccept] = useState(false)

  const packs = {
    essencial: {
      name: "ESSENCIAL",
      price: 1900,
      label: "",
      recommended: false,
      features: [
        "Assessoria 30 dias antes",
        "Reunião de alinhamento final",
        "Checklist personalizado",
        "Acompanhamento no dia (8h)",
        "Coordenação de fornecedores no dia",
      ],
    },
    completa: {
      name: "COMPLETA",
      price: 2500,
      label: "DIAMANTE • Mais escolhido",
      recommended: true,
      features: [
        "Assessoria completa 6 meses",
        "Visitas técnicas ilimitadas",
        "Curadoria premium 120+ fornecedores",
        "Acompanhamento 12h com 2 cerimonialistas",
        "Negociação exclusiva KD",
      ],
    },
    premium: {
      name: "PREMIUM",
      price: 4200,
      label: "",
      recommended: false,
      features: [
        "Tudo da Completa +",
        "Assessoria desde o pedido até a lua de mel",
        "Wedding Designer incluso",
        "Equipe de 4 profissionais no dia",
        "Assessoria lua de mel completa",
      ],
    },
  }

  const basePrice = packs[pack].price
  const guestsExtra = Math.max(0, guests - 50) * 8
  const extrasTotal = (extras.campo ? 600 : 0) + (extras.lua ? 450 : 0)
  const total = basePrice + guestsExtra + extrasTotal

  useEffect(() => {
    const id = setInterval(() => {
      setCountdown((c) => {
        let { d, h, m, s } = c
        if (s > 0) s--
        else if (m > 0) { m--; s = 59 }
        else if (h > 0) { h--; m = 59; s = 59 }
        else if (d > 0) { d--; h = 23; m = 59; s = 59 }
        return { d, h, m, s }
      })
    }, 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="min-h-screen bg-[#FDFCFB] flex font-[Inter]">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Inter:wght@400;500;600&display=swap');
        .serif{font-family:'Playfair Display',serif}
        @keyframes pulse-gold{0%,100%{box-shadow:0 0 0 0 rgba(184,147,90,.5)}50%{box-shadow:0 0 0 12px rgba(184,147,90,0)}}
        .pulse{animation:pulse-gold 2.2s infinite}
      `}</style>

      {/* SIDEBAR 240px - medida exata que você mediu */}
      <aside className="w-[240px] shrink-0 bg-[#FFFCF8] border-r border-[#E8DDD2] p-6 flex flex-col sticky top-0 h-screen">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-full border border-[#3C2415] flex items-center justify-center font-serif font-bold text-[#3C2415]">KD</div>
          <div>
            <p className="text-[12px] tracking-[0.2em] font-semibold text-[#3C2415] leading-none">KARINA DRIES</p>
            <p className="text-[9px] tracking-[0.18em] text-[#8B7355] mt-1">EVENTOS</p>
          </div>
        </div>
        <div className="h-[1px] bg-gradient-to-r from-[#E8DDD2] via-[#B8935A]/40 to-[#E8DDD2] mb-6" />
        <nav className="space-y-1">
          <div className="bg-[#3C2415] text-white px-4 py-2.5 rounded-full text-[11px] tracking-widest flex justify-between items-center">
            APRESENTAÇÃO <span className="w-1.5 h-1.5 bg-[#B8935A] rounded-full" />
          </div>
          {["QUEM SOMOS","O QUE ESTÁ INCLUSO","COMO FUNCIONA","NO DIA DO CASAMENTO","INVESTIMENTO","EVENTOS REALIZADOS","DEPOIMENTOS","PRÓXIMOS PASSOS"].map(i=>(
            <div key={i} className="px-4 py-2 text-[11px] tracking-[0.12em] text-[#6B5A4B]">{i}</div>
          ))}
        </nav>
        <div className="mt-auto bg-[#F9F5F0] border border-[#E8DDD2] rounded-[20px] p-4">
          <p className="text-[11px] tracking-widest font-semibold text-[#3C2415]">💬 DÚVIDAS?</p>
          <p className="text-[11px] text-[#6B5A4B] mt-1 leading-[1.4]">Fale direto com a Karina. Resposta em até 2h.</p>
          <button className="w-full mt-3 border border-[#E8DDD2] bg-white rounded-full py-2 text-[11px] tracking-widest text-[#3C2415]">CHAMAR NO WHATS</button>
        </div>
      </aside>

      {/* MAIN */}
      <main className="flex-1 min-w-0">
        <div className="bg-[#3C2415] text-white flex items-center justify-center gap-3 py-2.5 text-[11px] tracking-widest sticky top-0 z-20">
          <span className="text-[#B8935A]">◷</span> PROPOSTA VÁLIDA POR:
          <div className="flex gap-2 font-mono">
            <span className="bg-white/10 px-2 py-0.5 rounded">{countdown.d}d</span>
            <span className="bg-white/10 px-2 py-0.5 rounded">{String(countdown.h).padStart(2,'0')}h</span>
            <span className="bg-white/10 px-2 py-0.5 rounded">{String(countdown.m).padStart(2,'0')}m</span>
            <span className="bg-white/10 px-2 py-0.5 rounded">{String(countdown.s).padStart(2,'0')}s</span>
          </div>
        </div>

        <div className="flex">
          <div className="flex-1 p-10 max-w-[720px]">
            <div className="inline-flex bg-white border border-[#E8DDD2] rounded-full px-3 py-1 text-[10px] tracking-widest text-[#6B5A4B] mb-6">
              <span className="w-2 h-2 bg-emerald-400 rounded-full mt-[2px] mr-2" /> PROPOSTA DE ASSESSORIA COMPLETA • V2.0 INTERATIVA
            </div>

            {/* H1 80px Cormorant/Playfair como você mediu */}
            <h1 className="serif text-[80px] leading-[0.9] tracking-[-0.02em] text-[#3C2415] font-bold">
              Proposta de<br/>
              <span
                contentEditable
                suppressContentEditableWarning
                onBlur={e=>setCoupleName(e.currentTarget.textContent||"Marina & João")}
                className="border-b border-dashed border-[#B8935A]/40 cursor-text outline-none"
              >{coupleName}</span> ...<br/>
              <span className="flex items-center gap-3 mt-2"><span className="text-[#B8935A] text-[36px]">♥</span><span className="font-light text-[48px]">assessoria</span></span>
            </h1>

            <p className="serif italic text-[18px] leading-[1.4] text-[#6B5A4B] my-8">“Transformamos sonhos em experiências inesquecíveis — com tecnologia, afeto e método.”</p>

            <div className="grid grid-cols-3 gap-3 mb-8">
              <div className="bg-white border border-[#E8DDD2] rounded-[16px] p-4">
                <p className="text-[10px] tracking-widest text-[#8B7355]">DATA</p>
                <p className="serif font-semibold text-[#3C2415] mt-1">24 de Maio<br/>2026</p>
                <p className="text-[11px] text-[#8B7355]">Sábado • 16h30</p>
              </div>
              <div className="bg-white border border-[#E8DDD2] rounded-[16px] p-4">
                <p className="text-[10px] tracking-widest text-[#8B7355]">CONVIDADOS</p>
                <p className="serif font-semibold text-[#3C2415] mt-1">{guests} pessoas</p>
                <p className="text-[11px] text-[#8B7355]">Villa + Jardim</p>
              </div>
              <div className="bg-white border border-[#E8DDD2] rounded-[16px] p-4">
                <p className="text-[10px] tracking-widest text-[#8B7355]">LOCAL</p>
                <p className="serif font-semibold text-[#3C2415] mt-1">Espaço Villa</p>
                <p className="text-[11px] text-[#8B7355]">Curitiba • PR</p>
              </div>
            </div>

            {/* CALCULADORA */}
            <div className="bg-white border border-[#E8DDD2] rounded-[24px] p-6 shadow-[0_10px_40px_-15px_rgba(60,36,21,0.15)]">
              <h3 className="text-[11px] tracking-[0.2em] font-semibold text-[#3C2415] mb-4">INVESTIMENTO • CALCULADORA AO VIVO</h3>
              <div className="grid grid-cols-3 gap-3 mb-6">
                {Object.entries(packs).map(([k,v])=>(
                  <div key={k} onClick={()=>setPack(k as any)} className={`border-2 rounded-[16px] p-4 cursor-pointer relative transition-all ${pack===k?'border-[#3C2415] bg-[#FFFCF8] scale-[1.02]':'border-[#E8DDD2] hover:border-[#B8935A]/50'} ${v.recommended && pack===k ?'pulse':''}`}>
                    {v.label && <div className="absolute -top-3 left-3 bg-[#B8935A] text-white text-[9px] tracking-widest px-2.5 py-1 rounded-full">{v.label}</div>}
                    <p className="text-[10px] tracking-widest text-[#6B5A4B] mt-1">{v.name}</p>
                    <p className="serif text-[22px] font-bold text-[#3C2415]">R$ {v.price.toLocaleString('pt-BR')}</p>
                    <ul className="mt-2 space-y-1">{v.features.slice(0,2).map(f=><li key={f} className="text-[10px] text-[#6B5A4B] leading-[1.3]">• {f}</li>)}</ul>
                  </div>
                ))}
              </div>

              <div className="mb-5">
                <div className="flex justify-between text-[11px] text-[#6B5A4B] mb-2"><span>Convidados: {guests}</span><span>50 a 300</span></div>
                <input type="range" min={50} max={300} value={guests} onChange={e=>setGuests(Number(e.target.value))} className="w-full accent-[#3C2415] h-1" />
              </div>

              <div className="space-y-2 mb-5">
                <label className="flex items-center justify-between border border-[#E8DDD2] rounded-full px-4 py-2.5 text-[12px] cursor-pointer hover:border-[#B8935A]/50">
                  <span className="flex items-center gap-2"><input type="checkbox" checked={extras.campo} onChange={e=>setExtras({...extras,campo:e.target.checked})} className="accent-[#3C2415]" /> Cerimônia no campo</span>
                  <span className="text-[#B8935A] font-medium">+R$600</span>
                </label>
                <label className="flex items-center justify-between border border-[#E8DDD2] rounded-full px-4 py-2.5 text-[12px] cursor-pointer hover:border-[#B8935A]/50">
                  <span className="flex items-center gap-2"><input type="checkbox" checked={extras.lua} onChange={e=>setExtras({...extras,lua:e.target.checked})} className="accent-[#3C2415]" /> Lua de mel</span>
                  <span className="text-[#B8935A] font-medium">+R$450</span>
                </label>
              </div>

              <div className="bg-[#3C2415] text-white rounded-[16px] p-4 flex justify-between items-center">
                <div><p className="text-[10px] tracking-widest text-white/60">TOTAL AO VIVO</p><p className="serif text-[28px] font-bold leading-none mt-1">R$ {total.toLocaleString('pt-BR')}</p></div>
                <div className="text-right text-[11px] text-white/70 leading-[1.4]"><p>3x, 5x, 7x sem juros</p><p>5% à vista: R$ {(total*0.95).toLocaleString('pt-BR')}</p></div>
              </div>
            </div>

            <div className="mt-6 bg-white border border-[#E8DDD2] rounded-[20px] p-5 flex gap-4 items-center shadow-[0_10px_40px_-15px_rgba(60,36,21,0.1)]">
              <div className="w-10 h-10 rounded-full bg-[#3C2415] text-white flex items-center justify-center font-bold shrink-0">KD</div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] text-[#4A3728] leading-[1.4]">Olá, {coupleName}! Preparamos esta experiência interativa só para vocês. Editem seus nomes, calculem o investimento ao vivo e deixem comentários.</p>
                <p className="text-[11px] text-[#8B7355] mt-1">Toque no nome do casal acima para editar • Proposta com assinatura digital</p>
              </div>
              <button onClick={()=>setShowAccept(true)} className="shrink-0 bg-[#3C2415] text-white rounded-full px-5 py-3 text-[11px] tracking-widest hover:bg-[#4A3728]">ACEITAR PROPOSTA →</button>
            </div>

            {showAccept && (
              <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-6">
                <div className="bg-[#FFFCF8] rounded-[24px] p-8 max-w-[520px] w-full border border-[#E8DDD2]">
                  <h3 className="serif text-[24px] text-[#3C2415] font-bold">Aceitar proposta • {coupleName}</h3>
                  <p className="text-[13px] text-[#6B5A4B] mt-2">ID: KD-{Math.random().toString(36).slice(2,6).toUpperCase()} • Total: R$ {total.toLocaleString('pt-BR')}</p>
                  <div className="grid grid-cols-2 gap-3 mt-6">
                    <input placeholder="Nome completo noiva" className="border border-[#E8DDD2] rounded-full px-4 py-2.5 text-[13px]" />
                    <input placeholder="Nome completo noivo" className="border border-[#E8DDD2] rounded-full px-4 py-2.5 text-[13px]" />
                  </div>
                  <div className="mt-4 border-2 border-dashed border-[#E8DDD2] rounded-[16px] h-[110px] flex items-center justify-center text-[11px] text-[#8B7355]">Área assinatura dedo/mouse - Canvas</div>
                  <div className="flex gap-3 mt-6">
                    <button onClick={()=>setShowAccept(false)} className="flex-1 border border-[#E8DDD2] rounded-full py-3 text-[12px]">Cancelar</button>
                    <button className="flex-1 bg-[#25D366] text-white rounded-full py-3 text-[12px] font-medium">Enviar no WhatsApp da Karina</button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* RIGHT IMAGE 380px */}
          <div className="w-[380px] shrink-0 m-4 rounded-[28px] overflow-hidden relative min-h-[680px] bg-[#E8DDD2]">
            <img src="https://images.unsplash.com/photo-1519741497674-611481863552?w=800" className="absolute inset-0 w-full h-full object-cover" alt="casal" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
            <div className="absolute top-4 left-4 right-4 flex justify-between gap-2">
              <span className="bg-white/90 backdrop-blur rounded-full px-3 py-1 text-[10px] tracking-widest text-[#3C2415]">● AO VIVO • V2.0 INTERATIVA</span>
              <span className="bg-[#B8935A] text-white rounded-full px-3 py-1 text-[10px] tracking-widest">DIAMANTE • MAIS ESCOLHIDO</span>
            </div>
            <div className="absolute bottom-6 left-6 right-6 text-white">
              <p className="serif text-[26px] leading-none">{coupleName}</p>
              <p className="text-[11px] tracking-widest text-white/70 mt-2">24.05.2026 • VILLA SERENA</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
