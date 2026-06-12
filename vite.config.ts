import { IncomingMessage, ServerResponse } from 'node:http';
import { defineConfig, loadEnv, ViteDevServer } from 'vite';
import react from '@vitejs/plugin-react';
import legacy from '@vitejs/plugin-legacy';
import { handleVerifySubscriptionRequest } from './server/payments/verifySubscription';
import approveAgencyHandler from './api/admin/approve-agency';

const readJsonBody = async (req: IncomingMessage) => {
  const chunks: Buffer[] = [];

  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  if (chunks.length === 0) {
    return {};
  }

  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
};

const sendJson = (res: ServerResponse, status: number, body: unknown) => {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
};

const adaptVercelHandler = (handler: any) => {
  return async (req: IncomingMessage & { body?: any }, res: ServerResponse) => {
    if (req.body === undefined) {
      const chunks: Buffer[] = [];
      for await (const chunk of req) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      }
      const bodyText = Buffer.concat(chunks).toString('utf8');
      if (bodyText) {
        try {
          req.body = JSON.parse(bodyText);
        } catch (e) {
          req.body = {};
        }
      } else {
        req.body = {};
      }
    }

    const vercelReq = req as any;
    const vercelRes = Object.assign(res, {
      status(code: number) {
        res.statusCode = code;
        return vercelRes;
      },
      json(data: any) {
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(data));
        return vercelRes;
      }
    }) as any;

    try {
      await handler(vercelReq, vercelRes);
    } catch (err) {
      console.error('Error in local API handler:', err);
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: err instanceof Error ? err.message : 'Internal Server Error' }));
    }
  };
};

const subscriptionVerificationDevPlugin = () => ({
  name: 'subscription-verification-dev-plugin',
  apply: 'serve' as const,
  configureServer(server: ViteDevServer) {
    server.middlewares.use(async (req: IncomingMessage & { url?: string }, res: ServerResponse, next: () => void) => {
      const pathname = (req.url || '').split('?')[0];

      if (pathname === '/api/payments/verify-subscription') {
        if (req.method !== 'POST') {
          sendJson(res, 405, { ok: false, error: 'Method Not Allowed' });
          return;
        }

        try {
          const body = await readJsonBody(req);
          const result = await handleVerifySubscriptionRequest(body);
          sendJson(res, result.status, result.body);
        } catch (error) {
          sendJson(res, 500, {
            ok: false,
            error: error instanceof Error ? error.message : 'Erreur serveur de developpement.',
          });
        }
        return;
      }

      if (pathname === '/api/admin/approve-agency') {
        const handler = adaptVercelHandler(approveAgencyHandler);
        await handler(req, res);
        return;
      }

      next();
    });
  },
});

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  Object.assign(process.env, env);

  return {
    plugins: [
      react(),
      legacy({
        targets: ['defaults', 'not IE 11', 'Safari 12'],
      }),
      subscriptionVerificationDevPlugin(),
    ],
    build: {
      outDir: 'dist',
      sourcemap: false,
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_console: true,
          drop_debugger: true,
        },
      },
      rollupOptions: {
        output: {
          manualChunks: {
            'vendor-core': ['react', 'react-dom'],
            'vendor-router': ['react-router-dom', '@tanstack/react-query'],
            'vendor-supabase': ['@supabase/supabase-js'],
            'vendor-ui': ['lucide-react', 'clsx', 'tailwind-merge', 'react-hot-toast'],
            'vendor-utils': ['date-fns', 'dexie', 'html2canvas', 'jspdf'],
          }
        }
      }
    },
    server: {
      port: 3000,
      host: true,
      hmr: {
        overlay: false
      }
    },
    preview: {
      port: 3000,
      host: true
    },
    optimizeDeps: {
      exclude: ['lucide-react'],
    },
  };
});
