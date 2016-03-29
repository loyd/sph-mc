#version 300 es

/*
   Since float values can not be read in javascript, this shader packs the value in a unsigned byte
   format. This packing only works on 0 to 1 floating numbers, hence the final sum of the
   histopymirad has to be normalized using a max value. This max value is the total cells that
   could be active in one texture.
 */

precision highp float;
precision highp sampler2D;

uniform sampler2D data;

// Max cells that could be active in a texture.
uniform float invMax;

out vec4 fragColor;

void main(void) {
  vec4 enc = fract(vec4(1., 255., 65025., 160581375.) * texture(data, vec2(0.)).s * invMax);
  enc -= enc.yzww * vec4(vec3(.00392157), 0.);
  fragColor = enc;
}
