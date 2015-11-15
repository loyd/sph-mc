precision mediump float;
precision mediump sampler2D;

uniform sampler2D cells;

float activity(vec3 cell) {
  vec2 zCoord = vec2(mod(cell.z, {{zSize}}), floor(cell.z / {{zSize}}));
  vec2 cellCoord = (cell.xy + {{xySize}}*zCoord + vec2(.5)) / {{totalSize}};
  return texture2D(cells, cellCoord).s;
}

void main(void) {
  vec2 cell2D = floor(gl_FragCoord.xy);
  vec3 cell = vec3(mod(cell2D, {{xySize}}), dot(floor(cell2D / {{xySize}}), vec2(1., {{zSize}})));

  float val = activity(cell) * 2.
            + activity(cell + vec3(-1., 0., 0.))
            + activity(cell + vec3(0., -1., 0.))
            + activity(cell + vec3(1., 0., 0.))
            + activity(cell + vec3(0., 1., 0.))
            + activity(cell + vec3(0., 0., -1.))
            + activity(cell + vec3(0., 0., 1.));

  gl_FragColor = vec4(val / 8.);
}
