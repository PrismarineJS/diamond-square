const World = require('prismarine-world')
const Vec3 = require('vec3').Vec3

const diamondSquare = require('diamond-square')({seed: Math.floor(Math.random() * Math.pow(2, 31))})
const world = new World(diamondSquare)

world.getBlock(new Vec3(3, 50, 3)).then(block => console.log(JSON.stringify(block, null, 2)))
