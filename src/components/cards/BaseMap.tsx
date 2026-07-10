import type { ReactNode } from 'react'
import { VIEW } from '../../lib/geo'

// Stylized eastern-Mediterranean world: sea background, simplified land masses.
// Not geographically precise — evocative, consistent with the app's aesthetic.
export function BaseMap({ children }: { children: ReactNode }) {
  return (
    <svg viewBox={`0 0 ${VIEW.w} ${VIEW.h}`} className="basemap" role="img" aria-label="Map of the biblical world">
      <rect width={VIEW.w} height={VIEW.h} fill="var(--map-sea)" />
      {/* Anatolia + Levant + Mesopotamia (north/east land mass) */}
      <path fill="var(--map-land)" d="M96,0 L400,0 L400,300 L285,300 C278,262 270,240 258,222 C250,208 246,196 250,182 C238,170 232,156 234,142 C222,132 214,120 210,106 L186,98 C170,92 154,90 138,84 C118,78 104,66 96,52 Z" />
      {/* Egypt / North Africa (south land mass) */}
      <path fill="var(--map-land)" d="M0,236 C40,228 90,224 140,230 C180,234 214,244 236,262 C244,274 248,288 250,300 L0,300 Z" />
      {/* Greece */}
      <path fill="var(--map-land)" d="M60,0 L88,0 C84,20 76,38 62,50 C52,58 44,52 48,40 C54,26 58,14 60,0 Z" />
      {/* Italy */}
      <path fill="var(--map-land)" d="M10,0 L34,0 C38,22 34,44 22,64 C14,74 6,70 8,56 C12,38 12,18 10,0 Z" />
      {/* Cyprus + Crete */}
      <ellipse cx="196" cy="130" rx="14" ry="6" fill="var(--map-land)" />
      <ellipse cx="102" cy="96" rx="20" ry="5" fill="var(--map-land)" />
      {children}
    </svg>
  )
}
