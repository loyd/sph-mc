#extension GL_EXT_draw_buffers: require
precision highp float;
precision highp sampler2D;

uniform float cellSize;
uniform float range;
uniform sampler2D potentials;
uniform sampler2D traversal;
uniform sampler2D mcCases;

varying float idx;

const float invSize = 1./{{totalSize}};

float potential(vec3 cell) {
  vec2 zCoord = vec2(mod(cell.z, {{zSize}}), floor(cell.z / {{zSize}}));
  vec2 coord = invSize * (cell.xy + {{xySize}}*zCoord + vec2(.5));
  return texture2D(potentials, coord).s;
}

void triangleData(float index, vec3 cell, out vec3 pos, out vec3 norm, out float mcIdx) {
  mcIdx = texture2D(mcCases, vec2(mod(index, 64.) + .5, floor(index / 64.) + .5) / 64.).s;

  vec4 m0 = vec4(equal(vec4(mcIdx), vec4(0., 1., 2., 3.)));
  vec4 m1 = vec4(equal(vec4(mcIdx), vec4(4., 5., 6., 7.)));
  vec4 m2 = vec4(equal(vec4(mcIdx), vec4(8., 9., 10., 11.)));

  vec4 m0pm2 = m0 + m2;
  vec4 m1pm2 = m1 + m2.yzwx;

  vec3 b0 = cell + vec3(m0pm2.yw + m0pm2.zz, m1.x + m1.w) + m1.ywy + m1.zzz;
  vec3 b1 = cell + vec3(m0.xz + m0.yy, m1pm2.z + m1pm2.w) + m1pm2.xzx + m1pm2.yyy;

  float n0 = potential(b0);
  float n1 = potential(b1);

  vec2 diff = vec2(range - n0, n1 - n0);
  vec3 mult = vec3(lessThan(abs(vec3(diff.x, range - n1, -diff.y)), vec3(0.)));

  pos = (mult.x + mult.z)*b0 + mult.y*b1 + (1. - dot(mult, mult)) * mix(b0, b1, diff.x/diff.y);
  pos = pos*cellSize + vec3(-cellSize);

  vec3 norm0 = normalize(vec3(n0) - vec3(potential(b0 + vec3(1., 0., 0.)),
                                         potential(b0 + vec3(0., 1., 0.)),
                                         potential(b0 + vec3(0., 0., 1.))));

  vec3 norm1 = normalize(vec3(n1) - vec3(potential(b1 + vec3(1., 0., 0.)),
                                         potential(b1 + vec3(0., 1., 0.)),
                                         potential(b1 + vec3(0., 0., 1.))));

  norm = mix(norm0, norm1, n1 / (n0 + n1));
}

void main(void) {
  float traversalIdx = floor(idx * .25);
  vec4 data = texture2D(traversal, vec2(mod(traversalIdx, {{totalSize}}) + .5,
                                        floor(traversalIdx * invSize) + .5) * invSize);
  float initIndex = 12. * data.w + 3. * mod(idx, 4.);

  float mcIdx = 0.;
  vec3 pos = vec3(0.);
  vec3 norm = vec3(0.);

  triangleData(initIndex, data.xyz, pos, norm, mcIdx);
  gl_FragData[0] = vec4(pos, mcIdx);
  gl_FragData[3] = vec4(norm, 1.);

  triangleData(initIndex + 1., data.xyz, pos, norm, mcIdx);
  gl_FragData[1] = vec4(pos, 1.);
  gl_FragData[4] = vec4(norm, 1.);

  triangleData(initIndex + 2., data.xyz, pos, norm, mcIdx);
  gl_FragData[2] = vec4(pos, 1.);
  gl_FragData[5] = vec4(norm, 1.);
}
