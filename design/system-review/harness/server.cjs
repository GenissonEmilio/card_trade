const fs = require('fs'),
  path = require('path'),
  http = require('http');
const esbuild = require('esbuild');
const root = path.resolve(__dirname, '../../..'),
  output = path.join(__dirname, '.local');
fs.mkdirSync(output, { recursive: true });
const mime = {
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.ttf': 'font/ttf',
  '.woff2': 'font/woff2',
  '.json': 'application/json',
};
const html =
  '<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>QA isolada Duelink</title><link rel="stylesheet" href="/qa.css"></head><body><div id="root"></div><script src="/qa.js" defer></script></body></html>';
fs.writeFileSync(path.join(output, 'index.html'), html);
const aliases = {
  providers: path.join(__dirname, 'providers.tsx'),
  supabase: path.join(__dirname, 'supabase.ts'),
  navigation: path.join(__dirname, 'navigation.ts'),
  link: path.join(__dirname, 'link.tsx'),
};
let currentBuild = null;
function build() {
  if (currentBuild) return currentBuild;
  currentBuild = (async () => {
    const ordered = [
      'globals.css',
      'multigame.css',
      'navigation.css',
      'pixel-explore.css',
      'design-tokens.css',
      'design-system.css',
    ];
    const cssFiles = fs
      .readdirSync(path.join(root, 'src/app'))
      .filter((f) => f.endsWith('.css'))
      .sort((a, b) => {
        let i = ordered.indexOf(a),
          j = ordered.indexOf(b);
        return (i < 0 ? 99 : i) - (j < 0 ? 99 : j);
      });
    const imports =
      cssFiles
        .map(
          (file) =>
            `import ${JSON.stringify(path.join(root, 'src/app', file).replaceAll('\\', '/'))};`,
        )
        .join('\n') +
      '\nimport ' +
      JSON.stringify(path.join(__dirname, 'entry.tsx').replaceAll('\\', '/')) +
      ';';
    await esbuild.build({
      stdin: {
        contents: imports,
        resolveDir: root,
        sourcefile: 'duelink-qa-entry.tsx',
        loader: 'tsx',
      },
      absWorkingDir: root,
      outfile: path.join(output, 'qa.js'),
      bundle: true,
      format: 'iife',
      platform: 'browser',
      jsx: 'automatic',
      sourcemap: true,
      loader: { '.module.css': 'local-css' },
      external: ['/fonts/*', '/brand/*', '/cards/*', '/logo.svg', '/card-back.svg'],
      define: { 'process.env.NODE_ENV': '"development"' },
      plugins: [
        {
          name: 'qa-only-aliases',
          setup(b) {
            b.onResolve({ filter: /.*/ }, (args) => {
              if (args.path === 'next/navigation') return { path: aliases.navigation };
              if (args.path === 'next/link') return { path: aliases.link };
              if (
                args.path === '@/lib/supabase/client' ||
                ((args.path === './providers' || args.path === '@/components/providers') &&
                  args.importer.replaceAll('\\', '/').includes('/src/'))
              )
                return {
                  path: args.path.includes('supabase') ? aliases.supabase : aliases.providers,
                };
              return null;
            });
          },
        },
      ],
      logLevel: 'warning',
    });
    return { cssFiles };
  })().finally(() => (currentBuild = null));
  return currentBuild;
}
function safeFile(base, requested) {
  const target = path.resolve(base, '.' + requested);
  return target.startsWith(base + path.sep) ? target : null;
}
const mappedPaths = {
  '/': 'library',
  '/colecao': 'library',
  '/desejos': 'wishlist',
  '/decks': 'decks',
  '/configuracoes': 'settings',
  '/comunidade': 'community',
  '/matches': 'matches',
  '/trocas': 'trades',
  '/mercado': 'marketplace',
  '/vender': 'seller',
  '/pedidos': 'orders',
  '/admin': 'admin',
  '/admin/mercado': 'moderation',
  '/login': 'login',
  '/cadastro': 'register',
  '/recuperar-senha': 'forgot',
};
const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://127.0.0.1:3102');
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; form-action 'self'; base-uri 'self'",
    );
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.writeHead(405);
      return res.end('QA server accepts reads only; mutations exist solely in browser memory.');
    }
    if (url.pathname === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ qaOnly: true, port: 3102, pid: process.pid }));
    }
    if (url.pathname === '/qa.js' || url.pathname === '/qa.css' || url.pathname.endsWith('.map')) {
      await build();
      const file = safeFile(output, url.pathname);
      if (file && fs.existsSync(file)) {
        res.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'text/plain' });
        return fs.createReadStream(file).pipe(res);
      }
    }
    if (url.pathname.startsWith('/api/card-image/')) {
      const id = decodeURIComponent(url.pathname.split('/').pop());
      const name = /^\d{1,10}$/.test(id) ? `/cards/${id}.jpg` : '/card-back.svg';
      const file = safeFile(path.join(root, 'public'), name);
      if (file && fs.existsSync(file)) {
        res.writeHead(200, { 'Content-Type': mime[path.extname(file)] });
        return fs.createReadStream(file).pipe(res);
      }
      res.writeHead(200, { 'Content-Type': 'image/svg+xml' });
      return fs.createReadStream(path.join(root, 'public/card-back.svg')).pipe(res);
    }
    if (url.pathname.startsWith('/api/')) {
      res.writeHead(501, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'QA isolation: no API forwarding.' }));
    }
    const asset = safeFile(path.join(root, 'public'), decodeURIComponent(url.pathname));
    if (asset && fs.existsSync(asset) && fs.statSync(asset).isFile()) {
      res.writeHead(200, {
        'Content-Type': mime[path.extname(asset)] || 'application/octet-stream',
      });
      return fs.createReadStream(asset).pipe(res);
    }
    if (url.pathname !== '/') {
      const screen =
        mappedPaths[url.pathname] ||
        (url.pathname.startsWith('/trocas/')
          ? 'trade-detail'
          : url.pathname.startsWith('/pedidos/')
            ? 'order-detail'
            : url.pathname.startsWith('/perfil/')
              ? 'profile'
              : null);
      if (screen) {
        url.searchParams.set('screen', screen);
        res.writeHead(302, { Location: '/?' + url.searchParams });
        return res.end();
      }
    }
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(html);
  } catch (e) {
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end(String(e));
    console.error(e);
  }
});
build()
  .then(() =>
    server.listen(3102, '127.0.0.1', () => {
      fs.writeFileSync(
        path.join(output, 'server.json'),
        JSON.stringify({ pid: process.pid, port: 3102, startedAt: new Date().toISOString() }),
      );
      console.log(
        'QA isolated harness http://127.0.0.1:3102/?screen=library&role=user&state=populated',
      );
    }),
  )
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  });
