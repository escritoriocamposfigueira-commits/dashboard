const captadorPolish = document.createElement("link");
captadorPolish.rel = "stylesheet";
captadorPolish.href = "polish.css";
document.head.appendChild(captadorPolish);

window.CAPTADOR_CONFIG = Object.freeze({
  apiUrl: "https://ggfjmqttrktsfcaymsvu.supabase.co/functions/v1/captador-api",
  whatsappImobiliaria: "551123785643",
  whatsappEngenharia: "551123785643",
  whatsappAdvocacia: "551123785643",
  privacyUrl: "https://www.escritoriocamposfigueira.com.br/politica-de-privacidade",
});
