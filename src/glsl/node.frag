precision highp float;
precision highp sampler2D;

uniform sampler2D cells;

float hasParticles(vec3 cell) {
  vec2 zCoord = vec2(mod(cell.z, {{zSize}}), floor(cell.z / {{zSize}}));
  vec2 cellCoord = (cell.xy + {{xySize}}*zCoord + vec2(.5)) / {{totalSize}};
  return texture2D(cells, cellCoord).s;
}

void main(void) {
  //#TODO: what about 2d -> 2d instead of 2d -> 3d -> 2d?
  vec2 cell2D = floor(gl_FragCoord.xy);
  vec3 cell = vec3(mod(cell2D, {{xySize}}), dot(floor(cell2D / {{xySize}}), vec2(1., {{zSize}})));

  float value = hasParticles(cell)
              + hasParticles(cell + vec3(-1., -1., -1.))
              + hasParticles(cell + vec3( 0., -1., -1.))
              + hasParticles(cell + vec3( 0.,  0., -1.))
              + hasParticles(cell + vec3(-1.,  0., -1.))
              + hasParticles(cell + vec3(-1., -1.,  0.))
              + hasParticles(cell + vec3( 0., -1.,  0.))
              + hasParticles(cell + vec3(-1.,  0.,  0.));

  gl_FragColor = vec4(value * .125, 0., 0., 1.);
}
