import { useMemo, useRef, useState, type PointerEvent } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight, RotateCcw } from "lucide-react";
import type { Campaign } from "./api";

const DEG = Math.PI / 180;
const R = 251;
const CENTER = 300;

function project(lat: number, lon: number, rotation: number) {
  const a = lat * DEG;
  const b = (lon - rotation) * DEG;
  const visible = Math.cos(a) * Math.cos(b);
  return {
    x: CENTER + R * Math.cos(a) * Math.sin(b),
    y: CENTER - R * Math.sin(a),
    front: visible >= 0,
  };
}

function line(coords: [number, number][], rotation: number) {
  let result = "";
  let drawing = false;
  for (const [lat, lon] of coords) {
    const p = project(lat, lon, rotation);
    if (!p.front) { drawing = false; continue; }
    result += (drawing ? " L" : " M") + p.x.toFixed(2) + " " + p.y.toFixed(2);
    drawing = true;
  }
  return result;
}

// Broad illustrative coastlines: no administrative borders, navigation precision, or geocoding claims.
const LAND: [number, number][][] = [
  [[70,-160],[72,-125],[63,-105],[60,-85],[54,-60],[42,-64],[30,-83],[18,-88],[12,-97],[17,-106],[26,-110],[32,-117],[50,-127],[58,-146],[70,-160]],
  [[13,-81],[7,-78],[-4,-81],[-12,-77],[-19,-69],[-33,-71],[-53,-72],[-55,-66],[-44,-62],[-30,-52],[-12,-47],[-1,-49],[8,-61],[13,-81]],
  [[71,-10],[65,18],[56,31],[47,30],[40,43],[31,36],[14,42],[6,36],[-1,43],[-15,42],[-34,19],[-34,15],[-22,13],[-7,10],[10,-17],[21,-17],[35,-7],[42,-10],[47,-4],[56,-8],[71,-10]],
  [[71,22],[72,59],[60,80],[60,115],[55,142],[46,141],[38,128],[31,121],[22,109],[8,104],[1,118],[-8,113],[-6,104],[11,94],[20,85],[9,78],[7,74],[20,69],[26,60],[40,52],[49,42],[59,31],[71,22]],
  [[-10,113],[-18,122],[-13,135],[-18,146],[-35,151],[-43,145],[-38,122],[-25,113],[-10,113]],
  [[59,-44],[67,-52],[80,-41],[82,-20],[73,-17],[61,-42],[59,-44]],
  [[-13,43],[-17,50],[-25,50],[-26,44],[-13,43]],
];

function graticule(rotation: number) {
  const lines = [];
  for (let lat = -75; lat <= 75; lat += 15) {
    lines.push(line(Array.from({ length: 145 }, (_, i) => [lat, -180 + 2.5 * i] as [number, number]), rotation));
  }
  for (let lon = -180; lon < 180; lon += 15) {
    lines.push(line(Array.from({ length: 73 }, (_, i) => [-90 + 2.5 * i, lon] as [number, number]), rotation));
  }
  return lines;
}

export function CampaignGlobe({ campaigns }: { campaigns: Campaign[] }) {
  const [rotation, setRotation] = useState(-25);
  const [selected, setSelected] = useState<Campaign | null>(null);
  const dragging = useRef<{ x: number; rotation: number } | null>(null);
  const grid = useMemo(() => graticule(rotation), [rotation]);
  const landmarks = useMemo(() => LAND.map((shape) => line(shape, rotation)), [rotation]);
  const markers = useMemo(() => campaigns.map((campaign) => ({
    campaign,
    point: project(campaign.latitude, campaign.longitude, rotation),
  })).filter((marker) => marker.point.front), [campaigns, rotation]);
  const rotate = (delta: number) => {
    setRotation((previous) => ((previous + delta + 540) % 360) - 180);
  };
  function down(e: PointerEvent<SVGSVGElement>) {
    if (e.target !== e.currentTarget && (e.target as Element).closest(".globe-pin")) return;
    dragging.current = { x: e.clientX, rotation };
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  function move(e: PointerEvent<SVGSVGElement>) {
    if (!dragging.current) return;
    setRotation(((dragging.current.rotation - (e.clientX - dragging.current.x) * 0.42 + 540) % 360) - 180);
  }
  function stop(e: PointerEvent<SVGSVGElement>) {
    dragging.current = null;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
  }
  return (
    <section className="panel demo-globe-panel">
      <header className="globe-header">
        <div><p className="eyebrow">Interactive orbit · Free map renderer</p><h2>Atlas of possibility</h2><p>Drag to spin or use the rotate buttons. All campaign coordinates are fictional.</p></div>
        <div className="globe-controls">
          <button className="secondary" onClick={() => rotate(-30)} aria-label="Rotate globe west"><ArrowLeft size={18}/></button>
          <button className="secondary" onClick={() => rotate(30)} aria-label="Rotate globe east"><ArrowRight size={18}/></button>
          <button className="secondary" onClick={() => { setRotation(-25); setSelected(null); }} aria-label="Reset globe"><RotateCcw size={18}/></button>
        </div>
      </header>
      <div className="globe-layout">
        <svg className="campaign-globe" viewBox="0 0 600 600" role="img" aria-label={`Rotatable illustrative globe. ${markers.length} fictional campaign locations visible on this hemisphere.`}
          onPointerDown={down} onPointerMove={move} onPointerUp={stop} onPointerCancel={stop}>
          <defs>
            <radialGradient id="demo-globe-sea" cx="32%" cy="24%" r="82%">
              <stop offset="0%" stopColor="#2b7696"/><stop offset="52%" stopColor="#123f66"/><stop offset="88%" stopColor="#09203e"/><stop offset="100%" stopColor="#060c20"/>
            </radialGradient>
            <clipPath id="demo-globe-clip"><circle cx="300" cy="300" r="251"/></clipPath>
            <filter id="globe-glow"><feGaussianBlur stdDeviation="10"/></filter>
          </defs>
          <circle cx="300" cy="300" r="259" fill="#5bdff1" opacity=".18" filter="url(#globe-glow)" />
          <circle cx="300" cy="300" r="251" fill="url(#demo-globe-sea)" stroke="#7bd9ee" strokeWidth="2" />
          <g clipPath="url(#demo-globe-clip)" fill="none">
            {grid.map((d, i) => <path key={"grid"+i} d={d} stroke="#7ac8e1" strokeOpacity=".18" strokeWidth=".8" />)}
            {landmarks.map((d, i) => <path key={"land"+i} d={d} stroke="#a8f5dd" strokeOpacity=".67" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />)}
          </g>
          {markers.map(({ campaign, point }) => (
            <g className="globe-pin" key={campaign.id} tabIndex={0} role="button" aria-label={`Select fictional campaign: ${campaign.title}`}
              onClick={() => setSelected(campaign)}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSelected(campaign); } }}>
              <circle cx={point.x} cy={point.y} r="10" fill="#092942" stroke="#9ef9ff" strokeWidth="1.5"/>
              <circle cx={point.x} cy={point.y} r="4" fill="#e7ffff" />
              <title>{campaign.title} — {campaign.location}, synthetic</title>
            </g>
          ))}
        </svg>
        <div className="globe-aside">
          <strong>{markers.length} visible fictional campaigns</strong>
          <p className="meta">Select a marker or browse the filtered cards below. This is a schematic globe, not a geographic or political reference.</p>
          {selected && (
            <article className="globe-selected">
              <p className="eyebrow">Selected mission · fictional</p>
              <h3>{selected.title}</h3>
              <p>{selected.location} · Synthetic</p>
              <Link className="button small" to={"/campaign/"+selected.id}>Open campaign and charts</Link>
            </article>
          )}
          {!selected && <p className="meta">Select a glowing pin to inspect a campaign.</p>}
        </div>
      </div>
    </section>
  );
}
