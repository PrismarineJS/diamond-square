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

    const levels = []
    for (let x = 0; x < 16; x++) {
      levels.push([])
      for (let z = 0; z < 16; z++) {
        const level = Math.floor(space.value(worldX + x, worldZ + z) * worldHeight)
        levels[x].push({
          surface: level,
          bedrock: seedRand(3) + 1,
          soil: level - 2 - seedRand(2)
        })
        // Set sky light
        for (let y = 0; y < 256; y++) {
          chunk.setSkyLight(new Vec3(x, y, z), 15)
        }
      }
    }
    // Bedrock, Stone, soil, surface, and water layers
    for (let x = 0; x < 16; x++) {
      for (let z = 0; z < 16; z++) {
        const { bedrock, soil, surface } = levels[x][z]
        // Bedrock Layer
        for (let y = 0; y <= bedrock; y++) {
          chunk.setBlockType(new Vec3(x, y, z), registry.blocksByName.bedrock.id)
        }
        // Stone Layer
        for (let y = bedrock + 1; y <= soil; y++) {
          chunk.setBlockType(new Vec3(x, y, z), registry.blocksByName.stone.id)
        }
        // Soil Layer
        for (let y = soil + 1; y < surface; y++) {
          const vec = new Vec3(x, y, z)
          if (surface - waterline < 2) {
            chunk.setBlockType(vec, registry.blocksByName.sand.id)
            if (registry.supportFeature('theFlattening')) chunk.setBlockData(vec, 0)
          } else {
            chunk.setBlockType(vec, registry.blocksByName.dirt.id)
            if (registry.supportFeature('theFlattening')) chunk.setBlockData(vec, 1)
          }
        }
        // Surface Layer
        if (surface - waterline < 2) {
          chunk.setBlockType(new Vec3(x, surface, z), registry.blocksByName.sand.id)
          if (registry.supportFeature('theFlattening')) chunk.setBlockData(new Vec3(x, surface, z), 0)
        } else {
          chunk.setBlockType(new Vec3(x, surface, z), registry.blocksByName.grass_block?.id ?? registry.blocksByName.grass.id)
          if (registry.supportFeature('theFlattening')) chunk.setBlockData(new Vec3(x, surface, z), 1)
        }
        // Water Layer
        for (let y = surface + 1; y <= waterline; y++) {
          chunk.setBlockType(new Vec3(x, y, z), registry.blocksByName.water.id)
        }
      }
    }
    // Decorations: grass, flowers, sugar cane, cactus, dead bushes, kelp, seagrass, tall seagrass, tall grass, double tall grass, etc...
    for (let x = 0; x < 16; x++) {
      for (let z = 0; z < 16; z++) {
        const { surface } = levels[x][z]
        const surfaceVec = new Vec3(x, surface, z)
        const decorationVec = new Vec3(x, surface + 1, z)
        const surfaceBlock = chunk.getBlockType(surfaceVec)
        if (waterline - surface > 0) { // Underwater decorations: kelp, seagrass, tall seagrass
          if ('seagrass' in registry.blocksByName && waterline - surface >= 2 && seedRand(20) === 0) { // Seagrass
            chunk.setBlockType(decorationVec, registry.blocksByName.seagrass.id)
            if (registry.supportFeature('theFlattening')) chunk.setBlockData(decorationVec, 1)
          } else if ('tall_seagrass' in registry.blocksByName && waterline - surface >= 3 && seedRand(40) === 0) { // Tall seagrass
            const decorationVec2 = decorationVec.offset(0, 1, 0)
            chunk.setBlockType(decorationVec, registry.blocksByName.tall_seagrass.id)
            chunk.setBlockType(decorationVec2, registry.blocksByName.tall_seagrass.id)
            if (registry.supportFeature('theFlattening')) {
              chunk.setBlockData(decorationVec, 1)
              chunk.setBlockData(decorationVec2, 0)
            }
          } else if ('kelp' in registry.blocksByName && waterline - surface >= 5 && seedRand(40) === 0) { // Kelp
            const height = Math.min(seedRand(10) + 2, waterline - surface - 1)
            for (let i = 0; i < height - 1; i++) {
              const decorationVec2 = decorationVec.offset(0, i, 0)
              chunk.setBlockType(decorationVec2, registry.blocksByName.kelp_plant.id)
            }
            const decorationVec2 = decorationVec.offset(0, height - 1, 0)
            chunk.setBlockType(decorationVec2, registry.blocksByName.kelp.id)
          }
        } else if (surfaceBlock === registry.blocksByName.grass_block?.id ?? registry.blocksByName.grass.id) { // Above water decorations: tall grass, double tall grass, flowers
          if (seedRand(20) === 0) { // Tall grass
            chunk.setBlockType(decorationVec, registry.blocksByName.tallgrass?.id ?? registry.blocksByName.grass.id)
            if (registry.supportFeature('theFlattening')) chunk.setBlockData(decorationVec, 0)
          } else if ('tall_grass' in registry.blocksByName && seedRand(40) === 0) { // Double tall grass
            const decorationVec2 = decorationVec.offset(0, 1, 0)
            chunk.setBlockType(decorationVec, registry.blocksByName.tall_grass?.id)
            chunk.setBlockType(decorationVec2, registry.blocksByName.tall_grass?.id)
            if (registry.supportFeature('theFlattening')) {
              chunk.setBlockData(decorationVec, 1)
              chunk.setBlockData(decorationVec2, 0)
            }
          } else if (seedRand(50) === 0) { // Flowers
            const flower = registry.blocksByName[seedRand(2) === 0 ? 'dandelion' : 'poppy']
            chunk.setBlockType(decorationVec, flower.id)
          }
        } else if (surfaceBlock === registry.blocksByName.sand.id) { // Above water decorations: sugar cane, cactus, dead bushes
          if (seedRand(50) === 0 && [[-1, 0, 0], [0, 0, -1], [0, 0, 1], [1, 0, 0]].every(offset => chunk.getBlockType(decorationVec.offset(...offset)) === registry.blocksByName.air.id)) {
            const height = seedRand(3) + 1
            for (let i = 0; i < height; i++) {
              const decorationVec2 = decorationVec.offset(0, i, 0)
              chunk.setBlockType(decorationVec2, registry.blocksByName.cactus.id)
              if (registry.supportFeature('theFlattening')) chunk.setBlockData(decorationVec2, i === height - 1 ? 1 : 0)
            }
          } else if (seedRand(20) == 0 && [[-1, 0, -1], [-1, 0, 0], [-1, 0, 1], [0, 0, -1], [0, 0, 1], [1, 0, -1], [1, 0, 0], [1, 0, 1]].some(offset => chunk.getBlockType(surfaceVec.offset(...offset)) === registry.blocksByName.water.id)) { // Sugar cane
            const height = seedRand(3) + 1
            for (let i = 0; i < height; i++) {
              const decorationVec2 = decorationVec.offset(0, i, 0)
              chunk.setBlockType(decorationVec2, registry.blocksByName.reeds?.id ?? registry.blocksByName.sugar_cane.id)
            }
          }
        }
      }
    }
    return chunk
  }
  return generateSimpleChunk
}

module.exports = generation
