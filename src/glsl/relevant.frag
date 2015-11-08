precision mediump float;
precision mediump sampler2D;

uniform sampler2D nodes;
uniform float range;

float potential(vec3 cell) {
  vec2 zCoord = vec2(mod(cell.z, {{zSize}}), floor(cell.z / {{zSize}}));
  vec2 cellCoord = (cell.xy + {{xySize}}*zCoord + vec2(.5)) / {{totalSize}};
  return step(texture2D(nodes, cellCoord).s, range);
}

void main(void) {
  vec2 cell2D = floor(gl_FragCoord.xy);
  vec3 cell = vec3(mod(cell2D, {{xySize}}), dot(floor(cell2D / {{xySize}}), vec2(1., {{zSize}})));

  float case = potential(cell)
      +   2. * potential(cell + vec3(1., 0., 0.))
      +   4. * potential(cell + vec3(1., 1., 0.))
      +   8. * potential(cell + vec3(0., 1., 0.))
      +  16. * potential(cell + vec3(0., 0., 1.))
      +  32. * potential(cell + vec3(1., 0., 1.))
      +  64. * potential(cell + vec3(1., 1., 1.))
      + 128. * potential(cell + vec3(0., 1., 1.));

  case *= step(case, 254.);

  gl_FragColor = vec4(step(-case, -.5), 0., 0., case);
}
