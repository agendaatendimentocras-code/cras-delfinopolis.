import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig(({ command }) => ({
  plugins: [react()],
  // Remove console.* e debugger apenas no BUILD de produção (mantém no dev)
  esbuild: command === 'build' ? { drop: ['console', 'debugger'] } : {},
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  // ============================================================
  // Servidor de desenvolvimento + HMR ESTÁTICOS
  // Corrige o erro: ws://localhost:undefined/?token=... is invalid
  // ============================================================
  server: {
    host: 'localhost',
    port: 5173,
    strictPort: true, // falha se a porta estiver ocupada (em vez de trocar)
    hmr: {
      protocol: 'ws',
      host: 'localhost',
      port: 5173, // fixa a porta do WebSocket (evita "undefined")
    },
  },
  preview: {
    host: 'localhost',
    port: 4173,
    strictPort: true,
  },
  build: {
    target: 'es2020',
    // Sem sourcemaps em produção (não expõe o código-fonte no navegador)
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          supabase: ['@supabase/supabase-js'],
          charts: ['date-fns'],
        },
      },
    },
  },
}));
