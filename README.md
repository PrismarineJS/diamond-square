# Diamond-square
[![NPM version](https://img.shields.io/npm/v/diamond-square.svg)](http://npmjs.com/package/diamond-square)
[![Build Status](https://github.com/PrismarineJS/diamond-square/workflows/CI/badge.svg)](https://github.com/PrismarineJS/diamond-square/actions?query=workflow%3A%22CI%22)

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

### 1.5.0
* [Update publish.yml](https://github.com/PrismarineJS/diamond-square/commit/4e5681e3d12fbeca9f809c472ecbb148689fabaf) (thanks @rom1504)

### 1.4.0
* [`tallgrass` was renamed to `tall_grass` (#15)](https://github.com/PrismarineJS/diamond-square/commit/ded51456c73243088f721ad5f8665ff16b2aab8c) (thanks @Pandapip1)
* [Add command gh workflow allowing to use release command in comments (#14)](https://github.com/PrismarineJS/diamond-square/commit/57bbf99d116cb787f8c99c069c7aa2ad49377a94) (thanks @rom1504)
* [Update to node 18.0.0 (#13)](https://github.com/PrismarineJS/diamond-square/commit/204d092acb33acfe73e7d0ef5d5bbcec0847b596) (thanks @rom1504)
* [Bump standard from 16.0.4 to 17.0.0 (#12)](https://github.com/PrismarineJS/diamond-square/commit/88a291d97b765bb4533c486c6dae6411283a309b) (thanks @dependabot[bot])

### 1.3.0

* Bump mcdata

### 1.2.0

* add 1.13 support (thanks @Deudly)

### 1.1.0

* convert to standard + make api compatible with multiple versions

### 1.0.0

* update dependencies

### 0.0.0

* first version, imported from flying-squid, works
