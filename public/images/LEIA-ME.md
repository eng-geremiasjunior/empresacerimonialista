# Imagens padrão da landing da proposta

Assets de fábrica usados quando a empresa **não** customizou a imagem em
Configurações → Conteúdo da Proposta (ou seja, quando a coluna em
`empresas` está `NULL`).

| Arquivo | Onde aparece | Formato ideal |
|---|---|---|
| `hero-padrao.png` | Fundo do topo da proposta (`HeroApresentacao`) | horizontal, ~1600×1000 |
| `no-dia-evento-padrao.jpg` | Ao lado das responsabilidades (`NoDiaDoEvento`) | ~1000×700 — **ainda não fornecido** |

Os nomes são referenciados em `src/lib/landing-imagens.ts` (`IMAGEM_PADRAO`).
Trocar o nome do arquivo exige atualizar essa constante.

Enquanto os arquivos não existirem, as duas áreas caem no tom de fundo
`#EFDCD5` em vez de mostrar ícone de imagem quebrada — a landing continua
apresentável, só sem a foto.
