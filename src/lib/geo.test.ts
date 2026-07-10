import { project } from './geo'

test('projects known places inside the 400x300 viewBox', () => {
  const jerusalem = project(31.78, 35.22)
  expect(jerusalem.x).toBeGreaterThan(0); expect(jerusalem.x).toBeLessThan(400)
  expect(jerusalem.y).toBeGreaterThan(0); expect(jerusalem.y).toBeLessThan(300)
  const rome = project(41.9, 12.49)
  expect(rome.x).toBeLessThan(jerusalem.x)   // Rome is west
  expect(rome.y).toBeLessThan(jerusalem.y)   // Rome is north
})
