import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import fs from "fs";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === 'development' && {
      name: 'file-logger',
      configureServer(server: any) {
        server.middlewares.use('/__log', (req: any, res: any) => {
          if (req.method !== 'POST') {
            res.statusCode = 405;
            res.end('method not allowed');
            return;
          }
          let body = '';
          req.on('data', (chunk: any) => { body += chunk; });
          req.on('end', () => {
            try {
              const logDir = path.resolve(__dirname, 'logs');
              if (!fs.existsSync(logDir)) {
                fs.mkdirSync(logDir, { recursive: true });
              }
              const file = path.join(logDir, 'console.log');
              const line = body.toString();
              fs.appendFileSync(file, line.endsWith('\n') ? line : line + '\n', { encoding: 'utf8' });
              res.statusCode = 200;
              res.end('ok');
            } catch (e) {
              res.statusCode = 500;
              res.end('error');
            }
          });
        });
      }
    }
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
