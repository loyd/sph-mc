precision highp float;
precision highp sampler2D;

uniform sampler2D cells;

const float dXY = 1. / {{totalSize}};
const float dZ = 1. / {{zSize}};

vec2 subZ(vec2 cell2D) {
  return vec2(mod(cell2D.x + 1. - dZ, 1.), cell2D.y - dZ * step(cell2D.x, dZ));
}

void main(void) {
  vec2 cell2D = gl_FragCoord.xy * dXY;

  float value = texture2D(cells, cell2D).s
              + texture2D(cells, subZ(cell2D + vec2(-dXY, -dXY))).s
              + texture2D(cells, subZ(cell2D + vec2( 0., -dXY))).s
              + texture2D(cells, subZ(cell2D + vec2( 0.,  0.))).s
              + texture2D(cells, subZ(cell2D + vec2(-dXY,  0.))).s
              + texture2D(cells, cell2D + vec2(-dXY)).s
              + texture2D(cells, cell2D + vec2( 0., -dXY)).s
              + texture2D(cells, cell2D + vec2(-dXY,  0.)).s;

  gl_FragColor = vec4(value * .125, 0., 0., 1.);
}
