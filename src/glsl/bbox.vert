attribute vec3 aposition;
attribute vec3 anormal;
attribute vec2 texCoord;

uniform mat4 mvp;

varying vec3 position;
varying vec3 normal;
varying vec2 coord;

void main(void) {
  position = aposition;
  normal = anormal;
  coord = texCoord;

  gl_Position = mvp * vec4(aposition, 1.);
}
