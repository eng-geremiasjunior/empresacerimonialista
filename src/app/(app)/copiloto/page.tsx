'use client'
import { useState } from 'react'

export default function Page() {
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  async function send() {
    if (!input) return
    const newMessages = [...messages, { role: 'user', content: input }]
    setMessages(newMessages)
    setInput('')
    setLoading(true)
    const res = await fetch('/api/ai/copiloto', {
      method: 'POST',
      body: JSON.stringify({ messages: newMessages })
    })
    const data = await res.json()
    // Sem isto, um erro do servidor virava uma bolha vazia na tela.
    setMessages([
      ...newMessages,
      {
        role: 'assistant',
        content: res.ok ? data.text : (data.error ?? 'não consegui responder agora.'),
      },
    ])
    setLoading(false)
  }

  return (
    <div style={{ maxWidth: '600px', margin: '20px auto', padding: '20px' }}>
      <h1 style={{ fontWeight: 'bold' }}>Copiloto Vela - Teste Llama Meta</h1>
      <div style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '10px', minHeight: '300px', background: '#f9f9f9', marginTop: '10px' }}>
        {messages.map((m, i) => (
          <div key={i} style={{ textAlign: m.role === 'user'? 'right' : 'left', margin: '8px 0' }}>
            <span style={{ display: 'inline-block', padding: '8px 12px', borderRadius: '8px', background: m.role === 'user'? '#111' : '#fff', color: m.role === 'user'? '#fff' : '#000', border: '1px solid #ddd' }}>
              {m.content}
            </span>
          </div>
        ))}
        {loading && <div>Digitando...</div>}
      </div>
      <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
        <input style={{ flex: 1, border: '1px solid #ddd', borderRadius: '6px', padding: '10px' }} value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()} placeholder="Ex: Quanto falta pagar da Ana?" />
        <button onClick={send} style={{ background: '#111', color: '#fff', padding: '10px 16px', borderRadius: '6px' }}>Enviar</button>
      </div>
    </div>
  )
}