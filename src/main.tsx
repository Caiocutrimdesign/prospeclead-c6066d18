import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// --- PWA / Service Worker Kill Switch ---------------------------------------
// Forçamos a remoção de qualquer Service Worker ativo para resolver o problema
// de cache persistente que está bloqueando a visualização das atualizações.
if ("serviceWorker" in navigator) {
  navigator.serviceWorker
    .getRegistrations()
    .then((regs) => {
      regs.forEach((r) => {
        r.unregister();
        console.log("Service Worker desregistrado para limpeza de cache.");
      });
    })
    .catch((err) => console.error("Erro ao desregistrar SW:", err));
}

createRoot(document.getElementById("root")!).render(<App />);
