'use strict'

const { Vec3 } = require('vec3')
const rand = require('random-seed')

class DiamondSquare {
  constructor (size, roughness, seed) {
    // public fields
    this.size = size
    this.roughness = roughness
    this.seed = seed
    this.opCountN = 0

    // private field
    this.data = []
  }

  // public methods
  value (x, y, v) {
    if (typeof x === 'string') x = parseInt(x)
    if (typeof y === 'string') y = parseInt(y)
    if (typeof v !== 'undefined') { this.data[x + '_' + y] = Math.max(0.0, Math.min(1.0, v)) } else {
      if (x <= 0 || x >= this.size || y <= 0 || y >= this.size) return 0.0

      if (this.data[x + '_' + y] == null) {
        this.opCountN++
        let base = 1
        while (((x & base) === 0) && ((y & base) === 0)) { base <<= 1 }

        if (((x & base) !== 0) && ((y & base) !== 0)) { this.squareStep(x, y, base) } else { this.diamondStep(x, y, base) }
      }
      return this.data[x + '_' + y]
    }
  }

  // private methods
  randFromPair (x, y) {
    let xm7, xm13, xm1301081, ym8461, ym105467, ym105943
    for (let i = 0; i < 80; i++) {
      xm7 = x % 7
      xm13 = x % 13
      xm1301081 = x % 1301081
      ym8461 = y % 8461
      ym105467 = y % 105467
      ym105943 = y % 105943
      // y = (i < 40 ? seed : x);
      y = x + this.seed
      x += (xm7 + xm13 + xm1301081 + ym8461 + ym105467 + ym105943)
    }

    return (xm7 + xm13 + xm1301081 + ym8461 + ym105467 + ym105943) / 1520972.0
  }

  displace (v, blockSize, x, y) {
    return (v + (this.randFromPair(x, y, this.seed) - 0.5) * blockSize * 2 / this.size * this.roughness)
  }

  squareStep (x, y, blockSize) {
    if (this.data[x + '_' + y] == null) {
      this.value(x, y,
        this.displace((this.value(x - blockSize, y - blockSize) +
          this.value(x + blockSize, y - blockSize) +
          this.value(x - blockSize, y + blockSize) +
          this.value(x + blockSize, y + blockSize)) / 4, blockSize, x, y))
    }
  }

  diamondStep (x, y, blockSize) {
    if (this.data[x + '_' + y] == null) {
      this.value(x, y,
        this.displace((this.value(x - blockSize, y) +
          this.value(x + blockSize, y) +
          this.value(x, y - blockSize) +
          this.value(x, y + blockSize)) / 4, blockSize, x, y))
    }
  }
}

function generation ({ version = '1.8', seed, worldHeight = 80, waterline = 20, size = 10000000, roughness = null } = {}) {
  const Chunk = require('prismarine-chunk')(version)
  const registry = require('minecraft-data')(version)

  // Selected empirically
  if (roughness === null) roughness = size / 500
  const space = new DiamondSquare(size, roughness, seed)

  function generateSimpleChunk (chunkX, chunkZ) {
    const chunk = new Chunk()
    const seedRand = rand.create(seed + ':' + chunkX + ':' + chunkZ)
    const worldX = chunkX * 16 + size / 2
    const worldZ = chunkZ * 16 + size / 2

    for (let x = 0; x < 16; x++) {
      for (let z = 0; z < 16; z++) {
        const level = Math.floor(space.value(worldX + x, worldZ + z) * worldHeight)
        const dirtheight = level - 4 + seedRand(3)
        const bedrockheight = 1 + seedRand(4)
        for (let y = 0; y < 256; y++) {
          const pos = new Vec3(x, y, z)
          if (y < bedrockheight) {
            chunk.setBlockType(pos, registry.blocksByName.bedrock.id)
          } else if (y < level && y >= dirtheight) {
            if (level < waterline) {
              chunk.setBlockType(pos, registry.blocksByName.sand.id)
              if (registry.supportFeature('theFlattening')) chunk.setBlockData(pos, 0)
            } else {
              chunk.setBlockType(pos, registry.blocksByName.dirt.id)
              if (registry.supportFeature('theFlattening')) chunk.setBlockData(pos, 1)
            }
          } else if (y < level) {
            chunk.setBlockType(pos, registry.blocksByName.stone.id)
          } else if (y === level) {
            if (level < waterline) {
              chunk.setBlockType(pos, registry.blocksByName.sand.id)
              if (registry.supportFeature('theFlattening')) chunk.setBlockData(pos, 0)
            } else {
              chunk.setBlockType(pos, registry.blocksByName.grass_block?.id ?? registry.blocksByName.grass.id)
              if (registry.supportFeature('theFlattening')) chunk.setBlockData(pos, 1)
            }
          } else if (y <= waterline) {
            chunk.setBlockType(pos, registry.blocksByName.water.id)
          } else if (y === level + 1 && level >= waterline && seedRand(10) === 0) {
            chunk.setBlockType(pos, registry.blocksByName.tall_grass?.id ?? registry.blocksByName.tallgrass?.id ?? registry.blocksByName.grass.id)
            if (registry.supportFeature('theFlattening')) chunk.setBlockData(pos, 0)
          }
          chunk.setSkyLight(pos, 15)
        }
      }
    }
    return chunk
  }
  return generateSimpleChunk
}

module.exports = generation
