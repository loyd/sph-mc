#version 300 es

precision mediump float;

uniform vec3 eye;
uniform float ambient;
uniform float diffuse;
uniform float specular;
uniform float shininess;
uniform float attenuation;
uniform sampler2D texMap;
uniform vec3 color;
uniform float opacity;

in vec3 position;
in vec3 normal;
in vec2 coord;

out vec4 fragColor;

const vec3 light = vec3(.5, 1., .5);
const vec3 gamma = vec3(1./2.2);

void main(void) {
  vec3 norm = normalize(normal);
  vec3 toLight = light - position;
  float distToLight2 = dot(toLight, toLight);
  toLight = normalize(toLight);

  vec3 base = color + texture(texMap, coord).rgb;

  float lightProj = dot(norm, toLight);
  vec3 phong = base * diffuse * max(lightProj, 0.);

  if (lightProj > 0.)
    phong += specular * pow(max(dot(eye, reflect(toLight, norm)), 0.), shininess);

  phong *= 1. / (1. + attenuation * distToLight2);
  phong += vec3(base * ambient);

  fragColor = vec4(pow(phong, gamma), opacity);
}
