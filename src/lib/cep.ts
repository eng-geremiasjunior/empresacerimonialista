// Consulta de CEP via ViaCEP (API pública, sem autenticação).
// Client-side. Retorna null se o CEP for inválido ou não encontrado.

export type EnderecoCep = {
  endereco: string; // logradouro + bairro
  cidade: string; // "Cidade - UF"
};

export async function buscarCep(cep: string): Promise<EnderecoCep | null> {
  const dig = cep.replace(/\D/g, "");
  if (dig.length !== 8) return null;
  try {
    const res = await fetch(`https://viacep.com.br/ws/${dig}/json/`);
    if (!res.ok) return null;
    const data = (await res.json()) as {
      erro?: boolean;
      logradouro?: string;
      bairro?: string;
      localidade?: string;
      uf?: string;
    };
    if (data.erro) return null;
    const endereco = [data.logradouro, data.bairro].filter(Boolean).join(", ");
    const cidade = [data.localidade, data.uf].filter(Boolean).join(" - ");
    return { endereco, cidade };
  } catch {
    return null;
  }
}
