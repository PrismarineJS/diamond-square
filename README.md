# Diamond-square
[![NPM version](https://img.shields.io/npm/v/diamond-square.svg)](http://npmjs.com/package/diamond-square)
[![Build Status](https://circleci.com/gh/PrismarineJS/diamond-square/tree/master.svg?style=shield)](https://circleci.com/gh/PrismarineJS/diamond-square/tree/master)

A diamond square minecraft generation

## Usage

```js
const World = require('prismarine-world')('1.12')
const Vec3 = require('vec3').Vec3

const diamondSquare = require('diamond-square')({version: '1.12', seed: Math.floor(Math.random() * Math.pow(2, 31))})
const world = new World(diamondSquare)

world.getBlock(new Vec3(3, 50, 3)).then(block => console.log(JSON.stringify(block, null, 2)))
```

## Contributors

* @JWo1F did the initial code for diamond-square in flying-squid
* @demipixel
* @rom1504

## History

### 1.0.0

* update dependencies

### 0.0.0

* first version, imported from flying-squid, works