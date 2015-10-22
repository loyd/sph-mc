#extension GL_EXT_draw_buffers: require
precision highp float;
precision highp sampler2D;

uniform sampler2D potentials;
uniform sampler2D traversal;
uniform sampler2D mcCases;
uniform float range;

varying float idx;

const float invXYSize = 1./{{xySize}};
const float invSize = 1./{{totalSize}};

vec2 index2D(vec3 cell) {
  vec2 zCoord = vec2(mod(cell.z, {{zSize}}), floor(cell.z / {{zSize}}));
  return invSize * (cell.xy + {{xySize}}*zCoord + vec2(.5));
}

void triangleData(float index, vec3 voxelPos, out vec3 pos, out vec3 norm, out float mcIdx) {
  mcIdx = texture2D(mcCases, vec2(mod(index, 64.) + .5, floor(index / 64.) + .5)).r / 64.;

  vec4 m0 = vec4(equal(vec4(mcIdx), vec4(0., 1., 2., 3.)));
  vec4 m1 = vec4(equal(vec4(mcIdx), vec4(4., 5., 6., 7.)));
  vec4 m2 = vec4(equal(vec4(mcIdx), vec4(8., 9., 10., 11.)));

  vec3 b0 = voxelPos + m0.y * vec3(invXYSize, 0., 0.)
                     + m0.z * vec3(invXYSize, invXYSize, 0.)
                     + m0.w * vec3(0., invXYSize, 0.)
                     + m1.x * vec3(0., 0., invXYSize)
                     + m1.y * vec3(invXYSize, 0., invXYSize)
                     + m1.z * vec3(invXYSize, invXYSize, invXYSize)
                     + m1.w * vec3(0., invXYSize, invXYSize)
                     + m2.x * vec3(0., 0., 0.)
                     + m2.y * vec3(invXYSize, 0., 0.)
                     + m2.z * vec3(invXYSize, invXYSize, 0.)
                     + m2.w * vec3(0., invXYSize, 0.);

  vec3 b1 = voxelPos + m0.x * vec3(invXYSize, 0., 0.)
                     + m0.y * vec3(invXYSize, invXYSize, 0.)
                     + m0.z * vec3(0., invXYSize, 0.)
                     + m1.x * vec3(invXYSize, 0., invXYSize)
                     + m1.y * vec3(invXYSize, invXYSize, invXYSize)
                     + m1.z * vec3(0., invXYSize, invXYSize)
                     + m1.w * vec3(0., 0., invXYSize)
                     + m2.x * vec3(0., 0., invXYSize)
                     + m2.y * vec3(invXYSize, 0., invXYSize)
                     + m2.z * vec3(invXYSize, invXYSize, invXYSize)
                     + m2.w * vec3(0., invXYSize, invXYSize);

  float n0 = texture2D(potentials, index2D({{xySize}} * b0)).r;
  float n1 = texture2D(potentials, index2D({{xySize}} * b1)).r;

  vec2 diff = vec2(range - n0, n1 - n0);
  vec3 mult = vec3(lessThan(abs(vec3(diff.x, range - n1, -diff.y)), vec3(0.)));

  pos = mult.x*b0 + mult.y*b1 + mult.z*b0 + (1. - dot(mult, mult)) * mix(b0, b1, diff.x/diff.y);

  vec2 deltaX = index2D({{xySize}} * (b0 + vec3(invXYSize, 0., 0.)));
  vec2 deltaY = index2D({{xySize}} * (b0 + vec3(0., invXYSize, 0.)));
  vec2 deltaZ = index2D({{xySize}} * (b0 + vec3(0., 0., invXYSize)));

  vec3 norm0 = normalize(vec3(n0 - texture2D(potentials, deltaX).r,
                              n0 - texture2D(potentials, deltaY).r,
                              n0 - texture2D(potentials, deltaZ).r));

  deltaX = index2D({{xySize}} * (b1 + vec3(invXYSize, 0., 0.)));
  deltaY = index2D({{xySize}} * (b1 + vec3(0., invXYSize, 0.)));
  deltaZ = index2D({{xySize}} * (b1 + vec3(0., 0., invXYSize)));

  vec3 norm1 = normalize(vec3(n1 - texture2D(potentials, deltaX).r,
                              n1 - texture2D(potentials, deltaY).r,
                              n1 - texture2D(potentials, deltaZ).r));

  norm = (n0*norm0 + n1*norm1) / (n0 + n1);
}

void main(void) {
  float traversalIdx = floor(idx * .25);
  vec4 data = texture2D(traversal, vec2(mod(traversalIdx, {{totalSize}}) + .5,
                                        floor(traversalIdx * invSize) + .5) * invSize);
  float initIndex = 12. * data.a + 3. * mod(idx, 4.);

  float mcIdx = 0.;
  vec3 pos = vec3(0.);
  vec3 norm = vec3(0.);

  triangleData(initIndex, data.rgb, pos, norm, mcIdx);
  gl_FragData[0] = vec4(pos, mcIdx);
  gl_FragData[3] = vec4(norm, 1.);

  triangleData(initIndex + 1., data.rgb, pos, norm, mcIdx);
  gl_FragData[1] = vec4(pos, 1.);
  gl_FragData[4] = vec4(norm, 1.);

  triangleData(initIndex + 2., data.rgb, pos, norm, mcIdx);
  gl_FragData[2] = vec4(pos, 1.);
  gl_FragData[5] = vec4(norm, 1.);
}
