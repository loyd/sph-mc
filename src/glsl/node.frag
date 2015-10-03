precision highp float;
precision highp sampler2D;

uniform sampler2D activity;

vec2 index2D(vec3 cell) {
  vec2 zCoord = vec2(mod(cell.z, {{zSize}}), floor(cell.z / {{zSize}}));
  return (cell.xy + {{xySize}}*zCoord + vec2(.5))/{{totalSize}};
}

void main(void) {
  vec2 cell2D = floor(gl_FragCoord.xy);
  vec3 cell = vec3(mod(cell2D.x, {{xySize}}),
                   mod(cell2D.y, {{xySize}}),
                   {{zSize}} * floor(cell2D.y / {{xySize}}) + floor(cell2D.x / {{xySize}}));

  float value = .125 * (
    texture2D(activity, index2D(cell + vec3(-1., -1., -1.))).s +
    texture2D(activity, index2D(cell + vec3( 0., -1., -1.))).s +
    texture2D(activity, index2D(cell + vec3( 0.,  0., -1.))).s +
    texture2D(activity, index2D(cell + vec3(-1.,  0., -1.))).s +
    texture2D(activity, index2D(cell + vec3(-1., -1.,  0.))).s +
    texture2D(activity, index2D(cell + vec3( 0., -1.,  0.))).s +
    texture2D(activity, index2D(cell + vec3( 0.,  0.,  0.))).s +
    texture2D(activity, index2D(cell + vec3(-1.,  0.,  0.))).s
  );

  gl_FragColor = vec4(value, 0., 0., 1.);
}
