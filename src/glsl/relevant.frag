precision mediump float;
precision mediump sampler2D;

uniform sampler2D nodes;
uniform float range;

const float dXY = 1. / {{totalSize}};
const float dZ = 1. / {{zSize}};

vec2 addZ(vec2 cell2D) {
  float x = mod(cell2D.x - 1. + dZ, 1.);
  return vec2(x, cell2D.y + dZ * step(x, dZ));
}

void main(void) {
  vec2 cell2D = gl_FragCoord.xy * dXY;

  float case = step(texture2D(nodes, cell2D).s, range)
      +   2. * step(texture2D(nodes, cell2D + vec2(dXY, 0.)).s, range)
      +   4. * step(texture2D(nodes, cell2D + vec2(dXY, dXY)).s, range)
      +   8. * step(texture2D(nodes, cell2D + vec2(0., dXY)).s, range)
      +  16. * step(texture2D(nodes, addZ(cell2D + vec2(0., 0.))).s, range)
      +  32. * step(texture2D(nodes, addZ(cell2D + vec2(dXY, 0.))).s, range)
      +  64. * step(texture2D(nodes, addZ(cell2D + vec2(dXY, dXY))).s, range)
      + 128. * step(texture2D(nodes, addZ(cell2D + vec2(0., dXY))).s, range);

  case *= step(case, 254.);

  gl_FragColor = vec4(step(-case, -.5), 0., 0., case);
}
