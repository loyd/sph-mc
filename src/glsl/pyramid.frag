#version 300 es

precision highp float;
precision highp sampler2D;

uniform sampler2D data;
uniform float size;

out vec4 fragColor;

void main(void) {
  float hs = .5 * size;
  vec2 pos = floor(gl_FragCoord.xy) * size;

  fragColor = vec4(texture(data, pos).s
                 + texture(data, pos + vec2(0., hs)).s
                 + texture(data, pos + vec2(hs, 0.)).s
                 + texture(data, pos + vec2(hs, hs)).s);
}
