precision mediump float;

uniform vec3 eye;
uniform float ambient;
uniform float diffuse;
uniform float specular;
uniform float lustreless;
uniform float attenuation;
uniform vec3 color;
uniform float opacity;

varying vec3 position;
varying vec3 normal;

const vec3 light = vec3(.5, 1., .5);
const vec3 gamma = vec3(1./2.2);

void main(void) {
  vec3 norm = normalize(normal);
  vec3 toLight = light - position;
  float distToLight2 = dot(toLight, toLight);
  toLight = normalize(toLight);

  float lightProj = dot(norm, toLight);
  vec3 phong = color * diffuse * max(lightProj, 0.);

  if (lightProj > 0.)
    phong += specular * pow(max(dot(eye, reflect(toLight, norm)), 0.), lustreless);

  phong *= 1. / (1. + attenuation * distToLight2);
  phong += vec3(color * ambient);

  gl_FragColor = vec4(pow(phong, gamma), opacity);
}
