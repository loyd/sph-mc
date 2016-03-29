#version 300 es

//#TODO: rename this!
in vec3 aposition;

uniform vec3 center;
uniform mat4 vp;

out vec3 position;
out vec3 normal;
out vec2 coord;

void main(void) {
  position = center + aposition;
  normal = aposition;
  gl_Position = vp * vec4(position, 1.);
}
