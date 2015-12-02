attribute vec3 position;
attribute vec2 texCoord;

uniform mat4 mvp;

varying vec2 coord;

void main(void) {
  coord = texCoord;
  gl_Position = mvp * vec4(position, 1.);
}
