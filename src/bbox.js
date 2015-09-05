export default class BBox {
  constructor(width, height, depth) {
    this.width = width;
    this.height = height;
    this.depth = depth;

    let hw = width/2,
        hh = height/2,
        hd = depth/2;

    this.corners = [
      -hw,-hh,-hd,   hw,-hh,-hd,
       hw,-hh,-hd,   hw, hh,-hd,
       hw, hh,-hd,  -hw, hh,-hd,
      -hw, hh,-hd,  -hw,-hh,-hd,
      -hw,-hh, hd,   hw,-hh, hd,
       hw,-hh, hd,   hw, hh, hd,
       hw, hh, hd,  -hw, hh, hd,
      -hw, hh, hd,  -hw,-hh, hd,
      -hw,-hh,-hd,  -hw,-hh, hd,
       hw,-hh,-hd,   hw,-hh, hd,
       hw, hh,-hd,   hw, hh, hd,
      -hw, hh,-hd,  -hw, hh, hd
    ];
  }
}
