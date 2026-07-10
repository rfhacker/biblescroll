export const VIEW = { w: 400, h: 300 }
const LON = { min: 10, max: 48 }
const LAT = { min: 27, max: 42.5 }

export function project(lat: number, lon: number): { x: number; y: number } {
  return {
    x: ((lon - LON.min) / (LON.max - LON.min)) * VIEW.w,
    y: ((LAT.max - lat) / (LAT.max - LAT.min)) * VIEW.h,
  }
}
