const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data', 'dishes.json');
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

// Active admin session tokens (persisted in-memory)
const activeTokens = new Set();

// Helper: Ensure data file exists
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

function saveDishes(dishes) {
  const dir = path.dirname(DATA_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(dishes, null, 2), 'utf8');
}

// Helper: Parse JSON body
function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
      if (body.length > 1e6) { // 1MB limit
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

// Helper: Send JSON response
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

// Helper: Check authentication
function isAuthorized(req) {
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  return token && activeTokens.has(token);
}

// Static MIME types
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

// HTTP Server
const server = http.createServer(async (req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = parsedUrl.pathname;
  const method = req.method;

  // Handle CORS preflight
  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400'
    });
    return res.end();
  }

  // ─── API ROUTES ──────────────────────────────────────────────

  // 1. GET /api/menu (Public: get all dishes)
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
        return sendJson(res, 200, { success: true, token, message: 'Authenticated successfully' });
      }
      return sendJson(res, 401, { success: false, error: 'Incorrect password' });
    } catch (e) {
      return sendJson(res, 400, { success: false, error: e.message });
    }
  }

  // 3. GET /api/auth/check (Verify current session)
  if (method === 'GET' && pathname === '/api/auth/check') {
    const valid = isAuthorized(req);
    return sendJson(res, valid ? 200 : 401, { authenticated: valid });
  }

  // 4. POST /api/auth/logout
  if (method === 'POST' && pathname === '/api/auth/logout') {
    const authHeader = req.headers['authorization'] || '';
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();
    if (token) activeTokens.delete(token);
    return sendJson(res, 200, { success: true });
  }

  // ── PROTECTED ADMIN ROUTES ──

  // 5. POST /api/menu (Add dish)
  if (method === 'POST' && pathname === '/api/menu') {
    if (!isAuthorized(req)) return sendJson(res, 401, { error: 'Unauthorized. Please log in.' });
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

      dishes.unshift(newDish); // Add to beginning
      saveDishes(dishes);
      return sendJson(res, 201, { success: true, dish: newDish });
    } catch (e) {
      return sendJson(res, 400, { error: e.message });
    }
  }

  // 6. PUT /api/menu/:id (Update entire dish)
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
      return sendJson(res, 200, { success: true, dish: dishes[idx] });
    } catch (e) {
      return sendJson(res, 400, { error: e.message });
    }
  }

  // 7. PATCH /api/menu/:id/toggle (Toggle in-stock / out-of-stock)
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
    return sendJson(res, 200, { success: true, dish });
  }

  // 8. DELETE /api/menu/:id (Delete dish)
  if (method === 'DELETE' && pathname.startsWith('/api/menu/')) {
    if (!isAuthorized(req)) return sendJson(res, 401, { error: 'Unauthorized.' });
    const id = pathname.replace('/api/menu/', '');
    const dishes = loadDishes();
    const filtered = dishes.filter(d => d.id !== id);
    if (filtered.length === dishes.length) {
      return sendJson(res, 404, { error: 'Dish not found.' });
    }
    saveDishes(filtered);
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

  // Prevent directory traversal
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

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Spice Garden Server running at http://localhost:${PORT}`);
  console.log(`- Customer Menu: http://localhost:${PORT}/`);
  console.log(`- Admin Panel:   http://localhost:${PORT}/admin`);
});
