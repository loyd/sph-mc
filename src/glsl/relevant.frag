precision mediump float;
precision mediump sampler2D;

uniform sampler2D nodes;
uniform float range;

vec2 index2D(vec3 cell) {
  vec2 zCoord = vec2(mod(cell.z, {{zSize}}), floor(cell.z / {{zSize}}));
  return (cell.xy + {{xySize}}*zCoord + vec2(.5)) / {{totalSize}};
}

void main(void) {
  vec2 cell2D = floor(gl_FragCoord.xy);
  /*vec3 cell = vec3(mod(cell2D, {{xySize}}), dot(floor(cell2D / {{xySize}}), vec2(1., {{zSize}})));*/
  vec3 cell = vec3(mod(cell2D, {{xySize}}),
                   {{zSize}} * floor(cell2D.y / {{xySize}}) + floor(cell2D.x / {{xySize}}));

  float value = step(texture2D(nodes, index2D(cell)).s, range)
       +   2. * step(texture2D(nodes, index2D(cell + vec3(1., 0., 0.))).s, range)
       +   4. * step(texture2D(nodes, index2D(cell + vec3(1., 1., 0.))).s, range)
       +   8. * step(texture2D(nodes, index2D(cell + vec3(0., 1., 0.))).s, range)
       +  16. * step(texture2D(nodes, index2D(cell + vec3(0., 0., 1.))).s, range)
       +  32. * step(texture2D(nodes, index2D(cell + vec3(1., 0., 1.))).s, range)
       +  64. * step(texture2D(nodes, index2D(cell + vec3(1., 1., 1.))).s, range)
       + 128. * step(texture2D(nodes, index2D(cell + vec3(0., 1., 1.))).s, range);

  value *= step(value, 254.);

  gl_FragColor = vec4(step(-value, -.5) * vec3(1.), value);
}
