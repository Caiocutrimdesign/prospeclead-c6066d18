import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// --- PWA / Cache Kill Switch (FORÇADO) --------------------------------------
// Este bloco garante que versões antigas do código (JS/CSS) presas no cache do 
// navegador sejam removidas. Isso resolve o problema de não ver atualizações.
// IMPORTANTE: Isso NÃO apaga dados de formulários ou banco local (IndexedDB).
if (typeof window !== "undefined") {
  // 1. Desregistrar Service Workers
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (const registration of registrations) {
        registration.unregister();
        console.log("SW desregistrado.");
      }
    });
  }

  // 2. Limpar Cache Storage (Onde ficam os arquivos estáticos index.html, JS, CSS)
  if ("caches" in window) {
    caches.keys().then((names) => {
      for (const name of names) {
        caches.delete(name);
        console.log(`Cache ${name} removido.`);
      }
    });
  }
}
// ----------------------------------------------------------------------------


createRoot(document.getElementById("root")!).render(<App />);
