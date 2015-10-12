attribute vec2 texCoord;
attribute float index;

varying float idx;

void main(void) {
  idx = index;
  gl_Position = vec4(2. * texCoord - vec2(1.), 0., 1.);
}
