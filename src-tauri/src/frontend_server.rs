//! Serve the Vite `dist/` folder over loopback HTTP in release builds.
//! WebKitGTK on Linux mishandles tauri:// asset URLs; http://127.0.0.1 works reliably.
//!
//! Outer `/` is a thin host that iframes `/index.html` at a sane logical
//! viewport, then CSS-scales the frame to fill the corrupt WebKit CSS px
//! viewport. The web/Vite build is unchanged (still a normal document).

use axum::{
    body::Body,
    extract::Request,
    http::{header, Method, Response, StatusCode},
    Router,
};
use include_dir::{include_dir, Dir, DirEntry};
use std::io::Write;
use std::net::SocketAddr;
use std::path::PathBuf;
use std::sync::Mutex;

pub const FRONTEND_PORT: u16 = 14201;

static FRONTEND: Dir<'_> = include_dir!("$CARGO_MANIFEST_DIR/../dist");

static LAYOUT_LOG_PATH: Mutex<Option<PathBuf>> = Mutex::new(None);

/// Desktop-only outer shell. Not part of the web Vite app.
const DESKTOP_HOST_HTML: &str = r#"<!DOCTYPE html>
<html lang="en" data-texlooper-host="1">
<head>
  <meta charset="UTF-8" />
  <title>texLooper</title>
  <style>
    html, body {
      margin: 0;
      padding: 0;
      overflow: hidden;
      width: 100%;
      height: 100%;
      /* Match nova chrome so any residual gap is invisible */
      background: #f4f4f5;
    }
    #frame {
      border: 0;
      display: block;
      position: fixed;
      left: 0;
      top: 0;
      transform-origin: left top;
      background: #f4f4f5;
    }
    #host-splash {
      position: fixed;
      inset: 0;
      z-index: 2;
      display: grid;
      place-items: center;
      background: #f4f4f5;
      color: #3f3f46;
      font: 600 14px/1.4 system-ui, sans-serif;
      transition: opacity 160ms ease;
    }
    #host-splash[hidden] { display: none; }
    #host-splash .bar {
      width: 9rem;
      height: 3px;
      margin-top: 0.85rem;
      border-radius: 999px;
      background: linear-gradient(90deg, #0d9488, #2dd4bf, #0d9488);
      background-size: 200% 100%;
      animation: tex-load 1s linear infinite;
    }
    @keyframes tex-load {
      0% { background-position: 100% 0; }
      100% { background-position: -100% 0; }
    }
  </style>
</head>
<body>
  <div id="host-splash" aria-busy="true" aria-live="polite">
    <div>
      <div>texLooper</div>
      <div class="bar" aria-hidden="true"></div>
    </div>
  </div>
  <iframe id="frame" title="texLooper" allow="clipboard-read; clipboard-write; downloads"></iframe>
  <script>
  (function () {
    var frame = document.getElementById('frame');
    var splash = document.getElementById('host-splash');
    var t = window.__TEXLOOPER__ = window.__TEXLOOPER__ || { profile: 'desktop', ephemeral: false };
    t.profile = 'desktop';

    function hideSplash() {
      if (!splash || splash.hidden) return;
      splash.hidden = true;
    }
    window.addEventListener('message', function (ev) {
      if (ev && ev.data && ev.data.type === 'texlooper-spa-ready') hideSplash();
    });
    // Fallback if the SPA never posts (older builds).
    setTimeout(hideSplash, 8000);

    function dump(tag, extra) {
      try {
        var payload = Object.assign({
          tag: tag,
          at: Date.now(),
          where: 'host',
          dpr: devicePixelRatio,
          inner: [innerWidth, innerHeight],
          outer: [outerWidth, outerHeight],
          tex: t,
          frame: {
            w: frame.width, h: frame.height,
            styleW: frame.style.width, styleH: frame.style.height,
            transform: frame.style.transform
          }
        }, extra || {});
        fetch('/__texlooper__/layout-dump', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          keepalive: true
        }).catch(function () {});
      } catch (e) {}
    }

    function bridgeTauri(win) {
      try {
        if (!win) return;
        // Release desktop: Tauri injects IPC on the outer host webview only.
        // The SPA runs in a same-origin iframe and must share those globals.
        if (window.__TAURI_INTERNALS__) {
          win.__TAURI_INTERNALS__ = window.__TAURI_INTERNALS__;
        }
        if (window.__TAURI__) {
          win.__TAURI__ = window.__TAURI__;
        }
      } catch (e) {
        dump('host-tauri-bridge-error', { message: String(e) });
      }
    }

    function pushRuntime(win) {
      try {
        if (!win) return;
        bridgeTauri(win);
        win.__TEXLOOPER__ = Object.assign({}, win.__TEXLOOPER__ || {}, t, {
          profile: 'desktop',
          embeddedInDesktopHost: true,
          transport: 'tauri-local',
          windowSize: t.windowSize || logicalSize(),
          cssWindowSize: t.cssWindowSize,
          hostScale: t.hostScale
        });
        win.dispatchEvent(new Event('texlooper-window-size'));
      } catch (e) {
        dump('host-iframe-bridge-error', { message: String(e) });
      }
    }

    function logicalSize() {
      if (t.windowSize && t.windowSize.w >= 320 && t.windowSize.h >= 320) {
        return { w: Math.round(t.windowSize.w), h: Math.round(t.windowSize.h) };
      }
      var w = Math.abs(window.outerWidth || 0);
      var h = Math.abs(window.outerHeight || 0);
      if (w >= 320 && h >= 320 && w <= 8192 && h <= 8192) return { w: Math.round(w), h: Math.round(h) };
      return { w: 1280, h: 800 };
    }

    function cssViewport() {
      var iw = Math.abs(window.innerWidth || 0);
      var ih = Math.abs(window.innerHeight || 0);
      if (iw >= 32 && ih >= 32) return { w: iw, h: ih };
      var s = logicalSize();
      var dpr = window.devicePixelRatio || 1;
      var abs = Math.abs(dpr);
      var factor = 1;
      if (dpr < 0 || !(abs > 0.25 && abs <= 8)) {
        if (Math.abs(abs * 96 - 1) < 0.08) factor = 96;
        else if (abs > 0 && abs < 0.25) factor = Math.min(192, Math.round(1 / abs));
      }
      return { w: s.w * factor, h: s.h * factor };
    }

    function metricsHealthy() {
      var dpr = window.devicePixelRatio || 1;
      var iw = window.innerWidth;
      var ih = window.innerHeight;
      return dpr > 0.25 && dpr <= 8
        && Number.isFinite(iw) && Number.isFinite(ih)
        && iw >= 320 && ih >= 320 && iw <= 8192 && ih <= 8192;
    }

    function layout() {
      var s = logicalSize();
      var v = cssViewport();
      var scale = Math.min(v.w / s.w, v.h / s.h);
      if (!(scale > 0) || !isFinite(scale)) scale = 1;
      if (scale < 0.05) scale = 1;

      // Healthy WebKit (X11): fill the host exactly — no letterbox strip.
      if (metricsHealthy()) {
        var w = Math.round(window.innerWidth);
        var h = Math.round(window.innerHeight);
        frame.removeAttribute('width');
        frame.removeAttribute('height');
        frame.style.width = '100%';
        frame.style.height = '100%';
        frame.style.right = '0';
        frame.style.bottom = '0';
        frame.style.transform = 'none';
        t.windowSize = { w: w, h: h };
        t.cssWindowSize = { w: w, h: h, factor: 1 };
        t.hostScale = 1;
        dump('host-layout', { logical: { w: w, h: h }, cssViewport: { w: w, h: h }, scale: 1, mode: 'fill' });
        pushRuntime(frame.contentWindow);
        return;
      }

      frame.width = s.w;
      frame.height = s.h;
      frame.style.width = s.w + 'px';
      frame.style.height = s.h + 'px';
      frame.style.right = 'auto';
      frame.style.bottom = 'auto';
      frame.style.transform = 'scale(' + scale + ')';
      t.cssWindowSize = { w: Math.round(v.w), h: Math.round(v.h), factor: scale };
      t.hostScale = scale;
      dump('host-layout', { logical: s, cssViewport: v, scale: scale, mode: 'scale' });
      pushRuntime(frame.contentWindow);
    }

    frame.addEventListener('load', function () {
      dump('host-iframe-load', { rootHTML: (frame.contentDocument && frame.contentDocument.body)
        ? frame.contentDocument.body.innerHTML.length : 0 });
      pushRuntime(frame.contentWindow);
      // Tauri may inject globals slightly after first paint — retry briefly.
      [50, 200, 600, 1500].forEach(function (ms) {
        setTimeout(function () { pushRuntime(frame.contentWindow); }, ms);
      });
    });

    window.addEventListener('resize', layout);
    window.addEventListener('texlooper-window-size', layout);
    layout();
    frame.src = '/index.html';
    dump('host-boot');
  })();
  </script>
</body>
</html>
"#;

fn layout_log_path() -> PathBuf {
    if let Ok(p) = std::env::var("TEXLOOPER_LAYOUT_LOG") {
        return PathBuf::from(p);
    }
    PathBuf::from("/tmp/texlooper-layout.jsonl")
}

fn mime_for(path: &str) -> &'static str {
    if path.ends_with(".html") {
        "text/html; charset=utf-8"
    } else if path.ends_with(".js") {
        "application/javascript; charset=utf-8"
    } else if path.ends_with(".css") {
        "text/css; charset=utf-8"
    } else if path.ends_with(".json") {
        "application/json; charset=utf-8"
    } else if path.ends_with(".svg") {
        "image/svg+xml"
    } else if path.ends_with(".woff2") {
        "font/woff2"
    } else if path.ends_with(".woff") {
        "font/woff"
    } else if path.ends_with(".ttf") {
        "font/ttf"
    } else if path.ends_with(".png") {
        "image/png"
    } else {
        "application/octet-stream"
    }
}

fn lookup(path: &str) -> Option<&'static DirEntry<'static>> {
    FRONTEND.get_entry(path).or_else(|| {
        if path.contains('.') {
            None
        } else {
            FRONTEND.get_entry("index.html")
        }
    })
}

fn append_layout_dump(bytes: &[u8]) -> Result<(), String> {
    let path = layout_log_path();
    if let Ok(mut guard) = LAYOUT_LOG_PATH.lock() {
        *guard = Some(path.clone());
    }
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    let mut file = std::fs::OpenOptions::new()
        .create(true)
        .append(true)
        .open(&path)
        .map_err(|e| e.to_string())?;
    file.write_all(bytes).map_err(|e| e.to_string())?;
    if !bytes.ends_with(b"\n") {
        file.write_all(b"\n").map_err(|e| e.to_string())?;
    }
    file.flush().map_err(|e| e.to_string())?;
    Ok(())
}

async fn serve(req: Request<Body>) -> Response<Body> {
    let path = req.uri().path().to_string();

    if path == "/__texlooper__/layout-dump" {
        if req.method() == Method::OPTIONS {
            return Response::builder()
                .status(StatusCode::NO_CONTENT)
                .header(header::ACCESS_CONTROL_ALLOW_ORIGIN, "*")
                .header(header::ACCESS_CONTROL_ALLOW_METHODS, "POST, OPTIONS")
                .header(header::ACCESS_CONTROL_ALLOW_HEADERS, "content-type")
                .body(Body::empty())
                .unwrap();
        }
        if req.method() != Method::POST {
            return Response::builder()
                .status(StatusCode::METHOD_NOT_ALLOWED)
                .body(Body::from("POST only"))
                .unwrap();
        }
        let Ok(bytes) = axum::body::to_bytes(req.into_body(), 2_000_000).await else {
            return Response::builder()
                .status(StatusCode::BAD_REQUEST)
                .body(Body::from("body too large"))
                .unwrap();
        };
        return match append_layout_dump(&bytes) {
            Ok(()) => Response::builder()
                .status(StatusCode::NO_CONTENT)
                .header(header::ACCESS_CONTROL_ALLOW_ORIGIN, "*")
                .body(Body::empty())
                .unwrap(),
            Err(e) => Response::builder()
                .status(StatusCode::INTERNAL_SERVER_ERROR)
                .body(Body::from(e))
                .unwrap(),
        };
    }

    // Outer desktop host — never the Vite index (that stays at /index.html).
    if path == "/" || path.is_empty() {
        return Response::builder()
            .status(StatusCode::OK)
            .header(header::CONTENT_TYPE, "text/html; charset=utf-8")
            .header(header::CACHE_CONTROL, "no-cache")
            .body(Body::from(DESKTOP_HOST_HTML))
            .unwrap();
    }

    let mut rel = path.trim_start_matches('/');
    if rel.is_empty() {
        rel = "index.html";
    }

    let Some(entry) = lookup(rel) else {
        return Response::builder()
            .status(StatusCode::NOT_FOUND)
            .body(Body::empty())
            .unwrap();
    };

    let Some(file) = entry.as_file() else {
        return Response::builder()
            .status(StatusCode::NOT_FOUND)
            .body(Body::empty())
            .unwrap();
    };

    let mut body = file.contents().to_vec();
    if rel == "index.html" || rel.ends_with("/index.html") {
        body = inject_runtime_flags(body);
    }

    Response::builder()
        .status(StatusCode::OK)
        .header(header::CONTENT_TYPE, mime_for(rel))
        .header(header::CACHE_CONTROL, "no-cache")
        .body(Body::from(body))
        .unwrap()
}

fn inject_runtime_flags(bytes: Vec<u8>) -> Vec<u8> {
    let layout_debug = std::env::var_os("TEXLOOPER_LAYOUT_DEBUG").is_some()
        || std::env::var_os("TEXLOOPER_DEVTOOLS").is_some();
    let Ok(mut html) = String::from_utf8(bytes.clone()) else {
        return bytes;
    };
    // Mark the framed app so JS can skip outer-host recovery hacks.
    if !html.contains("embeddedInDesktopHost") {
        html = html.replace(
            r#"window.__TEXLOOPER__={profile:"desktop",ephemeral:false}"#,
            r#"window.__TEXLOOPER__={profile:"desktop",ephemeral:false,embeddedInDesktopHost:true}"#,
        );
        html = html.replace(
            r#"window.__TEXLOOPER__={profile:"desktop",ephemeral:false,layoutDebug:true}"#,
            r#"window.__TEXLOOPER__={profile:"desktop",ephemeral:false,embeddedInDesktopHost:true,layoutDebug:true}"#,
        );
    }
    if layout_debug
        && !html.contains("layoutDebug:true")
        && !html.contains("\"layoutDebug\":true")
    {
        html = html.replace(
            r#"window.__TEXLOOPER__={profile:"desktop",ephemeral:false,embeddedInDesktopHost:true}"#,
            r#"window.__TEXLOOPER__={profile:"desktop",ephemeral:false,embeddedInDesktopHost:true,layoutDebug:true}"#,
        );
    }
    html.into_bytes()
}

async fn run_server() {
    let path = layout_log_path();
    let _ = std::fs::write(
        &path,
        format!(
            "{{\"tag\":\"server-start\",\"at\":{},\"path\":{}}}\n",
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .map(|d| d.as_millis())
                .unwrap_or(0),
            serde_json::to_string(&path.to_string_lossy()).unwrap_or_else(|_| "\"?\"".into())
        ),
    );
    eprintln!("[texlooper] layout log → {}", path.display());

    let app = Router::new().fallback(serve);
    let addr = SocketAddr::from(([127, 0, 0, 1], FRONTEND_PORT));
    let listener = tokio::net::TcpListener::bind(addr)
        .await
        .expect("bind loopback frontend server");
    axum::serve(listener, app)
        .await
        .expect("serve loopback frontend");
}

pub fn spawn_loopback_frontend() {
    static STARTED: std::sync::Once = std::sync::Once::new();
    STARTED.call_once(|| {
        std::thread::spawn(|| {
            let rt = tokio::runtime::Builder::new_multi_thread()
                .enable_all()
                .build()
                .expect("frontend tokio runtime");
            rt.block_on(run_server());
        });
        std::thread::sleep(std::time::Duration::from_millis(80));
    });
}

pub fn loopback_url() -> String {
    format!("http://127.0.0.1:{FRONTEND_PORT}/")
}
