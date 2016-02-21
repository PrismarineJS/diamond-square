# Diamond-square
A diamond square minecraft generation

## Usage

```js
var World=require("prismarine-world");
const Vec3 = require('vec3').Vec3;

var diamondSquare=require("diamond-square")({seed:Math.floor(Math.random()*Math.pow(2, 31))});
var world=new World(diamondSquare);

world.getBlock(new Vec3(3,50,3)).then(block => console.log(JSON.stringify(block,null,2)));
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