attribute vec3 position;

uniform mat4 viewProj;

varying vec4 color;

void main(void) {
  color = vec4(1.);
  gl_Position = viewProj * vec4(position, 1.);
}
