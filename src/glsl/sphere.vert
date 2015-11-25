attribute vec3 position;

uniform mat4 mvp;

varying vec3 normal;

void main(void) {
  normal = position;
  gl_Position = mvp * vec4(position, 1.);
}
