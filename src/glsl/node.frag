precision highp float;
precision highp sampler2D;

uniform sampler2D cells;

float hasParticles(vec3 cell) {
  vec2 zCoord = vec2(mod(cell.z, {{zSize}}), floor(cell.z / {{zSize}}));
  vec2 cellCoord = (cell.xy + {{xySize}}*zCoord + vec2(.5)) / {{totalSize}};
  return sign(texture2D(cells, cellCoord).w);
}

void main(void) {
  vec2 cell2D = floor(gl_FragCoord.xy);
  vec3 cell = vec3(mod(cell2D, {{xySize}}),
      {{zSize}} * floor(cell2D.y / {{xySize}}) + floor(cell2D.x / {{xySize}}));

  float value = .125 * (
    hasParticles(cell + vec3(-1., -1., -1.)) +
    hasParticles(cell + vec3( 0., -1., -1.)) +
    hasParticles(cell + vec3( 0.,  0., -1.)) +
    hasParticles(cell + vec3(-1.,  0., -1.)) +
    hasParticles(cell + vec3(-1., -1.,  0.)) +
    hasParticles(cell + vec3( 0., -1.,  0.)) +
    hasParticles(cell + vec3( 0.,  0.,  0.)) +
    hasParticles(cell + vec3(-1.,  0.,  0.))
  );

  gl_FragColor = vec4(value, 0., 0., 1.);
}
