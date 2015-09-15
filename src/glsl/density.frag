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

  for (int i = -1; i <= 1; ++i) {
    float nbCellZ = cell.z + float(i);
    vec2 zCoord = vec2(mod(nbCellZ, {{zSize}}), floor(nbCellZ / {{zSize}}));

    for (int j = -1; j <= 1; ++j)
      for (int k = -1; k <= 1; ++k) {
        vec3 nbCell = cell + vec3(float(k), float(j), float(i));

        if (any(equal(nbCell, vec3(-1.))) || any(equal(nbCell, vec3(nCells))))
            continue;

        vec2 cellCoord = (nbCell.xy + {{xySize}}*zCoord + vec2(.5))/{{totalSize}};
        vec4 nbPosition = texture2D(meanPositions, cellCoord);

        if (nbPosition.w < 1.)
          continue;

        vec3 r = position - nbPosition.xyz / nbPosition.w;
        float r2 = dot(r, r);
        float dr = max(ratio2 - r2, 0.);
        density += nbPosition.w * dr*dr*dr;
      }
  }

  gl_FragColor = vec4(0., 0., 0., density * mass * wDefault);
}
