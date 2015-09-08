#extension GL_EXT_draw_buffers: require
precision highp float;
precision highp sampler2D;

uniform sampler2D positions;
uniform sampler2D velDens;

varying vec2 coord;

void main(void) {
  gl_FragData[0] = vec4(texture2D(positions, coord).xyz, 1.);
  gl_FragData[1] = vec4(texture2D(velDens, coord).xyz, 0.);
}
