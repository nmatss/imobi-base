let app = null;
let initPromise = null;

async function ensureApp() {
  if (app) return app;
  if (!initPromise) {
    initPromise = import('./_handler.mjs').then(mod => {
      app = mod.default;
      return app;
    });
  }
  return initPromise;
}

export default async function handler(req, res) {
  try {
    const appHandler = await ensureApp();
    appHandler(req, res);
  } catch (e) {
    console.error('HANDLER ERROR:', e.message, e.stack);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({
      error: 'Handler failed',
      message: e.message,
      stack: e.stack?.split('\n').slice(0, 10),
    }));
  }
}