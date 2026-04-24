import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    VitePWA({
      registerType: "autoUpdate",
      // Não ativa o service worker em dev — fundamental para não quebrar o
      // preview do Lovable, que roda dentro de iframe.
      devOptions: { enabled: false },
      includeAssets: ["favicon.ico", "robots.txt", "pwa-192.png", "pwa-512.png"],
      manifest: {
        name: "ProspecLead",
        short_name: "ProspecLead",
        description:
          "CRM gamificado para promoters — funciona offline e sincroniza automaticamente.",
        theme_color: "#0a3d99",
        background_color: "#ffffff",
        display: "standalone",
        orientation: "portrait",
        scope: "/",
        start_url: "/",
        lang: "pt-BR",
        icons: [
          {
            src: "/pwa-192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/pwa-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/pwa-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        // Cache de assets estáticos da build (JS, CSS, imagens, fontes).
        globPatterns: ["**/*.{js,css,html,ico,png,svg,jpg,jpeg,webp,woff,woff2}"],
        // Aumenta limite para 5 MiB — o bundle JS principal passa de 2 MiB.
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        // Roteamento SPA: volta ao index quando offline.
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [
          /^\/~oauth/,
          /^\/api\//,
          /^\/functions\//,
        ],
        runtimeCaching: [
          {
            // Imagens vindas do Supabase Storage — cache leve, melhor UX offline.
            urlPattern: /^https:\/\/.*\.supabase\.co\/storage\/v1\/object\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "supabase-storage",
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 60 * 60 * 24 * 7, // 7 dias
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Endpoints REST/Auth do Supabase — NÃO cacheamos (sempre rede).
            // Listamos para forçar NetworkOnly com fallback claro.
            urlPattern: /^https:\/\/.*\.supabase\.co\/(rest|auth|functions)\/.*/i,
            handler: "NetworkOnly",
          },
        ],
        cleanupOutdatedCaches: true,
      },
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "@tanstack/react-query", "@tanstack/query-core"],
  },
}));
