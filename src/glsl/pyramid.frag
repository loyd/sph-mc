precision mediump float;
precision mediump sampler2D;

uniform sampler2D data;
uniform float size;

void main(void) {
  float hs = .5 * size;
  vec2 pos = floor(gl_FragCoord.xy) * size;

  gl_FragColor = vec4(texture2D(data, pos).s
                    + texture2D(data, pos + vec2(0., hs)).s
                    + texture2D(data, pos + vec2(hs, 0.)).s
                    + texture2D(data, pos + vec2(hs, hs)).s);
}
