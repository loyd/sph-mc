#version 300 es

in vec3 position;

uniform mat4 mvp;

void main(void) {
  gl_Position = mvp * vec4(position, 1.);
}
