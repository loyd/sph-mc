precision mediump float;

uniform vec3 eye;
uniform float ambient;
uniform float diffuse;
uniform float specular;
uniform float lustreless;
uniform vec3 color;
uniform float opacity;

varying vec3 normal;

const vec3 toLight = vec3(0., 1., 0.);
const vec3 gamma = vec3(1./2.2);

void main(void) {
  vec3 norm = normalize(normal);

  float lightProj = dot(norm, toLight);
  vec3 phong = color * (vec3(ambient) + diffuse * max(lightProj, 0.));

  if (lightProj > 0.)
    phong += specular * pow(max(dot(eye, reflect(toLight, norm)), 0.), lustreless);

  gl_FragColor = vec4(pow(phong, gamma), opacity);
}
