// Service worker do Portal da Cliente.
//
// Existe por dois motivos, e NENHUM deles é cache agressivo:
//
//   1) Sem um service worker com handler de fetch, o Chrome no Android
//      não oferece "instalar". É requisito da plataforma, não escolha.
//   2) Quando o sinal cai no meio do salão — e cai — a noiva vê uma
//      página nossa dizendo o que houve, em vez do dinossauro do
//      navegador.
//
// O que este arquivo NÃO faz, de propósito: não guarda página do portal
// em cache. Roteiro, horário e resposta de pergunta mudam o tempo todo, e
// mostrar um roteiro velho no dia do evento é pior do que não mostrar
// nada. Rede primeiro, sempre; o cache guarda só a casca offline.

const CACHE = "portal-v1";
const OFFLINE = "/portal-offline.html";

self.addEventListener("install", (evento) => {
  evento.waitUntil(
    caches.open(CACHE).then((c) => c.add(OFFLINE)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (evento) => {
  evento.waitUntil(
    caches
      .keys()
      .then((chaves) =>
        Promise.all(chaves.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (evento) => {
  const req = evento.request;

  // Só navegação. Imagem, script e chamada de dados seguem direto para a
  // rede: interceptá-los aqui só criaria uma camada a mais para errar.
  if (req.mode !== "navigate") return;

  evento.respondWith(
    fetch(req).catch(() =>
      caches.match(OFFLINE).then((r) => r ?? Response.error())
    )
  );
});
