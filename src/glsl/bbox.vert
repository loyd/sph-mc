attribute vec3 position;

uniform mat4 viewProj;

void main(void) {
  gl_Position = viewProj * vec4(position, 1.);
}
