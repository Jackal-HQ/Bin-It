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
  device: { lat: number; lng: number } | null = null,
) {
  // "<" is escaped so no title can close the script tag.
  const data = JSON.stringify(points).split("<").join(`${BACKSLASH}u003c`);
  const deviceJson = device ? `[${device.lng}, ${device.lat}]` : "null";

  // Daylight (.claude/DESIGN.md) chrome around the map; the pin and bin colors are the
  // dashboard's (apps/web/lib/labels.ts), so the phone and the dashboard read as one.
  return `<!doctype html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Manrope:wght@500;600;700;800&display=swap">
<link rel="stylesheet" href="https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.css">
<style>
  html, body, #map { height: 100%; margin: 0; background: #F4F0E8; }
  body { font-family: Manrope, -apple-system, Roboto, "Segoe UI", sans-serif; }
  .pin { width: 32px; height: 32px; border-radius: 50%; border: 3px solid #fff;
         box-shadow: 0 2px 6px rgba(0,0,0,.3); color: #fff; font-weight: 800; font-size: 13px;
         display: flex; align-items: center; justify-content: center; cursor: pointer;
         text-shadow: 0 1px 1px rgba(0,0,0,.35); box-sizing: border-box; }
  .pin.sev1 { background: #FDAE61; } .pin.sev2 { background: #F46D43; } .pin.sev3 { background: #A50026; }
  .pin.demo { border-color: #111827; }
  .pin.bin { width: 16px; height: 16px; border-width: 2px; background: #374151; font-size: 0; }
  .me { width: 16px; height: 16px; border-radius: 50%; background: #2563eb; border: 3px solid #fff;
        box-sizing: border-box; box-shadow: 0 0 0 0 rgba(37,99,235,.5); animation: pulse 2s infinite; }
  @keyframes pulse { 70% { box-shadow: 0 0 0 14px rgba(37,99,235,0); } 100% { box-shadow: 0 0 0 0 rgba(37,99,235,0); } }
  .maplibregl-popup-content { border-radius: 22px; box-shadow: 0 18px 36px -12px rgba(70,55,10,.5);
                              background: #FEFDFA; padding: 14px; min-width: 200px; }
  .maplibregl-popup-anchor-top .maplibregl-popup-tip { border-bottom-color: #FEFDFA; }
  .maplibregl-popup-anchor-bottom .maplibregl-popup-tip { border-top-color: #FEFDFA; }
  .maplibregl-popup-anchor-left .maplibregl-popup-tip { border-right-color: #FEFDFA; }
  .maplibregl-popup-anchor-right .maplibregl-popup-tip { border-left-color: #FEFDFA; }
  .t { font-size: 17px; font-weight: 800; letter-spacing: -.2px; color: #1E1D1A; margin-bottom: 8px; }
  .d { font-size: 13px; font-weight: 500; color: #57544C; margin-bottom: 10px; }
  .thumb { width: 100%; height: 120px; object-fit: cover; border-radius: 16px; margin-bottom: 10px; background: rgba(60,52,28,.06); }
  .chips { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 12px; }
  .chip { font-size: 11px; font-weight: 600; padding: 4px 10px; border-radius: 999px; background: rgba(60,52,28,.07); color: #57544C; }
  .chip.demo { background: transparent; border: 1.5px dotted rgba(110,107,98,.5); padding: 2px 8px; color: #6E6B62;
               text-transform: uppercase; letter-spacing: .06em; font-size: 10px; }
  .btn { display: block; width: 100%; height: 44px; border: 0; border-radius: 999px; font: 700 14px Manrope, sans-serif;
         margin-top: 6px; }
  .btn.view { background: #2A2926; color: #fff; }
  .btn.sv { background: #fff; color: #1E1D1A; border: 1px solid rgba(60,52,28,.16); font-weight: 600; }
  .legend { position: absolute; left: 12px; bottom: 12px; z-index: 2; background: rgba(254,253,250,.95);
            padding: 10px 14px; border-radius: 18px; font-size: 12px; font-weight: 600; color: #57544C;
            box-shadow: 0 10px 24px -10px rgba(70,55,10,.45); line-height: 1.75; }
  .legend i { display: inline-block; width: 11px; height: 11px; border-radius: 50%; margin-right: 8px; vertical-align: -1px; }
  .legend .ring { border: 2.5px solid #111827; background: #9CA3AF; width: 12px; height: 12px; box-sizing: border-box; }
  .maplibregl-ctrl-group { border-radius: 999px; overflow: hidden; box-shadow: 0 10px 24px -10px rgba(70,55,10,.45); background: rgba(254,253,250,.95); }
  .maplibregl-ctrl-group button { width: 40px; height: 40px; }
  .maplibregl-ctrl-attrib { border-radius: 999px; background: rgba(255,255,255,.74); font-size: 10px; color: #6E6B62; }
</style></head><body><div id="map"></div>
<script src="https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.js"></script>
<script>
var center = [${center.lng}, ${center.lat}];   // MapLibre is [lng, lat]
var device = ${deviceJson};                     // real phone location, or null
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
map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");

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

// The "you are here" dot is drawn only when we have a real GPS fix, and at that fix —
// never at the map center (which may be the city fallback).
if (device) {
  new maplibregl.Marker({ element: el("div", "me") }).setLngLat(device).addTo(map);
}

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

  var popup = new maplibregl.Popup({ offset: isBin ? 14 : 20, closeButton: false, focusAfterOpen: false, maxWidth: "280px" })
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
legend.innerHTML = '<div><i style="background:#A50026"></i>High</div>' +
  '<div><i style="background:#F46D43"></i>Medium</div>' +
  '<div><i style="background:#FDAE61"></i>Low</div>' +
  '<div><i class="ring"></i>Dark ring = demo data</div>' +
  '<div><i style="background:#374151"></i>Bin</div>';
document.body.appendChild(legend);
</script></body></html>`;
}
