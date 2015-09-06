attribute mediump vec2 coord;

uniform mat4 viewProj;
uniform sampler2D positions;

varying lowp vec4 color;

void main(void) {
  vec4 data = texture2D(positions, coord);
  color = vec4(1.);

  gl_Position = viewProj * data;
  gl_PointSize = 1.;
}
