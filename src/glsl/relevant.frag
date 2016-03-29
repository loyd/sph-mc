#version 300 es

precision highp float;
precision highp sampler2D;

uniform sampler2D nodes;
uniform float isolevel;

const float dXY = 1. / {{totalSize}};
const float dZ = 1. / {{zSize}};

vec2 addZ(vec2 cell2D) {
  float x = mod(cell2D.x - 1. + dZ, 1.);
  return vec2(x, cell2D.y + dZ * step(x, dZ));
}

out vec4 fragColor;

void main(void) {
  vec2 cell2D = gl_FragCoord.xy * dXY;

  float mcCase = step(texture(nodes, cell2D).s, isolevel)
        +   2. * step(texture(nodes, cell2D + vec2(dXY, 0.)).s, isolevel)
        +   4. * step(texture(nodes, cell2D + vec2(dXY, dXY)).s, isolevel)
        +   8. * step(texture(nodes, cell2D + vec2(0., dXY)).s, isolevel)
        +  16. * step(texture(nodes, addZ(cell2D + vec2(0., 0.))).s, isolevel)
        +  32. * step(texture(nodes, addZ(cell2D + vec2(dXY, 0.))).s, isolevel)
        +  64. * step(texture(nodes, addZ(cell2D + vec2(dXY, dXY))).s, isolevel)
        + 128. * step(texture(nodes, addZ(cell2D + vec2(0., dXY))).s, isolevel);

  mcCase *= step(mcCase, 254.);

  fragColor = vec4(step(-mcCase, -.5), 0., 0., mcCase);
}
