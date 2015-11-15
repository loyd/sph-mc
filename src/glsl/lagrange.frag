#extension GL_EXT_draw_buffers: require
precision highp float;
precision highp sampler2D;

uniform sampler2D positions;
uniform sampler2D velDens;
uniform sampler2D meanPositions;
uniform sampler2D meanVelDens;
uniform float nCells;
uniform float ratio;
uniform float ratio2;
uniform float _3ratio2;
uniform float pressureK;
uniform float density0;
uniform float viscosity;
uniform float tension;
uniform float threshold;
uniform float deltaT;
uniform float mass;
uniform float gravity;
uniform float wPressure;
uniform float wViscosity;
uniform float wTension;

varying vec2 coord;

const vec3 center = vec3(0.5, 0.5, 0.5);
const vec3 boxSize = vec3(0.49, 0.49, 0.49);

void main(void) {
  vec3 position = texture2D(positions, coord).xyz;
  vec3 cell = floor(position * nCells) + vec3(1.);
  vec4 piece = texture2D(velDens, coord);
  vec3 velocity = piece.xyz;
  float density = piece.w;

  float pressure = max(pressureK * (density - density0), 0.);

  vec3 surfaceNormal = vec3(0.);
  vec3 pressureForce = vec3(0.);
  vec3 viscosityForce = vec3(0.);
  vec3 tensionForce = vec3(0.);

  for (int i = -1; i <= 1; ++i) {
    float nbCellZ = cell.z + float(i);
    vec2 zCoord = vec2(mod(nbCellZ, {{zSize}}), floor(nbCellZ / {{zSize}}));

    for (int j = -1; j <= 1; ++j)
      for (int k = -1; k <= 1; ++k) {
        vec3 nbCell = cell + vec3(k, j, i);

        vec2 cellCoord = (nbCell.xy + {{xySize}}*zCoord + vec2(.5))/{{totalSize}};
        piece = texture2D(meanPositions, cellCoord);
        float nbCount = piece.w;

        if (nbCount < 1.)
          continue;

        float invNbCount = 1./nbCount;
        vec3 diff = position - piece.xyz * invNbCount;
        float distance2 = dot(diff, diff);
        float distance = sqrt(distance2);

        if (distance >= ratio)
          continue;

        piece = texture2D(meanVelDens, cellCoord) * invNbCount;
        vec3 nbVelocity = piece.xyz;
        float nbDensity = piece.w;
        float nbCountPerDensity = nbCount / nbDensity;

        float dr = ratio - distance;
        float nbPressure = max(pressureK * (nbDensity - density0), 0.);
        float coef = nbCountPerDensity * dr;

        //#TODO: check advanced equation.
        if (distance > 0.)
          pressureForce += coef * (nbPressure + pressure) * diff/distance * dr;
        viscosityForce += coef * (nbVelocity - velocity);

        //#TODO: what about Becker'07?
        float dr2 = ratio2 - distance2;
        coef = nbCountPerDensity * dr2;
        surfaceNormal += coef * diff * dr2;
        tensionForce += coef * (_3ratio2 - 7.*distance2);
      }
  }

  pressureForce *= .5 * wPressure;
  viscosityForce *= viscosity * wViscosity;

  surfaceNormal *= mass * wTension;
  float surfaceNormalLength = length(surfaceNormal);
  if (surfaceNormalLength >= threshold)
    tensionForce *= tension * surfaceNormal/surfaceNormalLength * wTension;

  vec3 volumeForce = viscosityForce - pressureForce - tensionForce;

  //#TODO: use leap-frog scheme.
  velocity += deltaT * (vec3(0., gravity, 0.) + mass/density * volumeForce);
  position += velocity * deltaT;

  vec3 xLocal = position - center;
  vec3 contactPointLocal = min(boxSize, max(-boxSize, xLocal));
  vec3 normal = normalize(sign(contactPointLocal - xLocal));
  vec3 d = abs(position - center) - boxSize;
  float distance = min(max(d.x,max(d.y,d.z)),0.) + length(max(d,0.));
  float restitution = distance / max(deltaT * length(velocity), 0.001);
  if (distance > 0.)
    velocity -= ((1. + restitution) * dot(velocity, normal) * step(-length(velocity), 0.)) * normal;

  vec3 contactPoint = contactPointLocal + center;
  position += (contactPoint - position);

  gl_FragData[0] = vec4(position, 0.);
  gl_FragData[1] = vec4(velocity, 0.);
}
