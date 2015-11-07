precision mediump float;
precision mediump sampler2D;

uniform sampler2D base;
//#TODO: what about array of levels?
uniform sampler2D pyramid;

varying float idx;

const float invSize = 1./{{totalSize}};
const float invXYSize = 1./{{xySize}};

void main(void) {
  vec2 relPos = vec2(0.);
  vec2 pos = vec2(0.);
  float start = 0.;
  float end = 0.;
  vec4 starts = vec4(0.);
  vec3 ends = vec3(0.);
  float offset = {{totalSize}} - 2.;

  for (int i = 1; i < int({{pyramidLvls}}); ++i) {
    offset -= pow(2., float(i));
    relPos = pos + invSize * vec2(offset, 0.);
    end = start + texture2D(pyramid, relPos).r;
    vec2 pos1 = relPos;
    starts.x= start;
    ends.x = end;
    vec2 pos2 = relPos + vec2(invSize, 0.);
    starts.y = ends.x;
    ends.y = ends.x + texture2D(pyramid, pos2).r;
    vec2 pos3 = relPos + vec2(0., invSize);
    starts.z = ends.y;
    ends.z = ends.y + texture2D(pyramid, pos3).r;
    vec2 pos4 = relPos + vec2(invSize, invSize);
    starts.w = ends.z;
    vec3 mask = vec3(greaterThanEqual(vec3(idx), starts.rgb)) * vec3(lessThan(vec3(idx), ends));
    vec4 m = vec4(mask, 1. - length(mask));
    relPos = m.x * pos1 + m.y * pos2 + m.z * pos3 + m.w * pos4;
    start = m.x * starts.x + m.y * starts.y  + m.z * starts.z + m.w * starts.w;
    pos = relPos - invSize * vec2(offset, 0.);
    pos *= 2.;
  }

  end = start + texture2D(base, pos).r;
  vec2 pos1 = pos;
  starts.x= start;
  ends.x = end;
  vec2 pos2 = pos + vec2(invSize, 0.);
  starts.y = ends.x;
  ends.y = ends.x + texture2D(base, pos2).r;
  vec2 pos3 = pos + vec2(0., invSize);
  starts.z = ends.y;
  ends.z = ends.y + texture2D(base, pos3).r;
  vec2 pos4 = pos + vec2(invSize, invSize);
  starts.w = ends.z;
  vec3 mask = vec3(greaterThanEqual(vec3(idx), starts.rgb)) * vec3(lessThan(vec3(idx), ends));
  vec4 m = vec4(mask, 1. - length(mask));
  pos = m.x * pos1 + m.y * pos2 + m.z * pos3 + m.w * pos4;
  vec2 index = pos * {{totalSize}};

  gl_FragColor = vec4(vec3(mod(index.x, {{xySize}}),
                           mod(index.y, {{xySize}}),
                           {{zSize}}*floor(index.y*invXYSize)+floor(index.x*invXYSize)),
                      texture2D(base, pos).a);
}
