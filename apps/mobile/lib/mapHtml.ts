// HTML for the Nearby map: MapLibre GL JS with OpenFreeMap's vector "Liberty" style, inside a
// WebView. No API key, no account, no native map module. If the style cannot load it falls
// back to plain OpenStreetMap raster tiles so the map is never blank. Pins post a message back
// to the app so it can open Street View or the detail view. The app can also call
// window.focusPoint(i) (via injectJavaScript) to pan to and open a marker's popup.

export type MapPoint = {
  kind: "ticket" | "bin";
  id: string;
  lat: number;
  lng: number;
  title: string;
  severity: number; // tickets only
  count: number; // tickets only: report_count
  status: string; // tickets only
  demo: boolean;
  detail: string; // second line of the popup
  photoUrl?: string | null; // tickets only: representative report photo
};

export type MapMessage =
  | { type: "streetview"; lat: number; lng: number }
  | { type: "view"; id: string };

export function streetViewUrl(lat: number, lng: number) {
  return `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${lat},${lng}`;
}

const BACKSLASH = String.fromCharCode(92);

// Style used when everything works. Public and keyless; the service is provided as-is, which
// is why there is a raster fallback in the page.
const STYLE_URL = "https://tiles.openfreemap.org/styles/liberty";

export function mapHtml(
  center: { lat: number; lng: number },
  points: MapPoint[],
  dark = false,
) {
  // "<" is escaped so no title can close the script tag.
  const data = JSON.stringify(points).split("<").join(`${BACKSLASH}u003c`);

  const pageBg = dark ? "#0a0a0a" : "#e5e7eb";
  const popBg = dark ? "#141414" : "#ffffff";
  const titleColor = dark ? "#f3f4f6" : "#111827";
  const detailColor = dark ? "#9ca3af" : "#4b5563";
  const chipBg = dark ? "#1f1f1f" : "#f3f4f6";
  const chipColor = dark ? "#d1d5db" : "#374151";
  const legendBg = dark ? "rgba(20,20,20,.95)" : "rgba(255,255,255,.95)";
  const legendColor = dark ? "#d1d5db" : "#374151";
  const brand = dark ? "#22c55e" : "#166534";
  // This style has no dark variant, so darken the rendered canvas in dark mode.
  const darkCss = dark
    ? ".maplibregl-canvas { filter: invert(1) hue-rotate(180deg) brightness(.9) contrast(.9); }"
    : "";

  return `<!doctype html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
<link rel="stylesheet" href="https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.css">
<style>
  html, body, #map { height: 100%; margin: 0; background: ${pageBg}; }
  body { font-family: -apple-system, Roboto, "Segoe UI", sans-serif; }
  .pin { width: 32px; height: 32px; border-radius: 50%; border: 3px solid #fff;
         box-shadow: 0 2px 6px rgba(0,0,0,.35); color: #fff; font-weight: 700; font-size: 13px;
         display: flex; align-items: center; justify-content: center; cursor: pointer;
         text-shadow: 0 1px 1px rgba(0,0,0,.35); box-sizing: border-box; }
  .pin.sev1 { background: #eab308; } .pin.sev2 { background: #f97316; } .pin.sev3 { background: #dc2626; }
  .pin.demo { border-style: dashed; }
  .pin.bin { width: 22px; height: 22px; background: #16a34a; font-size: 11px; }
  .me { width: 16px; height: 16px; border-radius: 50%; background: #2563eb; border: 3px solid #fff;
        box-sizing: border-box; box-shadow: 0 0 0 0 rgba(37,99,235,.5); animation: pulse 2s infinite; }
  @keyframes pulse { 70% { box-shadow: 0 0 0 14px rgba(37,99,235,0); } 100% { box-shadow: 0 0 0 0 rgba(37,99,235,0); } }
  .maplibregl-popup-content { border-radius: 14px; box-shadow: 0 6px 20px rgba(0,0,0,.25);
                              background: ${popBg}; padding: 14px 16px; min-width: 190px; }
  .maplibregl-popup-anchor-top .maplibregl-popup-tip { border-bottom-color: ${popBg}; }
  .maplibregl-popup-anchor-bottom .maplibregl-popup-tip { border-top-color: ${popBg}; }
  .maplibregl-popup-anchor-left .maplibregl-popup-tip { border-right-color: ${popBg}; }
  .maplibregl-popup-anchor-right .maplibregl-popup-tip { border-left-color: ${popBg}; }
  .t { font-size: 16px; font-weight: 700; color: ${titleColor}; margin-bottom: 6px; }
  .d { font-size: 13px; color: ${detailColor}; margin-bottom: 8px; }
  .thumb { width: 100%; height: 120px; object-fit: cover; border-radius: 10px; margin-bottom: 8px; background: ${chipBg}; }
  .chips { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 10px; }
  .chip { font-size: 11px; font-weight: 600; padding: 3px 8px; border-radius: 999px; background: ${chipBg}; color: ${chipColor}; }
  .chip.demo { background: #fef3c7; color: #92400e; }
  .btn { display: block; width: 100%; border: 0; border-radius: 10px; padding: 10px; font-size: 14px;
         font-weight: 600; color: #fff; margin-top: 6px; }
  .btn.view { background: ${brand}; }
  .btn.sv { background: #374151; }
  .legend { position: absolute; left: 10px; bottom: 26px; z-index: 2; background: ${legendBg};
            padding: 8px 10px; border-radius: 10px; font-size: 12px; color: ${legendColor};
            box-shadow: 0 1px 6px rgba(0,0,0,.2); line-height: 1.7; }
  .legend i { display: inline-block; width: 11px; height: 11px; border-radius: 50%; margin-right: 6px; vertical-align: -1px; }
  ${darkCss}
</style></head><body><div id="map"></div>
<script src="https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.js"></script>
<script>
var center = [${center.lng}, ${center.lat}];   // MapLibre is [lng, lat]
var points = ${data};

var rasterStyle = {
  version: 8,
  sources: { osm: { type: "raster", tileSize: 256, maxzoom: 19,
    tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
    attribution: "&copy; OpenStreetMap contributors" } },
  layers: [{ id: "osm", type: "raster", source: "osm" }]
};

var map = new maplibregl.Map({
  container: "map",
  style: "${STYLE_URL}",
  center: center,
  zoom: 15,
  attributionControl: { compact: true }
});
map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "bottom-right");

// If the vector style fails to load, fall back to plain OSM tiles instead of a blank map.
var fellBack = false;
map.on("error", function () {
  if (!fellBack && !map.isStyleLoaded()) {
    fellBack = true;
    map.setStyle(rasterStyle);
  }
});

function el(tag, cls, text) {
  var e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}

new maplibregl.Marker({ element: el("div", "me") }).setLngLat(center).addTo(map);

var markers = [];
var bounds = new maplibregl.LngLatBounds(center, center);
points.forEach(function (p) {
  var isBin = p.kind === "bin";
  var cls = "pin " + (isBin ? "bin" : "sev" + (p.severity >= 3 ? 3 : p.severity >= 2 ? 2 : 1)) + (p.demo ? " demo" : "");
  var pin = el("div", cls, isBin ? "" : String(p.count));

  var box = el("div");
  box.appendChild(el("div", "t", p.title));
  if (p.photoUrl) {
    var img = document.createElement("img");
    img.className = "thumb";
    img.src = p.photoUrl;
    img.onerror = function () { img.style.display = "none"; };
    box.appendChild(img);
  }
  box.appendChild(el("div", "d", p.detail));
  var chips = el("div", "chips");
  if (!isBin) {
    chips.appendChild(el("span", "chip", "Severity " + p.severity));
    chips.appendChild(el("span", "chip", p.status));
  }
  if (p.demo) chips.appendChild(el("span", "chip demo", "Demo data"));
  box.appendChild(chips);
  if (!isBin) {
    var view = el("button", "btn view", "View report");
    view.onclick = function () {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: "view", id: p.id }));
    };
    box.appendChild(view);
  }
  var sv = el("button", "btn sv", "Open in Street View");
  sv.onclick = function () {
    window.ReactNativeWebView.postMessage(JSON.stringify({ type: "streetview", lat: p.lat, lng: p.lng }));
  };
  box.appendChild(sv);

  var popup = new maplibregl.Popup({ offset: isBin ? 14 : 20, closeButton: false, maxWidth: "280px" })
    .setDOMContent(box);
  var marker = new maplibregl.Marker({ element: pin }).setLngLat([p.lng, p.lat]).setPopup(popup).addTo(map);
  markers.push(marker);
  bounds.extend([p.lng, p.lat]);
});

if (points.length > 0) map.fitBounds(bounds, { padding: 60, maxZoom: 16, animate: false });

// Called from the app (injectJavaScript) when a list row is tapped.
window.focusPoint = function (i) {
  var p = points[i];
  var m = markers[i];
  if (!p || !m) return;
  map.flyTo({ center: [p.lng, p.lat], zoom: 17 });
  if (!m.getPopup().isOpen()) m.togglePopup();
};

var legend = el("div", "legend");
legend.innerHTML = '<div><i style="background:#dc2626"></i>Severity 3</div>' +
  '<div><i style="background:#f97316"></i>Severity 2</div>' +
  '<div><i style="background:#eab308"></i>Severity 0-1</div>' +
  '<div><i style="background:#16a34a"></i>Bin</div>';
document.body.appendChild(legend);
</script></body></html>`;
}
