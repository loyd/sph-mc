precision highp float;
precision highp sampler2D;

uniform sampler2D velDens;

varying vec2 coord;

void main(void) {
  gl_FragColor = vec4(0., 0., 0., texture2D(velDens, coord).w);
}
