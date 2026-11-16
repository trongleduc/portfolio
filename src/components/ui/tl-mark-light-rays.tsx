"use client";

import LightRays, { RaysOrigin } from "@/components/ui/light-rays";
import { TLMarkIsometric } from "@/components/ui/tl-mark-isometric";
import { cn } from "@/lib/utils";

interface TLMarkLightRaysProps {
  raysOrigin?: RaysOrigin;
  raysColor?: string;
  raysSpeed?: number;
  lightSpread?: number;
  rayLength?: number;
  followMouse?: boolean;
  mouseInfluence?: number;
  className?: string;
  /**
   * Positions the TL drawing sheet (900x500, rendered at its natural aspect ratio).
   * Defaults to filling the container.
   */
  markClassName?: string;
  /** Centre of the ambient glow behind the letters, as a CSS position. */
  glowAt?: string;
}

/** The isometric TL monogram over WebGL light rays and a soft pulsing glow. */
export function TLMarkLightRays({
  raysOrigin = "top-right",
  raysColor = "#38bdf8",
  raysSpeed = 1.2,
  lightSpread = 1.4,
  rayLength = 1.2,
  followMouse = false,
  mouseInfluence = 0.25,
  className = "",
  markClassName = "absolute inset-0",
  glowAt = "75% 35%",
}: TLMarkLightRaysProps) {
  return (
    <div className={cn("group absolute inset-0 h-full w-full select-none overflow-hidden", className)}>
      {/* 1. WebGL light rays */}
      <div className="pointer-events-none absolute inset-0 z-0 opacity-85 transition-opacity duration-500 group-hover:opacity-100">
        <LightRays
          raysOrigin={raysOrigin}
          raysColor={raysColor}
          raysSpeed={raysSpeed}
          lightSpread={lightSpread}
          rayLength={rayLength}
          followMouse={followMouse}
          mouseInfluence={mouseInfluence}
          distortion={0.12}
          pulsating={true}
          fadeDistance={1.2}
          saturation={1.2}
        />
      </div>

      {/* 2. Ambient bloom behind the letters (CSS animation, no re-renders) */}
      <div
        className="animate-tl-glow pointer-events-none absolute inset-0 z-10"
        style={{ background: `radial-gradient(circle at ${glowAt}, ${raysColor}30 0%, transparent 50%)` }}
      />

      {/* 3. TL drawing sheet */}
      <div className={cn("pointer-events-auto z-20", markClassName)}>
        <TLMarkIsometric className="h-auto w-full" />
      </div>
    </div>
  );
}

export default TLMarkLightRays;
