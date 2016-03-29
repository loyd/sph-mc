#version 300 es

precision highp float;
precision highp sampler2D;

uniform sampler2D positions;
uniform sampler2D velDens;

in vec2 coord;

layout(location = 0) out vec4 outData0;
layout(location = 1) out vec4 outData1;

void main(void) {
  outData0 = vec4(texture(positions, coord).xyz, 1.);
  outData1 = vec4(texture(velDens, coord).xyz, 0.);
}
