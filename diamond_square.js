'use strict'

const Vec3 = require('vec3').Vec3
const rand = require('random-seed')

const theFlattening = ['1.13', '1.14', '1.15', '1.16']

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
    x = parseInt(x)
    y = parseInt(y)
    if (typeof (v) !== 'undefined') { this.val(x, y, v) } else { return this.val(x, y) }
  };

  // private methods
  val (x, y, v) {
    if (typeof (v) !== 'undefined') { this.data[x + '_' + y] = Math.max(0.0, Math.min(1.0, v)) } else {
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
      this.val(x, y,
        this.displace((this.val(x - blockSize, y - blockSize) +
          this.val(x + blockSize, y - blockSize) +
          this.val(x - blockSize, y + blockSize) +
          this.val(x + blockSize, y + blockSize)) / 4, blockSize, x, y))
    }
  }

  diamondStep (x, y, blockSize) {
    if (this.data[x + '_' + y] == null) {
      this.val(x, y,
        this.displace((this.val(x - blockSize, y) +
          this.val(x + blockSize, y) +
          this.val(x, y - blockSize) +
          this.val(x, y + blockSize)) / 4, blockSize, x, y))
    }
  }
}

function generation ({ version = '1.8', seed, worldHeight = 80, waterline = 20 } = {}) {
  // Selected empirically
  const size = 10000000
  const Chunk = require('prismarine-chunk')(version)
  const mcData = require('minecraft-data')(version)
  const majorVersion = mcData.version.majorVersion
  const space = new DiamondSquare(size, size / 500, seed)

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
          let block
          let data
          const surfaceblock = level < waterline ? mcData.blocksByName.sand.id : (isFlatteningVersion(majorVersion) ? mcData.blocksByName.grass_block.id : mcData.blocksByName.grass.id) // Sand below water, grass
          const belowblock = level < waterline ? mcData.blocksByName.sand.id : mcData.blocksByName.dirt.id // 3-5 blocks below surface
          if (y < bedrockheight) block = mcData.blocksByName.bedrock.id // Solid bedrock at bottom
          else if (y < level && y >= dirtheight) {
            block = belowblock // Dirt/sand below surface
            if (isFlatteningVersion(majorVersion)) {
              if (level < waterline) data = 0 // Default sand data is 0
              else data = 1 // Default dirt data is 1, 0 is snowy
            }
          } else if (y < level) block = mcData.blocksByName.stone.id // Set stone inbetween
          else if (y === level) {
            block = surfaceblock // Set surface sand/grass
            if (isFlatteningVersion(majorVersion)) {
              if (level < waterline) data = 0 // Default sand data is 0
              else data = 1 // Default dirt data is 1, 0 is snowy
            }
          } else if (y <= waterline) block = mcData.blocksByName.water.id // Set the water
          else if (y === level + 1 && level >= waterline && seedRand(10) === 0) { // 1/10 chance of grass
            if (isFlatteningVersion(majorVersion)) {
              block = mcData.blocksByName.grass.id
              data = 0
            } else {
              block = mcData.blocksByName.tall_grass?.id ?? mcData.blocksByName.tallgrass?.id
              data = 1
            }
          }
          const pos = new Vec3(x, y, z)
          if (block) chunk.setBlockType(pos, block)
          if (data) {
            if (isFlatteningVersion(majorVersion)) chunk.setBlockData(pos, data)
            else chunk.setBlockData(pos, data)
          }
          chunk.setSkyLight(pos, 15)
        }
      }
    }
    return chunk
  }
  return generateSimpleChunk
}

function isFlatteningVersion (version) {
  if (theFlattening.indexOf(version) > -1) { return true } else { return false }
}

module.exports = generation
