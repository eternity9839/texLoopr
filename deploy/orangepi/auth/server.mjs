import http from "node:http";
import { createHmac, timingSafeEqual } from "node:crypto";
import { URL } from "node:url";

const PORT = Number(process.env.PORT || 3000);
const DEMO_USER = process.env.DEMO_USER || "demo";
const DEMO_PASSWORD = process.env.DEMO_PASSWORD || "";
const SESSION_SECRET = process.env.SESSION_SECRET || "";
const COOKIE_NAME = "texlooper_session";
const TTL_SEC = Number(process.env.SESSION_TTL_SEC || 60 * 60 * 24 * 7);

if (!DEMO_PASSWORD || !SESSION_SECRET || SESSION_SECRET.length < 16) {
  console.error(
    "auth-gate: DEMO_PASSWORD and SESSION_SECRET (>=16 chars) are required",
  );
  process.exit(1);
}

function b64url(buf) {
  return Buffer.from(buf)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function sign(payload) {
  return createHmac("sha256", SESSION_SECRET).update(payload).digest("base64url");
}

function mintCookie(username) {
  const exp = Math.floor(Date.now() / 1000) + TTL_SEC;
  const body = `${b64url(username)}.${exp}`;
  const sig = sign(body);
  const value = `${body}.${sig}`;
  const secure =
    (process.env.COOKIE_SECURE || "true").toLowerCase() !== "false";
  const parts = [
    `${COOKIE_NAME}=${value}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${TTL_SEC}`,
  ];
  if (secure) parts.push("Secure");
  return parts.join("; ");
}

function clearCookie() {
  const secure =
    (process.env.COOKIE_SECURE || "true").toLowerCase() !== "false";
  const parts = [
    `${COOKIE_NAME}=`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    "Max-Age=0",
  ];
  if (secure) parts.push("Secure");
  return parts.join("; ");
}

function parseCookies(header) {
  const out = {};
  if (!header) return out;
  for (const part of header.split(";")) {
    const i = part.indexOf("=");
    if (i < 0) continue;
    const k = part.slice(0, i).trim();
    const v = part.slice(i + 1).trim();
    out[k] = v;
  }
  return out;
}

function publicOrigin(req) {
  const host = req.headers["x-forwarded-host"] || req.headers.host || "localhost";
  const proto = req.headers["x-forwarded-proto"] || "https";
  const h = String(host).split(",")[0].trim();
  const p = String(proto).split(",")[0].trim();
  return `${p}://${h}`;
}

function redirect(res, req, path, extraHeaders = {}) {
  const location = path.startsWith("http")
    ? path
    : `${publicOrigin(req)}${path}`;
  res.writeHead(302, { Location: location, ...extraHeaders });
  res.end();
}

function verifySession(cookieHeader) {
  const raw = parseCookies(cookieHeader)[COOKIE_NAME];
  if (!raw) return null;
  const parts = raw.split(".");
  if (parts.length !== 3) return null;
  const [uB64, expStr, sig] = parts;
  const body = `${uB64}.${expStr}`;
  const expected = sign(body);
  try {
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  } catch {
    return null;
  }
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || exp < Math.floor(Date.now() / 1000)) return null;
  try {
    const user = Buffer.from(uB64, "base64url").toString("utf8");
    if (!user) return null;
    return user;
  } catch {
    return null;
  }
}

function safeEqualStr(a, b) {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) {
    timingSafeEqual(ba, ba);
    return false;
  }
  return timingSafeEqual(ba, bb);
}

function loginPage(error) {
  const err = error
    ? `<p class="err" role="alert">${escapeHtml(error)}</p>`
    : "";
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>texLooper — Sign in</title>
  <style>
    :root {
      --bg: #e8ece9;
      --card: #f7f9f7;
      --ink: #1c2430;
      --muted: #5a6570;
      --accent: #0f6b63;
      --danger: #a33;
      --border: #c5cec8;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      display: grid;
      place-items: center;
      font-family: "Sora", "Segoe UI", system-ui, sans-serif;
      color: var(--ink);
      background:
        radial-gradient(ellipse at 20% 0%, #d4e4df 0%, transparent 50%),
        radial-gradient(ellipse at 90% 80%, #dfe6e2 0%, transparent 45%),
        var(--bg);
    }
    main {
      width: min(100% - 2rem, 22rem);
      padding: 1.75rem 1.5rem 1.5rem;
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 10px;
      box-shadow: 0 12px 40px rgba(28, 36, 48, 0.08);
    }
    h1 {
      margin: 0 0 0.25rem;
      font-size: 1.35rem;
      letter-spacing: -0.02em;
    }
    .sub { margin: 0 0 1.25rem; color: var(--muted); font-size: 0.875rem; }
    label { display: block; font-size: 0.75rem; font-weight: 600; margin-bottom: 0.35rem; }
    input {
      width: 100%;
      padding: 0.55rem 0.65rem;
      margin-bottom: 0.9rem;
      border: 1px solid var(--border);
      border-radius: 6px;
      font: inherit;
      background: #fff;
    }
    input:focus { outline: 2px solid color-mix(in srgb, var(--accent) 45%, transparent); border-color: var(--accent); }
    button {
      width: 100%;
      margin-top: 0.25rem;
      padding: 0.65rem 1rem;
      border: 0;
      border-radius: 6px;
      background: var(--accent);
      color: #fff;
      font: inherit;
      font-weight: 600;
      cursor: pointer;
    }
    button:hover { filter: brightness(1.05); }
    .err { color: var(--danger); font-size: 0.85rem; margin: 0 0 0.75rem; }
  </style>
</head>
<body>
  <main>
    <h1>texLooper</h1>
    <p class="sub">Demo access — shared credentials, nothing is saved.</p>
    ${err}
    <form method="post" action="/login" autocomplete="username">
      <label for="username">Username</label>
      <input id="username" name="username" required autocomplete="username" />
      <label for="password">Password</label>
      <input id="password" name="password" type="password" required autocomplete="current-password" />
      <button type="submit">Sign in</button>
    </form>
  </main>
</body>
</html>`;
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

function parseForm(body) {
  const params = new URLSearchParams(body);
  return {
    username: (params.get("username") || "").trim(),
    password: params.get("password") || "",
  };
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
  const path = url.pathname;

  if (req.method === "GET" && path === "/healthz") {
    res.writeHead(200, { "content-type": "text/plain" });
    res.end("ok");
    return;
  }

  if (req.method === "GET" && path === "/auth/verify") {
    const user = verifySession(req.headers.cookie);
    if (!user) {
      const accept = req.headers.accept || "";
      if (accept.includes("text/html")) {
        redirect(res, req, "/login");
        return;
      }
      res.writeHead(401, { "content-type": "text/plain" });
      res.end("unauthorized");
      return;
    }
    res.writeHead(200, {
      "content-type": "text/plain",
      "X-Forwarded-User": user,
    });
    res.end("ok");
    return;
  }

  if (req.method === "GET" && path === "/login") {
    const user = verifySession(req.headers.cookie);
    if (user) {
      redirect(res, req, "/");
      return;
    }
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    res.end(loginPage(null));
    return;
  }

  if (req.method === "POST" && path === "/login") {
    const body = await readBody(req);
    const { username, password } = parseForm(body);
    const okUser = safeEqualStr(username, DEMO_USER);
    const okPass = safeEqualStr(password, DEMO_PASSWORD);
    if (!okUser || !okPass) {
      res.writeHead(401, { "content-type": "text/html; charset=utf-8" });
      res.end(loginPage("Invalid username or password."));
      return;
    }
    redirect(res, req, "/", { "Set-Cookie": mintCookie(username) });
    return;
  }

  if (
    (req.method === "GET" || req.method === "POST") &&
    (path === "/logout" || path === "/auth/logout")
  ) {
    redirect(res, req, "/login", { "Set-Cookie": clearCookie() });
    return;
  }

  res.writeHead(404, { "content-type": "text/plain" });
  res.end("not found");
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`auth-gate listening on :${PORT} (user=${DEMO_USER})`);
});
