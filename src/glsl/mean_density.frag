#extension GL_EXT_draw_buffers: require
precision highp float;
precision highp sampler2D;

uniform sampler2D velDens;

varying vec2 coord;

void main(void) {
  gl_FragData[0] = vec4(0.);
  gl_FragData[1] = vec4(0., 0., 0., texture2D(velDens, coord).w);
}
