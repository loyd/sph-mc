#version 300 es

in vec3 aposition;
in vec3 anormal;
in vec2 texCoord;

uniform mat4 mvp;

out vec3 position;
out vec3 normal;
out vec2 coord;

void main(void) {
  position = aposition;
  normal = anormal;
  coord = texCoord;

  gl_Position = mvp * vec4(aposition, 1.);
}
