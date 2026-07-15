import { statSync } from 'node:fs'
import basemap from './basemap.json'

test('basemap stays within the 60KB budget', () => {
  expect(statSync('src/content/basemap.json').size).toBeLessThanOrEqual(61440)
})

test('geometry is present and well-formed', () => {
  expect(basemap.land.length).toBeGreaterThanOrEqual(3)
  expect(basemap.lakes.length).toBeGreaterThanOrEqual(2)
  expect(basemap.rivers.length).toBeGreaterThanOrEqual(4)
  for (const d of [...basemap.land, ...basemap.lakes]) expect(d).toMatch(/^M.*Z$/)
  for (const d of basemap.rivers) expect(d).toMatch(/^M/)
  // every coordinate inside the 800×600 frame (with 1px slack for rounding)
  for (const d of [...basemap.land, ...basemap.lakes, ...basemap.rivers]) {
    const nums = d.match(/-?\d+(\.\d+)?/g)!.map(Number)
    for (let i = 0; i < nums.length; i += 2) {
      expect(nums[i]).toBeGreaterThanOrEqual(-1); expect(nums[i]).toBeLessThanOrEqual(801)
      expect(nums[i + 1]).toBeGreaterThanOrEqual(-1); expect(nums[i + 1]).toBeLessThanOrEqual(601)
    }
  }
})
