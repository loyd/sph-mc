attribute vec2 vertex;

void main() {
  gl_Position = vec4(vertex, 0., 1.);
}
