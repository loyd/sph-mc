#version 300 es

in highp vec2 texCoord;

uniform mat4 mvp;
uniform sampler2D positions;

out lowp vec4 color;

void main(void) {
  vec3 position = texture(positions, texCoord).xyz;
  color = vec4(1.);

  gl_PointSize = 2.;
  gl_Position = mvp * vec4(position, 1.);
}
