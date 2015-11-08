attribute float index;
attribute vec2 texCoord;

uniform highp sampler2D vertices[3];
uniform highp sampler2D normals[3];
uniform mat4 viewProj;

varying vec3 normal;

void main(void) {
  int i = int(mod(index, 3.));
  vec3 position;

  if (i == 0) {
    position = texture2D(vertices[0], texCoord).xyz;
    normal = texture2D(normals[0], texCoord).xyz;
  } else if (i == 1) {
    position = texture2D(vertices[1], texCoord).xyz;
    normal = texture2D(normals[1], texCoord).xyz;
  } else {
    position = texture2D(vertices[2], texCoord).xyz;
    normal = texture2D(normals[2], texCoord).xyz;
  }

  gl_Position = viewProj * vec4(position, 1.);
}