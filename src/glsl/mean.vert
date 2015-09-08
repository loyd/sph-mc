precision highp sampler2D;

attribute vec2 coord;

uniform sampler2D positions;
uniform sampler2D velDens;
uniform float nCells;

varying vec2 tcoord;

void main(void) {
  vec3 position = texture2D(positions, coord).xyz;

  vec3 cell = floor(position * nCells);
  vec2 zCoord = vec2(mod(cell.z, {{zSize}}), floor(cell.z / {{zSize}}));
  vec2 cellCoord = 2. / {{xySize}}*{{zSize}} * (cell.xy + {{xySize}}*zCoord + vec2(.5)) - vec2(1.);

  tcoord = coord;
  gl_PointSize = 1.;
  gl_Position = vec4(cellCoord, 0., 1.0);
}
