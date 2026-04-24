import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// --- PWA / Service Worker registration ---------------------------------------
// O service worker SÓ é registrado em produção, fora de iframes (preview do
// Lovable) e fora de domínios de preview. Isso evita que o SW intercepte
// requisições do editor e mostre conteúdo desatualizado.
const isInIframe = (() => {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
})();

const host = window.location.hostname;
const isPreviewHost =
  host.includes("id-preview--") ||
  host.includes("lovableproject.com") ||
  host.endsWith("lovable.app") && host.startsWith("id-preview--");

if (isInIframe || isPreviewHost) {
  // Garantia extra: se já houver um SW registrado por uma versão anterior,
  // remove para que o preview volte a comportar-se normalmente.
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker
      .getRegistrations()
      .then((regs) => regs.forEach((r) => r.unregister()))
      .catch(() => {});
  }
} else if ("serviceWorker" in navigator && import.meta.env.PROD) {
  // Importação dinâmica — só carrega o registrar do vite-plugin-pwa em prod.
  import("virtual:pwa-register")
    .then(({ registerSW }) => {
      const updateSW = registerSW({
        immediate: true,
        onNeedRefresh() {
          updateSW(true);
        },
      });
    })
    .catch(() => {
      // virtual:pwa-register só existe quando o plugin está ativo na build
    });
}

createRoot(document.getElementById("root")!).render(<App />);
