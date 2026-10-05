const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, 'data');
const PORT = Number(process.env.PORT || 3000);
const SUBMISSIONS_FILE = process.env.SUBMISSIONS_FILE
  ? path.resolve(process.env.SUBMISSIONS_FILE)
  : path.join(DATA_DIR, 'submissions.json');

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.jsx': 'text/babel; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp'
};

function readJson(file, fallback = []) {
  try {
    return JSON.parse(fs.readFileSync(path.join(DATA_DIR, file), 'utf8'));
  } catch {
    return fallback;
  }
}

function writeJson(file, value) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(path.join(DATA_DIR, file), `${JSON.stringify(value, null, 2)}\n`);
}

function readSubmissions() {
  try {
    return JSON.parse(fs.readFileSync(SUBMISSIONS_FILE, 'utf8'));
  } catch {
    return [];
  }
}

function writeSubmissions(value) {
  fs.mkdirSync(path.dirname(SUBMISSIONS_FILE), { recursive: true });
  fs.writeFileSync(SUBMISSIONS_FILE, `${JSON.stringify(value, null, 2)}\n`);
}

function send(res, status, payload, headers = {}) {
  const body = typeof payload === 'string' ? payload : JSON.stringify(payload);
  res.writeHead(status, {
    'Content-Type': typeof payload === 'string' ? 'text/plain; charset=utf-8' : 'application/json; charset=utf-8',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    ...headers
  });
  res.end(body);
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 1024 * 1024) {
        reject(new Error('Payload too large'));
        req.destroy();
      }
    });
    req.on('end', () => {
      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}

function publicPost(post) {
  const { body, ...summary } = post;
  return summary;
}

function isValidEmail(value) {
  return /^\S+@\S+\.\S+$/.test(String(value || ''));
}

async function handleApi(req, res, url) {
  const parts = url.pathname.split('/').filter(Boolean);

  if (req.method === 'GET' && url.pathname === '/api/health') {
    return send(res, 200, { ok: true, service: 'alter-labs-api' });
  }

  if (req.method === 'GET' && url.pathname === '/api/posts') {
    const posts = readJson('posts.json').map(publicPost);
    return send(res, 200, { posts });
  }

  if (req.method === 'GET' && parts[0] === 'api' && parts[1] === 'posts' && parts[2]) {
    const post = readJson('posts.json').find((item) => item.slug === parts[2]);
    return post ? send(res, 200, { post }) : send(res, 404, { error: 'Post not found' });
  }

  if (req.method === 'GET' && url.pathname === '/api/guides') {
    const guides = readJson('guides.json').map(publicPost);
    return send(res, 200, { guides });
  }

  if (req.method === 'GET' && parts[0] === 'api' && parts[1] === 'guides' && parts[2]) {
    const guide = readJson('guides.json').find((item) => item.slug === parts[2]);
    return guide ? send(res, 200, { guide }) : send(res, 404, { error: 'Guide not found' });
  }

  if (req.method === 'POST' && url.pathname === '/api/contact') {
    try {
      const body = await parseBody(req);
      const errors = {};
      if (!String(body.name || '').trim()) errors.name = 'required';
      if (!isValidEmail(body.email)) errors.email = 'valid email required';
      if (String(body.message || '').trim().length < 10) errors.message = 'tell us a bit more';

      if (Object.keys(errors).length) {
        return send(res, 422, { error: 'Validation failed', fields: errors });
      }

      const submissions = readSubmissions();
      const submission = {
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        name: String(body.name).trim(),
        email: String(body.email).trim().toLowerCase(),
        company: String(body.company || '').trim(),
        scope: Array.isArray(body.scope) ? body.scope.map(String) : [],
        budget: String(body.budget || '').trim(),
        message: String(body.message).trim()
      };

      submissions.unshift(submission);
      writeSubmissions(submissions.slice(0, 500));
      return send(res, 201, { ok: true, id: submission.id });
    } catch (error) {
      return send(res, 400, { error: error.message || 'Bad request' });
    }
  }

  return send(res, 404, { error: 'Route not found' });
}

function serveStatic(req, res, url) {
  const host = String(req.headers.host || '').toLowerCase().split(':')[0];
  const isShowcaseHost = host === 'showcase.alterlabs.in' || host === 'www.showcase.alterlabs.in';
  const showcaseAliases = {
    '/': '/showcase/index.html',
    '/index.html': '/showcase/index.html',
    '/robots.txt': '/showcase/robots.txt',
    '/sitemap.xml': '/showcase/sitemap.xml'
  };
  const requested = isShowcaseHost && showcaseAliases[url.pathname]
    ? showcaseAliases[url.pathname]
    : url.pathname === '/'
      ? '/index.html'
      : url.pathname === '/favicon.ico'
        ? '/favicon.svg'
        : decodeURIComponent(url.pathname);
  const filePath = path.resolve(ROOT, `.${requested}`);
  const relativePath = path.relative(ROOT, filePath);

  if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
    return send(res, 403, 'Forbidden');
  }

  fs.readFile(filePath, (error, content) => {
    if (error) return send(res, 404, 'Not found');
    res.writeHead(200, {
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Content-Type': TYPES[path.extname(filePath).toLowerCase()] || 'application/octet-stream'
    });
    res.end(content);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  if (url.pathname.startsWith('/api/')) {
    return handleApi(req, res, url);
  }
  return serveStatic(req, res, url);
});

server.listen(PORT, () => {
  console.log(`Alter Labs site running at http://localhost:${PORT}`);
});
