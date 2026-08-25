// O "não achei" da PROPOSTA. Aqui a pessoa que lê é a noiva, e a causa
// quase sempre é uma só: o link venceu, foi refeito ou a proposta saiu do
// ar. Dizer isso vale mais que "página não encontrada", porque leva ao
// próximo passo — falar com a cerimonialista — em vez de deixá-la achando
// que digitou errado.
export default function PropostaNaoEncontrada() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#FAF8F5] px-6 py-16">
      <div className="max-w-md">
        <h1
          className="text-2xl text-[#221E1B]"
          style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
        >
          Esta proposta não está mais disponível
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-[#6B6259]">
          O link pode ter vencido ou sido substituído por uma versão nova.
          Fale com a sua cerimonialista e peça o link atualizado — ela
          consegue gerar outro em segundos.
        </p>
      </div>
    </main>
  );
}
