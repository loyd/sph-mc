#version 300 es

in vec2 texCoord;

out vec2 coord;

void main(void) {
  coord = texCoord;
  gl_PointSize = 1.;
  gl_Position = vec4(2. * coord - vec2(1.), 0., 1.);
}
