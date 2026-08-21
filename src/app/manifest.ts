import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ShowRadar",
    short_name: "ShowRadar",
    description: "Controle o que você já assistiu, está assistindo e vai assistir.",
    start_url: "/dashboard",
    // Fixo em "/dashboard" de propósito: o `id` já era esse valor por padrão
    // (quando omitido, a identidade do app é o start_url), e mudá-lo faria o
    // navegador tratar isto como um app DIFERENTE — quem já instalou ficaria
    // com uma instalação órfã. Declarado explicitamente só para a identidade
    // parar de depender do start_url, que pode mudar um dia.
    id: "/dashboard",
    // Também já era o padrão (o escopo omitido deriva do start_url sem o
    // último segmento, ou seja "/"), mas declarar evita que uma mudança de
    // start_url encolha o escopo sem ninguém perceber — e é o escopo que
    // define quais URLs o app instalado pode abrir, incluindo os links de
    // título compartilhados.
    scope: "/",
    // Quando o sistema entrega um link ao app instalado e já existe uma
    // janela aberta, ela navega para a URL pedida em vez de ignorá-la e
    // mostrar o start_url — sem isso, abrir um link de título compartilhado
    // podia cair no dashboard. Não força o sistema a entregar o link ao app:
    // isso é decisão do SO/navegador, e link clicado dentro do navegador
    // embutido do WhatsApp nunca chega aqui.
    launch_handler: { client_mode: "navigate-existing" },
    display: "standalone",
    background_color: "#0F172A",
    theme_color: "#0F172A",
    lang: "pt-BR",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
