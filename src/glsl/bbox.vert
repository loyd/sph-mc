attribute vec3 aVertexPosition;

uniform mat4 uVPMatrix;

varying vec4 vColor;

void main(void) {
  vColor = vec4(1.);
  gl_Position = uVPMatrix * vec4(aVertexPosition, 1.);
}
