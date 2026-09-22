import { deflateSync } from 'node:zlib'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { crc32 } from 'node:zlib'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

const INK = [0xf4, 0xf7, 0xf9, 255]
const PRIMARY = [0x1e, 0x3a, 0x4c, 255]
const BG = [0xd9, 0xe2, 0xe8, 255]

function chunk(type, data) {
  const header = Buffer.from(type)
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const crc = crc32(Buffer.concat([header, data]))
  const crcBuf = Buffer.alloc(4)
  crcBuf.writeUInt32BE(crc)
  return Buffer.concat([len, header, data, crcBuf])
}

function png(width, height, getPixel) {
  const raw = Buffer.alloc((width * 4 + 1) * height)
  for (let y = 0; y < height; y += 1) {
    const row = y * (width * 4 + 1)
    raw[row] = 0
    for (let x = 0; x < width; x += 1) {
      const p = getPixel(x, y)
      const o = row + 1 + x * 4
      raw[o] = p[0]
      raw[o + 1] = p[1]
      raw[o + 2] = p[2]
      raw[o + 3] = p[3]
    }
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8
  ihdr[9] = 6
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

function roundedRect(x, y, w, h, rx, px, py) {
  const lx = px - x
  const ly = py - y
  if (lx < 0 || ly < 0 || lx >= w || ly >= h) return false
  const r = Math.min(rx, w / 2, h / 2)
  if (lx >= r && lx < w - r) return true
  if (ly >= r && ly < h - r) return true
  const cx = lx < r ? r : w - r
  const cy = ly < r ? r : h - r
  return (lx - cx) ** 2 + (ly - cy) ** 2 <= r * r
}

function markPixel(px, py, size) {
  if (!roundedRect(0, 0, size, size, size * 0.22, px, py)) return [0, 0, 0, 0]
  const s = size / 1024
  const insideBar =
    (px >= 256 * s && px < 416 * s && py >= 256 * s && py < 864 * s) ||
    (px >= 256 * s && px < 768 * s && py >= 704 * s && py < 864 * s) ||
    (px >= 512 * s && px < 768 * s && py >= 352 * s && py < 480 * s)
  return insideBar ? INK : PRIMARY
}

function iconAt(size) {
  return png(size, size, (x, y) => {
    const p = markPixel(x, y, size)
    if (p[3] === 0) return PRIMARY
    return p
  })
}

function splashPng() {
  const size = 2732
  const mark = 512
  const ox = Math.floor((size - mark) / 2)
  const oy = ox
  return png(size, size, (x, y) => {
    if (x >= ox && x < ox + mark && y >= oy && y < oy + mark) {
      const p = markPixel(x - ox, y - oy, mark)
      return p[3] === 0 ? BG : p
    }
    return BG
  })
}

const resources = path.join(root, 'resources')
const pub = path.join(root, 'public')
await mkdir(resources, { recursive: true })
await mkdir(pub, { recursive: true })

const icon = iconAt(1024)
await writeFile(path.join(resources, 'icon.png'), icon)
await writeFile(path.join(resources, 'icon-only.png'), icon)
await writeFile(path.join(resources, 'icon-foreground.png'), icon)
await writeFile(
  path.join(resources, 'icon-background.png'),
  png(1024, 1024, () => PRIMARY),
)
await writeFile(path.join(resources, 'splash.png'), splashPng())
await writeFile(path.join(pub, 'apple-touch-icon.png'), iconAt(180))

console.log('Wrote resources/ icon and splash from the green brand mark.')
