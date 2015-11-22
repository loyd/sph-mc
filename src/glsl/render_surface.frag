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

void main(void) {
  vec3 norm = normalize(normal);

  vec3 phong = vec3(ambient)
             + diffuse * max(dot(toLight, norm), 0.)
             + specular * pow(max(dot(reflect(toLight, norm), eye), 0.), lustreless);

  gl_FragColor = vec4(color * phong, opacity);
}
