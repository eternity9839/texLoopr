/** Inline SVG placeholders — no network required. */

function svgDataUri(svg: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export const DEMO_IMG = {
  logoMark: svgDataUri(`
<svg xmlns="http://www.w3.org/2000/svg" width="160" height="48" viewBox="0 0 160 48">
  <rect width="160" height="48" rx="4" fill="#0f6b63"/>
  <text x="16" y="31" fill="#fff" font-family="Georgia,serif" font-size="18" font-weight="600">Northline</text>
</svg>`),
  signature: svgDataUri(`
<svg xmlns="http://www.w3.org/2000/svg" width="200" height="56" viewBox="0 0 200 56">
  <path d="M8 36 C40 8, 70 48, 100 28 S160 12, 190 34" fill="none" stroke="#1c2430" stroke-width="2"/>
  <text x="8" y="52" fill="#6b7280" font-family="system-ui,sans-serif" font-size="10">Authorized signature</text>
</svg>`),
  productHero: svgDataUri(`
<svg xmlns="http://www.w3.org/2000/svg" width="320" height="200" viewBox="0 0 320 200">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#1a3a36"/>
      <stop offset="100%" stop-color="#0f6b63"/>
    </linearGradient>
  </defs>
  <rect width="320" height="200" fill="url(#g)"/>
  <circle cx="220" cy="90" r="48" fill="rgba(255,255,255,0.12)"/>
  <text x="24" y="110" fill="#fff" font-family="Georgia,serif" font-size="28">Atlas Pack</text>
  <text x="24" y="138" fill="rgba(255,255,255,0.75)" font-family="system-ui,sans-serif" font-size="13">Spring collection · 2026</text>
</svg>`),
  headshot: svgDataUri(`
<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96">
  <rect width="96" height="96" rx="48" fill="#d8e5e2"/>
  <circle cx="48" cy="36" r="18" fill="#0f6b63"/>
  <ellipse cx="48" cy="82" rx="28" ry="22" fill="#0f6b63"/>
</svg>`),
  chartThumb: svgDataUri(`
<svg xmlns="http://www.w3.org/2000/svg" width="240" height="120" viewBox="0 0 240 120">
  <rect width="240" height="120" fill="#f4f1ec"/>
  <polyline points="20,90 60,70 100,78 140,40 180,52 220,28" fill="none" stroke="#0f6b63" stroke-width="3"/>
  <text x="16" y="18" fill="#3d4a5c" font-family="system-ui,sans-serif" font-size="11">Q1–Q4 revenue</text>
</svg>`),
  stamp: svgDataUri(`
<svg xmlns="http://www.w3.org/2000/svg" width="88" height="88" viewBox="0 0 88 88">
  <circle cx="44" cy="44" r="40" fill="none" stroke="#b45309" stroke-width="3"/>
  <text x="44" y="40" text-anchor="middle" fill="#b45309" font-family="system-ui,sans-serif" font-size="11" font-weight="700">APPROVED</text>
  <text x="44" y="56" text-anchor="middle" fill="#b45309" font-family="system-ui,sans-serif" font-size="9">LEGAL</text>
</svg>`),
};
