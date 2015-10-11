attribute vec2 texCoord;

varying vec2 coord;

void main(void) {
  coord = texCoord;
  gl_Position = vec4(2. * coord - vec2(1.), 0., 1.);
}
