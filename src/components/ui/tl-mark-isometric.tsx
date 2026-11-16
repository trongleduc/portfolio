"use client";

import { useEffect, useId, useRef, useState, type CSSProperties } from "react";

/*
 * "TL" monogram as an isometric drawing: both letters lie flat on the ground
 * plane and are extruded upward. Top faces carry a diagonal hatch, side faces
 * stay plain, and the sheet carries construction lines, an aligned dimension
 * and an angle callout, like an architectural drawing.
 *
 * Letters are authored in a 2D plan (px → right, py → down), projected with a
 * true 30° isometric (X = (px − py)·cos30, Y = (px + py)·sin30 − z), then the
 * whole drawing is rotated up by TILT_UP° so its baseline edges sit at
 * 30 − TILT_UP degrees below the horizontal. Proportions stay balanced.
 *
 * Only walls whose outward normal is +px or +py face the camera; each letter's
 * top face is painted after its walls and occludes whatever lies behind it.
 * Every face carries its own outline and cursor-glow stroke, so nearer faces
 * also hide the outlines and glow of the faces behind them.
 *
 * The sheet is 900x500 and is meant to fill its container
 * (preserveAspectRatio xMidYMin meet); construction lines run past the sheet
 * and are clipped by the parent.
 */

const INK = "hsl(var(--foreground))";
const PAPER = "hsl(var(--background))";

const TILT_UP = 16; // degrees the drawing is rotated up
const EDGE_ANGLE = 30 - TILT_UP; // resulting baseline angle below horizontal
const HEIGHT = 32; // extrusion height in plan units

const SHEET = { w: 900, h: 500 };
// Letters are scaled to this box, then centred horizontally on the sheet.
// Bottom stays clear of the identity block.
const FIT = { w: 470, y0: 40, y1: 328 };
const ANGLE_R = 60; // radius of the angle callout arc, sheet units
const DIM_PX = -40; // plan offset of the aligned dimension, left of the T

type Plan = [number, number];
type Pt = [number, number];

const rad = (deg: number) => (deg * Math.PI) / 180;
const COS30 = Math.cos(rad(30));
const COS_T = Math.cos(rad(TILT_UP));
const SIN_T = Math.sin(rad(TILT_UP));

function raw(px: number, py: number, z: number): Pt {
  const x = (px - py) * COS30;
  const y = (px + py) * 0.5 - z;
  // Visual counter-clockwise rotation in a y-down space.
  return [x * COS_T + y * SIN_T, -x * SIN_T + y * COS_T];
}

// Plan outlines, clockwise (y down). Cap height 200, stroke 64.
const T_PLAN: Plan[] = [[0, 0], [200, 0], [200, 64], [132, 64], [132, 200], [68, 200], [68, 64], [0, 64]];
const L_PLAN: Plan[] = [[240, 0], [304, 0], [304, 136], [400, 136], [400, 200], [240, 200]];

// Fit the extruded letters into FIT, then centre them horizontally on the sheet.
const { SCALE, ORIGIN_X, ORIGIN_Y } = (() => {
  const pts = [...T_PLAN, ...L_PLAN].flatMap(([x, y]) => [raw(x, y, 0), raw(x, y, HEIGHT)]);
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  const [minX, maxX, minY, maxY] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const s = Math.min(FIT.w / (maxX - minX), (FIT.y1 - FIT.y0) / (maxY - minY));
  // Centre the letters themselves; callouts hang off either side.
  const left = minX * s;
  const right = maxX * s;
  return {
    SCALE: s,
    ORIGIN_X: SHEET.w / 2 - (left + right) / 2,
    ORIGIN_Y: (FIT.y0 + FIT.y1) / 2 - ((minY + maxY) / 2) * s,
  };
})();

function project(px: number, py: number, z: number): Pt {
  const [x, y] = raw(px, py, z);
  return [ORIGIN_X + x * SCALE, ORIGIN_Y + y * SCALE];
}

function toPath(points: Pt[], close = true): string {
  const d = points.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  return close ? `${d} Z` : d;
}

interface Solid {
  walls: string[];
  top: string;
}

function extrude(plan: Plan[]): Solid {
  const walls: string[] = [];
  plan.forEach((a, i) => {
    const b = plan[(i + 1) % plan.length];
    // Outward normal of a clockwise (y-down) edge is (dy, −dx).
    const nx = b[1] - a[1];
    const ny = a[0] - b[0];
    if (nx > 0 || ny > 0) {
      walls.push(
        toPath([project(a[0], a[1], 0), project(b[0], b[1], 0), project(b[0], b[1], HEIGHT), project(a[0], a[1], HEIGHT)]),
      );
    }
  });
  return { walls, top: toPath(plan.map(([x, y]) => project(x, y, HEIGHT))) };
}

const SOLIDS = [extrude(T_PLAN), extrude(L_PLAN)];

// Construction lines on the ground plane, long enough to run off the sheet.
const CONSTRUCTION = [
  toPath([project(-900, 200, 0), project(1300, 200, 0)], false),
  toPath([project(-900, 0, 0), project(1300, 0, 0)], false),
  toPath([project(0, -900, 0), project(0, 900, 0)], false),
  toPath([project(400, -900, 0), project(400, 900, 0)], false),
];

// Aligned dimension along the cap height (py), offset to the left of the T.
const DIM = {
  ext: [
    toPath([project(-4, 0, HEIGHT), project(DIM_PX - 10, 0, HEIGHT)], false),
    toPath([project(64, 200, HEIGHT), project(DIM_PX - 10, 200, HEIGHT)], false),
  ],
  line: toPath([project(DIM_PX, 0, HEIGHT), project(DIM_PX, 200, HEIGHT)], false),
  label: (() => {
    const [x, y] = project(DIM_PX - 16, 100, HEIGHT);
    return { x, y };
  })(),
};

// Angle callout anchored on the top corner of the L.
const ANGLE = (() => {
  const [cx, cy] = project(240, 0, HEIGHT);
  const r = ANGLE_R;
  const at = (radius: number, deg: number): Pt => [cx + radius * Math.cos(rad(deg)), cy + radius * Math.sin(rad(deg))];
  const [ax, ay] = at(r, 0);
  const [bx, by] = at(r, EDGE_ANGLE);
  const [lx, ly] = at(r + 22, EDGE_ANGLE / 2);
  return {
    reference: toPath([[cx + 6, cy], [cx + r + 30, cy]], false),
    extension: toPath([project(304, 0, HEIGHT), at(r + 12, EDGE_ANGLE)], false),
    arc: `M${ax.toFixed(1)} ${ay.toFixed(1)} A${r} ${r} 0 0 1 ${bx.toFixed(1)} ${by.toFixed(1)}`,
    label: { x: lx, y: ly },
  };
})();

const edgeStyle: CSSProperties = { fill: PAPER, stroke: INK, strokeOpacity: 0.45 };

const labelStyle: CSSProperties = {
  fill: INK,
  fillOpacity: 0.55,
  stroke: PAPER,
  strokeWidth: 4,
  paintOrder: "stroke",
  letterSpacing: "0.06em",
};

export function TLMarkIsometric({ className = "h-auto w-full" }: { className?: string }) {
  const id = useId();
  const ids = {
    hatch: `tl-hatch-${id}`,
    arrow: `tl-arrow-${id}`,
    glow: `tl-glow-${id}`,
  };

  const svgRef = useRef<SVGSVGElement>(null);
  const glowRef = useRef<SVGRadialGradientElement>(null);
  const [isPressed, setIsPressed] = useState(false);

  // White edge highlight that follows the cursor. Updates the gradient centre
  // directly (no React re-render per mouse move); getScreenCTM accounts for the
  // sheet's letterboxing inside its container.
  useEffect(() => {
    const svg = svgRef.current;
    const glow = glowRef.current;
    if (!svg || !glow) return;

    let frame = 0;
    const handleMove = (e: PointerEvent) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const ctm = svg.getScreenCTM();
        if (!ctm) return;
        const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse());
        glow.setAttribute("cx", p.x.toFixed(1));
        glow.setAttribute("cy", p.y.toFixed(1));
      });
    };

    window.addEventListener("pointermove", handleMove, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", handleMove);
    };
  }, []);

  const glowStroke = `url(#${ids.glow})`;

  const pressStyle: CSSProperties = {
    transform: isPressed ? "translateY(8px)" : "translateY(0px)",
  };

  return (
    <svg
      ref={svgRef}
      className={`touch-manipulation overflow-visible ${className}`}
      viewBox={`0 0 ${SHEET.w} ${SHEET.h}`}
      preserveAspectRatio="xMidYMin meet"
      fill="none"
      strokeLinejoin="miter"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      onMouseDown={() => setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
      onMouseLeave={() => setIsPressed(false)}
      onTouchStart={() => setIsPressed(true)}
      onTouchEnd={() => setIsPressed(false)}
    >
      <defs>
        {/* Top faces: steep diagonal hatch, rotated together with the drawing */}
        <pattern
          id={ids.hatch}
          width="8"
          height="8"
          patternUnits="userSpaceOnUse"
          patternTransform={`rotate(${30 - TILT_UP})`}
        >
          <path d="M0.5 0V8" style={{ stroke: INK, strokeOpacity: 0.28 }} strokeWidth="1" />
        </pattern>

        {/* Open arrowhead for dimension and angle callouts */}
        <marker
          id={ids.arrow}
          viewBox="0 0 10 10"
          refX="10"
          refY="5"
          markerWidth="7"
          markerHeight="7"
          orient="auto-start-reverse"
        >
          <path d="M0 1.5 L10 5 L0 8.5" style={{ stroke: INK, strokeOpacity: 0.6 }} strokeWidth="1.2" fill="none" />
        </marker>

        {/* Cursor highlight: white in dark mode, ink in light mode (foreground colour) */}
        <radialGradient ref={glowRef} id={ids.glow} cx="-1000" cy="-1000" r="170" gradientUnits="userSpaceOnUse">
          <stop offset="0" style={{ stopColor: INK, stopOpacity: 1 }} />
          <stop offset="0.45" style={{ stopColor: INK, stopOpacity: 0.55 }} />
          <stop offset="1" style={{ stopColor: INK, stopOpacity: 0 }} />
        </radialGradient>
      </defs>

      {/* ── Sheet: construction lines (run off the sheet, clipped by the parent) ── */}
      <g style={{ stroke: INK, strokeOpacity: 0.2 }} strokeWidth="1" strokeDasharray="6 6">
        {CONSTRUCTION.map((d) => (
          <path key={d} d={d} />
        ))}
      </g>

      {/* ── Extruded letters ── */}
      {/* Each face is filled and outlined in painter's order, so nearer faces hide occluded edges. */}
      <g className="transition-transform duration-200 ease-out" style={pressStyle} strokeWidth="1.1">
        {SOLIDS.map((solid, i) => (
          <g key={i}>
            {solid.walls.map((d) => (
              <g key={d}>
                <path d={d} style={edgeStyle} />
                <path d={d} stroke={glowStroke} strokeWidth="1.8" />
              </g>
            ))}
            <path d={solid.top} style={{ fill: PAPER }} />
            <path d={solid.top} fill={`url(#${ids.hatch})`} style={{ stroke: INK, strokeOpacity: 0.45 }} />
            <path d={solid.top} stroke={glowStroke} strokeWidth="1.8" />
          </g>
        ))}
      </g>

      {/* ── Annotations ── */}
      <g style={{ stroke: INK, strokeOpacity: 0.45 }} strokeWidth="1">
        {DIM.ext.map((d) => (
          <path key={d} d={d} strokeOpacity={0.6} />
        ))}
        <path d={DIM.line} markerStart={`url(#${ids.arrow})`} markerEnd={`url(#${ids.arrow})`} />

        <path d={ANGLE.reference} />
        <path d={ANGLE.extension} strokeDasharray="3 3" />
        <path d={ANGLE.arc} markerStart={`url(#${ids.arrow})`} markerEnd={`url(#${ids.arrow})`} />
      </g>

      <text
        x={DIM.label.x}
        y={DIM.label.y}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={12}
        className="font-mono"
        transform={`rotate(${-(30 + TILT_UP)} ${DIM.label.x} ${DIM.label.y})`}
        style={labelStyle}
      >
        200
      </text>
      <text
        x={ANGLE.label.x}
        y={ANGLE.label.y}
        dominantBaseline="middle"
        fontSize={13}
        className="font-mono"
        style={labelStyle}
      >
        {/* Labelled with the rotation applied (16°); the edge itself sits at EDGE_ANGLE (14°). */}
        {TILT_UP}°
      </text>
    </svg>
  );
}

export { TLMarkIsometric as ChanhDaiMarkIsometric };
