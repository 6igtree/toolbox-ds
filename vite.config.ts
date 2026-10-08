import { defineConfig, type Connect } from 'vite';
import react from '@vitejs/plugin-react';
import { UIS as UI_LIST } from './src/shared/uis.ts';

const UIS: string[] = UI_LIST.map((u) => u.id);

// /<ui>/<tool> を各 UI の HTML に向ける（本番は vercel.json の rewrites が同じことをする）
const rewrite: Connect.NextHandleFunction = (req, _res, next) => {
  const m = req.url?.match(/^\/([a-z]+)(?:\/[\w-]*)?\/?(?:\?.*)?$/);
  if (m && UIS.includes(m[1])) req.url = `/${m[1]}/index.html`;
  next();
};

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'ui-routes',
      configureServer: (s) => void s.middlewares.use(rewrite),
      configurePreviewServer: (s) => void s.middlewares.use(rewrite),
    },
  ],
  server: { port: 5190 }, // subs-twin が 5173〜5176 を使う
  build: {
    rollupOptions: { input: ['index.html', ...UIS.map((ui) => `${ui}/index.html`)] },
  },
});
