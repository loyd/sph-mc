precision highp float;
precision highp sampler2D;

uniform sampler2D positions;
uniform sampler2D meanPositions;
uniform float nCells;
uniform float mass;
uniform float ratio2;
uniform float wDefault;

varying vec2 coord;


void main(void) {
  vec3 position = texture2D(positions, coord).xyz;
  vec3 cell = floor(position * nCells);

  float density = 0.;

  for (int i = -1; i < 1; ++i) {
    for (int j = -1; j < 1; ++j) {
      for (int k = -1; k < 1; ++k) {
        vec3 nbCell = cell + vec3(float(i), float(j), float(k));
        vec2 zCoord = vec2(mod(cell.z, {{zSize}}), floor(cell.z / {{zSize}}));
        vec2 cellCoord = 2. / {{totalSize}} * (cell.xy + {{xySize}}*zCoord + vec2(.5)) - vec2(1.);

        vec4 nbPosition = texture2D(meanPositions, cellCoord);
        if (nbPosition.w >= 1.) {
          vec3 r = position - nbPosition.xyz / nbPosition.w;
          float r2 = dot(r, r);
          float dr = max(ratio2 - r2, 0.);
          density += nbPosition.w * dr*dr*dr;
        }
      }
    }
  }

  gl_FragColor = vec4(0., 0., 0., density * mass * wDefault);
}
