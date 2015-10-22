precision highp sampler2D;
precision highp float;

/*uniform vec3 uEye;*/
/*uniform samplerCube uCube;*/

varying vec3 normal;

void main(void) {
  /*vec3 light = normalize(vec3(0., 1., 0.));*/
  /*vec3 eye = normalize(uEye);*/
  /*vec3 ref = reflect(light, normal);*/
  /*vec3 c = vec3(1.);*/
  /*vec3 amb = textureCube(uCube, normal).rgb;*/
  /*float ang = pow(max(dot(eye, ref), 0.), 1.);*/
  /*vec3 phong = 0.1 * c + 0.2 * c * max(dot(light, normal), 0.) + 200. * vec3(1.) * max(pow(dot(reflect(light, -normal), eye), 60.), 0.);*/
  /*phong = mix(phong, 0. * phong, ang);*/
  /*gl_FragColor = vec4(phong, .5);*/
  gl_FragColor = vec4(.5);
}
