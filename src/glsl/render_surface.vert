#version 300 es

in float index;
in vec2 texCoord;

uniform highp sampler2D vertices[3];
uniform highp sampler2D normals[3];
uniform mat4 mvp;

out vec3 position;
out vec3 normal;
out vec2 coord;

void main(void) {
  int i = int(mod(index, 3.));

  if (i == 0) {
    position = texture(vertices[0], texCoord).xyz;
    normal = texture(normals[0], texCoord).xyz;
  } else if (i == 1) {
    position = texture(vertices[1], texCoord).xyz;
    normal = texture(normals[1], texCoord).xyz;
  } else {
    position = texture(vertices[2], texCoord).xyz;
    normal = texture(normals[2], texCoord).xyz;
  }

  coord = texCoord;
  gl_Position = mvp * vec4(position, 1.);
}
