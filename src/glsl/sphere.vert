//#TODO: rename this!
attribute vec3 aposition;

uniform vec3 center;
uniform mat4 vp;

varying vec3 position;
varying vec3 normal;

void main(void) {
  position = center + aposition;
  normal = aposition;
  gl_Position = vp * vec4(position, 1.);
}
