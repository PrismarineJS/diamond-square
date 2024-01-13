'use strict'

const { Vec3 } = require('vec3')
const rand = require('random-seed')

class Perlin {
  constructor (seed, numOctaves = 4) {
    // public fields
    this.numOctaves = numOctaves
    this.seed = seed
    this.rng = rand.create(seed)
    this.xSinAmplitudes = []
    this.xSinOffsets = []
    this.ySinAmplitudes = []
    this.ySinOffsets = []

    for (let i = 0; i < numOctaves; i++) {
      const power = Math.pow(Math.E, i)

      this.xSinAmplitudes.push((i + 1))
      this.xSinOffsets.push(this.rng(1) * power)

      this.ySinAmplitudes.push((i + 1))
      this.ySinOffsets.push(this.rng(1) * power)
    }
  }

  // public methods
  value (x, y) {
    if (typeof x === 'string') x = parseInt(x)
    if (typeof y === 'string') y = parseInt(y)

    let value = 0.0
    for (let i = 0; i < this.numOctaves; i++) {
      const power = Math.pow(Math.E, i + 1)
      value += this.xSinAmplitudes[i] * Math.sin((x - this.xSinOffsets[i]) / power)
      value += this.ySinAmplitudes[i] * Math.sin((y - this.ySinOffsets[i]) / power)
    }
    return 1 / (1 + Math.pow(Math.E, value / 100))
  }
}

class Worley {
  constructor (density, seed) {
    // public fields
    this.expectedPoints = 10

    this.batchSize = Math.ceil(Math.sqrt(this.expectedPoints / density) / 2) * 2
    this.density = density
    this.seed = seed

    // private fields
    this.pointCache = {}
  }

  // public methods
  value (x, y) {
    return this._closestDistanceAndPoint(x, y)[1]
  }

  pointIndex (x, y) {
    return this._closestDistanceAndPoint(x, y)[0]
  }

  // private methods
  _closestDistanceAndPoint (x, y) {
    // Get current batch
    const batchX = x - x % this.batchSize
    const batchY = y - y % this.batchSize
    // Make list of points
    const points = []
    for (const [centerX, centerY] of [
      [batchX - this.batchSize, batchY - this.batchSize], [batchX, batchY - this.batchSize], [batchX + this.batchSize, batchX - this.batchSize],
      [batchX - this.batchSize, batchY], [batchX, batchY], [batchX + this.batchSize, batchY],
      [batchX - this.batchSize, batchY + this.batchSize], [batchX, batchY + this.batchSize], [batchX + this.batchSize, batchX + this.batchSize]
    ]) {
      if (!this.pointCache?.[centerX]?.[centerY]) {
        if (!(centerX in this.pointCache)) this.pointCache[centerX] = {}
        const thisPoints = []
        const centeredRng = rand.create(`${this.seed}:${centerX}:${centerY}`)
        let numPointsRandomNumber = centeredRng.random() / Math.pow(Math.E, -this.expectedPoints)
        let numPoints
        let curFactorial = 1
        let curExp = 1
        for (let i = 0; true; i++) {
          if (i !== 0) {
            curFactorial *= i
            curExp *= this.expectedPoints
          }
          numPointsRandomNumber -= curExp / curFactorial
          if (numPointsRandomNumber <= 0) {
            numPoints = i
            break
          }
        }
        for (let i = 0; i < numPoints; i++) {
          thisPoints.push([
            centerX + centeredRng.intBetween(-this.batchSize / 2, this.batchSize / 2),
            centerY + centeredRng.intBetween(-this.batchSize / 2, this.batchSize / 2)
          ])
        }
        this.pointCache[centerX][centerY] = thisPoints
      }
      for (const point of this.pointCache[centerX][centerY]) {
        points.push(point)
      }
    }
    // Now, get closest point
    let closestPointIdx = -1
    let minSqDist = Infinity
    for (const pointXY of points) {
      const dx = pointXY[0] - x
      const dy = pointXY[1] - y
      const sqDist = dx * dx + dy * dy
      if (sqDist < minSqDist) {
        minSqDist = sqDist
        closestPointIdx = pointXY[0] + pointXY[1] // TODO: Better hash
      }
    }
    // Now, get maximum distance
    let maxDist = 0
    for (let i = 0; i < points.length; i++) {
      const point1X = points[i][0]
      const point1Y = points[i][1]
      for (let j = 0; j < i; j++) {
        const point2X = points[j][0]
        const point2Y = points[j][1]
        const dx = point1X - point2X
        const dy = point1Y - point2Y
        const sqDist = dx * dx + dy * dy
        if (maxDist < sqDist) {
          maxDist = sqDist
        }
      }
    }
    return [closestPointIdx, minSqDist / Math.sqrt(maxDist)]
  }
}

function duplicateArr (arr, times) {
  return Array(times).fill([...arr]).reduce((a, b) => a.concat(b))
}

function generation ({ version = '1.8', seed, worldHeight = 80, waterline = 20, size = 10000000, roughness = null } = {}) {
  const Chunk = require('prismarine-chunk')(version)
  const registry = require('prismarine-registry')(version)

  // Selected empirically
  if (roughness === null) roughness = size / 500
  const seedRand = rand.create(seed)
  const maxInt = 2 ^ 53 - 1
  const surfaceNoise = new Perlin(seedRand(0, maxInt))
  const soilNoise = new Perlin(seedRand(0, maxInt))
  const bedrockNoise = new Perlin(seedRand(0, maxInt))
  const biomeNoise = new Worley(0.00001, seedRand(0, maxInt))

  const biomes = [
    ...duplicateArr(['plains'], 15),
    ...duplicateArr(['forest'], 20),
    ...duplicateArr(['desert'], 10)
  ]

  function generateSimpleChunk (chunkX, chunkZ) {
    const chunk = new Chunk()
    const placements = rand.create(seed + ':' + chunkX + ':' + chunkZ)
    const worldX = chunkX * 16 + size / 2
    const worldZ = chunkZ * 16 + size / 2

    const levels = []
    for (let x = 0; x < 16; x++) {
      levels.push([])
      for (let z = 0; z < 16; z++) {
        const surfaceNoiseValue = surfaceNoise.value(worldX + x, worldZ + z)
        const bedrockNoiseValue = bedrockNoise.value(worldX + x, worldZ + z)
        const soilNoiseValue = soilNoise.value(worldX + x, worldZ + z)
        const biomeNoiseIndex = biomeNoise.pointIndex(worldX + x, worldZ + z)

        let biome = biomes[biomeNoiseIndex % biomes.length]

        const bedrock = Math.floor(bedrockNoiseValue * 5)
        let surface = Math.floor(surfaceNoiseValue * worldHeight)
        const soil = surface - 2 - Math.floor(soilNoiseValue * 3)
        let currentWaterline = waterline

        if (surface - waterline < 2) {
          biome = 'ocean'
        }

        levels[x].push({
          surface,
          bedrock,
          soil,
          biome,
          currentWaterline
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
        const { bedrock, soil, surface, currentWaterline, biome } = levels[x][z]
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
          switch (biome) {
            case 'river':
            case 'ocean':
            case 'desert':
              chunk.setBlockType(vec, registry.blocksByName.sand.id)
              break
            case 'mountains':
              chunk.setBlockType(vec, registry.blocksByName.stone.id)
              break
            case 'forest':
            case 'plains':
              chunk.setBlockType(vec, registry.blocksByName.dirt.id)
              if (registry.supportFeature('theFlattening')) chunk.setBlockData(vec, 1)
              break
            default:
              throw new Error('Unknown biome: ' + biome)
          }
        }
        // Surface Layer
        switch (biome) {
          case 'river':
          case 'ocean':
          case 'desert':
            chunk.setBlockType(new Vec3(x, surface, z), registry.blocksByName.sand.id)
            break
          case 'mountains':
            chunk.setBlockType(new Vec3(x, surface, z), registry.blocksByName.stone.id)
            break
          case 'forest':
          case 'plains':
            chunk.setBlockType(new Vec3(x, surface, z), registry.blocksByName.grass_block?.id ?? registry.blocksByName.grass.id)
            if (registry.supportFeature('theFlattening')) chunk.setBlockData(new Vec3(x, surface, z), 1)
            break
          default:
            throw new Error('Unknown biome: ' + biome)
        }
        // Water Layer
        for (let y = surface + 1; y <= currentWaterline; y++) {
          chunk.setBlockType(new Vec3(x, y, z), registry.blocksByName.water.id)
        }
      }
    }
    // Decorations: grass, flowers, sugar cane, cactus, dead bushes, kelp, seagrass, tall seagrass, tall grass, double tall grass, etc...
    for (let x = 0; x < 16; x++) {
      for (let z = 0; z < 16; z++) {
        const { surface, biome, currentWaterline } = levels[x][z]
        const surfaceVec = new Vec3(x, surface, z)
        const decorationVec = new Vec3(x, surface + 1, z)
        const waterDepth = Math.max(currentWaterline - surface, 0)
        if (['forest', 'plains'].includes('biome') && placements(20) === 0) { // Grass
          chunk.setBlockType(decorationVec, registry.blocksByName.tallgrass?.id ?? registry.blocksByName.grass.id)
          if (registry.supportFeature('theFlattening')) chunk.setBlockData(decorationVec, 0)
        } else if (['forest', 'plains'].includes(biome) && placements(50) === 0) { // Flowers
          const flower = registry.blocksByName[placements(2) === 0 ? 'dandelion' : 'poppy']
          chunk.setBlockType(decorationVec, flower.id)
        } else if (['desert'].includes(biome) && placements(50) === 0) { // Dead bushes
          chunk.setBlockType(decorationVec, registry.blocksByName.dead_bush.id)
        } else if ('seagrass' in registry.blocksByName && ['river', 'ocean'].includes(biome) && waterDepth >= 2 && placements(20) === 0) { // Seagrass
          chunk.setBlockType(decorationVec, registry.blocksByName.seagrass.id)
          if (registry.supportFeature('theFlattening')) chunk.setBlockData(decorationVec, 1)
        } else if ('tall_grass' in registry.blocksByName && ['forest', 'plains'].includes(biome) && placements(40) === 0) { // Double tall grass
          const decorationVec2 = decorationVec.offset(0, 1, 0)
          chunk.setBlockType(decorationVec, registry.blocksByName.tall_grass?.id)
          chunk.setBlockType(decorationVec2, registry.blocksByName.tall_grass?.id)
          if (registry.supportFeature('theFlattening')) {
            chunk.setBlockData(decorationVec, 1)
            chunk.setBlockData(decorationVec2, 0)
          }
        } else if ('tall_seagrass' in registry.blocksByName && ['river', 'ocean'].includes(biome) && waterDepth >= 3 && placements(40) === 0) { // Double tall seagrass
          const decorationVec2 = decorationVec.offset(0, 1, 0)
          chunk.setBlockType(decorationVec, registry.blocksByName.tall_seagrass?.id)
          chunk.setBlockType(decorationVec2, registry.blocksByName.tall_seagrass?.id)
          if (registry.supportFeature('theFlattening')) {
            chunk.setBlockData(decorationVec, 1)
            chunk.setBlockData(decorationVec2, 0)
          }
        } else if (['river', 'ocean'].includes(biome) && !waterDepth && [[-1, 0, 0], [0, 0, -1], [0, 0, 1], [1, 0, 0]].some(offset => chunk.getBlockType(surfaceVec.offset(...offset)) === registry.blocksByName.water.id) && placements(20) === 0) { // Sugar cane
          const height = placements(3) + 1
          for (let i = 0; i < height; i++) {
            const decorationVec2 = decorationVec.offset(0, i, 0)
            chunk.setBlockType(decorationVec2, registry.blocksByName.reeds?.id ?? registry.blocksByName.sugar_cane.id)
          }
        } else if (['desert'].includes(biome) && !waterDepth && [[-1, 0, -1], [-1, 0, 0], [-1, 0, 1], [0, 0, -1], [0, 0, 1], [1, 0, -1], [1, 0, 0], [1, 0, 1]].every(offset => chunk.getBlockType(decorationVec.offset(...offset)) === registry.blocksByName.air.id) && placements(50) === 0) { // Cactus
          const height = placements(3) + 1
          for (let i = 0; i < height; i++) {
            const decorationVec2 = decorationVec.offset(0, i, 0)
            chunk.setBlockType(decorationVec2, registry.blocksByName.cactus.id)
            if (registry.supportFeature('theFlattening')) chunk.setBlockData(decorationVec2, i === height - 1 ? 1 : 0)
          }
        } else if ('kelp' in registry.blocksByName && ['ocean'].includes(biome) && waterDepth >= 3 && placements(40) === 0) { // Kelp
          const height = placements(waterDepth - 3) + 2
          for (let i = 0; i < height - 1; i++) {
            const decorationVec2 = decorationVec.offset(0, i, 0)
            chunk.setBlockType(decorationVec2, registry.blocksByName.kelp_plant.id)
          }
          const decorationVec2 = decorationVec.offset(0, height - 1, 0)
          chunk.setBlockType(decorationVec2, registry.blocksByName.kelp.id)
        }
      }
    }
    return chunk
  }
  return generateSimpleChunk
}

module.exports = generation
