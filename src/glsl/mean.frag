#extension GL_EXT_draw_buffers: require
precision highp float;
precision highp sampler2D;

uniform sampler2D positions;
uniform sampler2D velDens;

varying vec2 tcoord;

void main(void) {
  gl_FragData[0] = vec4(texture2D(positions, tcoord).xyz, 1.);
  gl_FragData[1] = vec4(texture2D(velDens, tcoord).xyz, 0.);
}
