const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { exec } = require('node:child_process');

const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data', 'dishes.json');
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

// Active admin session tokens (persisted in-memory)
const activeTokens = new Set();

// ─── ANSI COLORS & ICONS FOR STYLISH TERMINAL LOGS ─────────
const C = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  italic: '\x1b[3m',
  underline: '\x1b[4m',
  
  // Foregrounds
  black: '\x1b[30m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  gray: '\x1b[90m',
  
  // Brights
  brightRed: '\x1b[91m',
  brightGreen: '\x1b[92m',
  brightYellow: '\x1b[93m',
  brightBlue: '\x1b[94m',
  brightMagenta: '\x1b[95m',
  brightCyan: '\x1b[96m',
  brightWhite: '\x1b[97m',
  
  // Backgrounds
  bgGreen: '\x1b[42m\x1b[30m',
  bgBlue: '\x1b[44m\x1b[37m',
  bgYellow: '\x1b[43m\x1b[30m',
  bgRed: '\x1b[41m\x1b[37m',
  bgMagenta: '\x1b[45m\x1b[37m'
};

function formatMethod(method) {
  switch (method) {
    case 'GET':    return `${C.brightGreen}${C.bold} GET    ${C.reset}`;
    case 'POST':   return `${C.brightBlue}${C.bold} POST   ${C.reset}`;
    case 'PUT':    return `${C.brightYellow}${C.bold} PUT    ${C.reset}`;
    case 'PATCH':  return `${C.brightMagenta}${C.bold} PATCH  ${C.reset}`;
    case 'DELETE': return `${C.brightRed}${C.bold} DELETE ${C.reset}`;
    case 'OPTIONS':return `${C.gray} OPTION ${C.reset}`;
    default:       return ` ${method.padEnd(6)} `;
  }
}

function formatStatus(code) {
  if (code >= 200 && code < 300) return `${C.brightGreen}${C.bold}${code}${C.reset}`;
  if (code >= 300 && code < 400) return `${C.cyan}${code}${C.reset}`;
  if (code >= 400 && code < 500) return `${C.brightYellow}${C.bold}${code}${C.reset}`;
  return `${C.brightRed}${C.bold}${code}${C.reset}`;
}

function getTimestamp() {
  const d = new Date();
  const pad = n => String(n).padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function logEvent(tag, message, color = C.brightCyan) {
  const time = `${C.gray}${getTimestamp()}${C.reset}`;
  console.log(` ${C.dim}│${C.reset} ${time}  ${color}${C.bold}✦ [${tag}]${C.reset} ${message}`);
}

// ─── DATA PERSISTENCE HELPERS ──────────────────────────────
function loadDishes() {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      const dir = path.dirname(DATA_FILE);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(DATA_FILE, '[]', 'utf8');
      return [];
    }
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error reading dishes.json:', err);
    return [];
  }
}

function saveDishes(dishes, commitMsg = 'chore: auto-update dishes.json from Admin Panel') {
  const dir = path.dirname(DATA_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(dishes, null, 2), 'utf8');

  // Automatically commit and push to GitHub repository in background
  exec(`git add data/dishes.json && git commit -m "${commitMsg}" && git push origin main`, { cwd: __dirname }, (err) => {
    if (err) {
      logEvent('GIT_SYNC', `GitHub push standby (deploy key needed): ${err.message.split('\\n')[0]}`, C.yellow);
    } else {
      logEvent('GIT_SYNC', `✓ Automatically pushed latest menu to GitHub!`, C.brightGreen);
    }
  });
}

function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
      if (body.length > 1e6) {
        req.destroy();
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res, statusCode, data) {
  const payload = JSON.stringify(data);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(payload),
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  });
  res.end(payload);
}

function isAuthorized(req) {
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  return token && activeTokens.has(token);
}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp'
};

// ─── HTTP SERVER ───────────────────────────────────────────
const server = http.createServer(async (req, res) => {
  const start = Date.now();
  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = parsedUrl.pathname;
  const method = req.method;

  // Intercept response finish for rich access logging
  res.on('finish', () => {
    const duration = Date.now() - start;
    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
    const cleanIp = clientIp.split(',')[0].trim().replace(/^::ffff:/, '');
    const time = `${C.gray}${getTimestamp()}${C.reset}`;
    const durStr = duration < 50 ? `${C.green}${duration}ms${C.reset}` : `${C.yellow}${duration}ms${C.reset}`;

    // Skip verbose logs for noise if needed, or format cleanly
    console.log(` ${C.dim}│${C.reset} ${time}  ${formatMethod(method)} ${formatStatus(res.statusCode)}  ${durStr.padStart(12)}  ${C.dim}${cleanIp.padEnd(15)}${C.reset}  ${C.white}${pathname}${C.reset}`);
  });

  // CORS preflight
  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400'
    });
    return res.end();
  }

  // ─── API ROUTES ──────────────────────────────────────────

  // 1. GET /api/menu (Public)
  if (method === 'GET' && pathname === '/api/menu') {
    const dishes = loadDishes();
    return sendJson(res, 200, dishes);
  }

  // 2. POST /api/auth/login (Admin login)
  if (method === 'POST' && pathname === '/api/auth/login') {
    try {
      const body = await parseJsonBody(req);
      if (body.password === ADMIN_PASSWORD) {
        const token = crypto.randomBytes(32).toString('hex');
        activeTokens.add(token);
        logEvent('AUTH', `${C.brightGreen}Manager logged in successfully${C.reset} (Token issued: ${token.substring(0, 8)}...)`, C.brightGreen);
        return sendJson(res, 200, { success: true, token, message: 'Authenticated successfully' });
      }
      logEvent('AUTH', `${C.brightRed}Failed login attempt with wrong password${C.reset}`, C.brightRed);
      return sendJson(res, 401, { success: false, error: 'Incorrect password' });
    } catch (e) {
      return sendJson(res, 400, { success: false, error: e.message });
    }
  }

  // 3. GET /api/auth/check
  if (method === 'GET' && pathname === '/api/auth/check') {
    const valid = isAuthorized(req);
    return sendJson(res, valid ? 200 : 401, { authenticated: valid });
  }

  // 4. POST /api/auth/logout
  if (method === 'POST' && pathname === '/api/auth/logout') {
    const authHeader = req.headers['authorization'] || '';
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();
    if (token) {
      activeTokens.delete(token);
      logEvent('AUTH', `${C.yellow}Manager session logged out${C.reset}`, C.yellow);
    }
    return sendJson(res, 200, { success: true });
  }

  // ── PROTECTED ADMIN ROUTES ──

  // 5. POST /api/menu (Create dish)
  if (method === 'POST' && pathname === '/api/menu') {
    if (!isAuthorized(req)) return sendJson(res, 401, { error: 'Unauthorized.' });
    try {
      const body = await parseJsonBody(req);
      if (!body.name || !body.category || body.price === undefined) {
        return sendJson(res, 400, { error: 'Name, category, and price are required.' });
      }

      const dishes = loadDishes();
      const newDish = {
        id: 'dish_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
        name: String(body.name).trim(),
        category: String(body.category).trim(),
        price: Number(body.price) || 0,
        description: String(body.description || '').trim(),
        image: String(body.image || '').trim() || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=900&q=80',
        veg: Boolean(body.veg),
        badge: body.badge ? String(body.badge).trim() : null,
        available: body.available !== false
      };

      dishes.unshift(newDish);
      saveDishes(dishes);
      logEvent('DISH_ADDED', `New dish added: "${C.bold}${newDish.name}${C.reset}" (${newDish.category}) - ₹${newDish.price}`, C.brightGreen);
      return sendJson(res, 201, { success: true, dish: newDish });
    } catch (e) {
      return sendJson(res, 400, { error: e.message });
    }
  }

  // 6. PUT /api/menu/:id (Update dish)
  if (method === 'PUT' && pathname.startsWith('/api/menu/')) {
    if (!isAuthorized(req)) return sendJson(res, 401, { error: 'Unauthorized.' });
    const id = pathname.replace('/api/menu/', '');
    try {
      const body = await parseJsonBody(req);
      const dishes = loadDishes();
      const idx = dishes.findIndex(d => d.id === id);
      if (idx === -1) return sendJson(res, 404, { error: 'Dish not found.' });

      dishes[idx] = {
        ...dishes[idx],
        name: body.name !== undefined ? String(body.name).trim() : dishes[idx].name,
        category: body.category !== undefined ? String(body.category).trim() : dishes[idx].category,
        price: body.price !== undefined ? Number(body.price) : dishes[idx].price,
        description: body.description !== undefined ? String(body.description).trim() : dishes[idx].description,
        image: body.image !== undefined ? String(body.image).trim() : dishes[idx].image,
        veg: body.veg !== undefined ? Boolean(body.veg) : dishes[idx].veg,
        badge: body.badge !== undefined ? (body.badge ? String(body.badge).trim() : null) : dishes[idx].badge,
        available: body.available !== undefined ? Boolean(body.available) : dishes[idx].available
      };

      saveDishes(dishes);
      logEvent('DISH_UPDATED', `Dish updated: "${C.bold}${dishes[idx].name}${C.reset}" → ₹${dishes[idx].price}`, C.brightYellow);
      return sendJson(res, 200, { success: true, dish: dishes[idx] });
    } catch (e) {
      return sendJson(res, 400, { error: e.message });
    }
  }

  // 7. PATCH /api/menu/:id/toggle (Toggle Stock)
  if (method === 'PATCH' && pathname.includes('/toggle')) {
    if (!isAuthorized(req)) return sendJson(res, 401, { error: 'Unauthorized.' });
    const match = pathname.match(/^\/api\/menu\/([^/]+)\/toggle$/);
    if (!match) return sendJson(res, 404, { error: 'Route not found.' });
    const id = match[1];

    const dishes = loadDishes();
    const dish = dishes.find(d => d.id === id);
    if (!dish) return sendJson(res, 404, { error: 'Dish not found.' });

    dish.available = !dish.available;
    saveDishes(dishes);

    const statusText = dish.available ? `${C.brightGreen}In Stock${C.reset}` : `${C.brightRed}Out of Stock (Sold Out)${C.reset}`;
    logEvent('STOCK_TOGGLE', `"${C.bold}${dish.name}${C.reset}" is now ${statusText}`, dish.available ? C.brightGreen : C.brightRed);
    return sendJson(res, 200, { success: true, dish });
  }

  // 8. DELETE /api/menu/:id
  if (method === 'DELETE' && pathname.startsWith('/api/menu/')) {
    if (!isAuthorized(req)) return sendJson(res, 401, { error: 'Unauthorized.' });
    const id = pathname.replace('/api/menu/', '');
    const dishes = loadDishes();
    const target = dishes.find(d => d.id === id);
    const filtered = dishes.filter(d => d.id !== id);
    if (filtered.length === dishes.length) {
      return sendJson(res, 404, { error: 'Dish not found.' });
    }
    saveDishes(filtered);
    logEvent('DISH_DELETED', `${C.brightRed}Deleted dish: "${C.bold}${target ? target.name : id}${C.reset}"${C.reset}`, C.brightRed);
    return sendJson(res, 200, { success: true, message: 'Dish deleted successfully' });
  }

  // ─── STATIC FILE SERVING ──────────────────────────────────────
  let filePath = '';
  if (pathname === '/' || pathname === '/index.html') {
    filePath = path.join(__dirname, 'index.html');
  } else if (pathname === '/admin' || pathname === '/admin/') {
    filePath = path.join(__dirname, 'admin.html');
  } else {
    filePath = path.join(__dirname, pathname);
  }

  const resolved = path.resolve(filePath);
  if (!resolved.startsWith(__dirname)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    return res.end('403 Forbidden');
  }

  fs.stat(resolved, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
      return res.end('<h1>404 Not Found</h1><p><a href="/">Return Home</a></p>');
    }

    const ext = path.extname(resolved).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, {
      'Content-Type': contentType,
      'Content-Length': stats.size,
      'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=3600'
    });

    const stream = fs.createReadStream(resolved);
    stream.pipe(res);
  });
});

// ─── SERVER STARTUP BANNER ─────────────────────────────────
server.listen(PORT, '0.0.0.0', () => {
  const dishes = loadDishes();
  console.log('\n' + C.brightGreen + '  ╔════════════════════════════════════════════════════════════════════════╗' + C.reset);
  console.log(C.brightGreen + '  ║' + C.reset + C.bold + C.brightYellow + '   🌶️   SPICE GARDEN RESTAURANT BACKEND  •  ONLINE & READY             ' + C.reset + C.brightGreen + '║' + C.reset);
  console.log(C.brightGreen + '  ╠════════════════════════════════════════════════════════════════════════╣' + C.reset);
  console.log(C.brightGreen + '  ║' + C.reset + `   ${C.cyan}• Customer Site :${C.reset}  ${C.brightWhite}http://15.207.115.54/                    ${C.reset}    ` + C.brightGreen + '║' + C.reset);
  console.log(C.brightGreen + '  ║' + C.reset + `   ${C.cyan}• Admin Panel   :${C.reset}  ${C.brightWhite}http://15.207.115.54/admin               ${C.reset}    ` + C.brightGreen + '║' + C.reset);
  console.log(C.brightGreen + '  ║' + C.reset + `   ${C.cyan}• Active Dishes :${C.reset}  ${C.brightGreen}${dishes.length} menu items loaded from database          ${C.reset}    ` + C.brightGreen + '║' + C.reset);
  console.log(C.brightGreen + '  ║' + C.reset + `   ${C.cyan}• Internal Port :${C.reset}  ${C.yellow}:${PORT} (Proxied through Nginx on Port 80)     ${C.reset}    ` + C.brightGreen + '║' + C.reset);
  console.log(C.brightGreen + '  ╚════════════════════════════════════════════════════════════════════════╝' + C.reset);
  console.log(`\n ${C.dim}┌─ LIVE REQUEST & EVENT STREAM ──────────────────────────────────────────────${C.reset}\n`);
});
