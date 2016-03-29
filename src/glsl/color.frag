#version 300 es

uniform lowp vec4 color;

out lowp vec4 fragColor;

void main(void) {
  fragColor = color;
}
