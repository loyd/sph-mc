attribute float index;
attribute vec2 texCoord;

uniform highp sampler2D positions[3];
uniform highp sampler2D normals[3];
uniform mat4 viewProj;

varying vec3 position;
varying vec3 normal;

void main(void) {
  float vertex = mod(index, 3.);

  if (vertex == 0.) {
    position = texture2D(positions[0], texCoord).rgb;
    normal = texture2D(normals[0], texCoord).rgb;
  } else if (vertex == 1.) {
    position = texture2D(positions[1], texCoord).rgb;
    normal = texture2D(normals[1], texCoord).rgb;
  } else if (vertex == 2.) {
    position = texture2D(positions[2], texCoord).rgb;
    normal = texture2D(normals[2], texCoord).rgb;
  }

  gl_Position = viewProj * vec4(position, 1.);
}
