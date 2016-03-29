#version 300 es

in vec2 texCoord;
in float index;

flat out float idx;

void main(void) {
  idx = index;
  gl_PointSize = 1.;
  gl_Position = vec4(2. * texCoord - vec2(1.), 0., 1.);
}
