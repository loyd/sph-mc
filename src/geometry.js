import assert from 'assert';
import {vec3} from 'gl-matrix';


export class BBox {
  constructor() {
    this.vertices = [0,0,1, 1,0,1, 1,1,1,  0,1,1, 0,0,0, 0,1,0,
                     1,1,0, 1,0,0, 0,1,0,  0,1,1, 1,1,1, 1,1,0,
                     0,0,0, 1,0,0, 1,0,1,  0,0,1, 1,0,0, 1,1,0,
                     1,1,1, 1,0,1, 0,0,0,  0,0,1, 0,1,1, 0,1,0];

    this.normals = [ 0, 0,-1,  0, 0,-1,  0, 0,-1,  0, 0,-1,  0, 0, 1,  0, 0, 1,
                     0, 0, 1,  0, 0, 1,  0,-1, 0,  0,-1, 0,  0,-1, 0,  0,-1, 0,
                     0, 1, 0,  0, 1, 0,  0, 1, 0,  0, 1, 0, -1, 0, 0, -1, 0, 0,
                    -1, 0, 0, -1, 0, 0,  1, 0, 0,  1, 0, 0,  1, 0, 0,  1, 0, 0];

    this.texCoords = [0,0, 1,0,  1,1, 0,1,  0,0, 1,0,  1,1, 0,1,
                      0,0, 1,0,  1,1, 0,1,  0,0, 1,0,  1,1, 0,1,
                      0,0, 1,0,  1,1, 0,1,  0,0, 1,0,  1,1, 0,1];

    this.faces = [ 0, 1, 2,  0, 2, 3,
                   4, 5, 6,  4, 6, 7,
                   8, 9,10,  8,10,11,
                  12,13,14, 12,14,15,
                  16,17,18, 16,18,19,
                  20,21,22, 20,22,23];

    this.edges = [4,7, 7,6, 6,5, 5,4, 0,1, 1,2, 2,3, 3,0, 4,0, 7,1, 6,2, 5,3];
  }
}

export class Sphere {
  constructor(center, radius, detail) {
    assert(radius > 0);
    assert(detail >= 0);

    this.center = center;
    this.radius = radius;
    this.detail = detail;

    // First approximation is icosahedron.
    let phi = (1 + Math.sqrt(5)) / 2;
    let a = 1/2;
    let b = 1/(2 * phi);

    this.vertices = [[ 0, b, -a], [b,  a,  0], [-b,  a,  0],
                     [ 0, b,  a], [0, -b,  a], [-a,  0,  b],
                     [ a, 0,  b], [0, -b, -a], [ a,  0, -b],
                     [-a, 0, -b], [b, -a,  0], [-b, -a,  0]];

    this.faces = [1,0,2, 2,3,1,   4,3,5,   6,3,4,  7,0,8,
                  9,0,7, 10,4,11, 11,7,10, 5,2,9,  9,11,5,
                  8,1,6, 6,10,8,  5,3,2,   1,3,6,  2,0,9,
                  8,0,1, 9,7,11,  10,7,8,  11,4,5, 6,4,10];

    this.edges = [0,1,  0,2,  0,7,  0,8,  0,9,  1,2,
                  1,3,  1,6,  1,8,  2,3,  2,5,  2,9,
                  3,4,  3,5,  3,6,  4,5,  4,6,  4,10,
                  4,11, 5,9,  5,11, 6,8,  6,10, 7,8,
                  7,9,  7,10, 7,11, 8,10, 9,11, 10,11];

    for (let i = 0; i < detail; ++i)
      this.subdivide();

    this.normalizeAndFlat();
  }

  subdivide() {
    let cache = {};
    let faces = [];

    for (let i = 0; i < this.faces.length - 2; i += 3) {
      let i0 = this.faces[ i ];
      let i1 = this.faces[i+1];
      let i2 = this.faces[i+2];

      let m01 = this.addMidpoint(cache, i0, i1);
      let m12 = this.addMidpoint(cache, i1, i2);
      let m02 = this.addMidpoint(cache, i2, i0);

      faces.push(i0,m01,m02, i1,m12,m01, i2,m02,m12, m02,m01,m12);
      this.edges.push(m01,m01, m01,m12, m12,m02);
    }

    this.faces = faces;
  }

  addMidpoint(midpoints, i, j) {
    let key = `${Math.min(i, j)}|${Math.max(i, j)}`;

    if (key in midpoints)
      return midpoints[key];

    let [vi, vj] = [this.vertices[i], this.vertices[j]];
    let mid = [];
    vec3.add(mid, vi, vj);
    vec3.scale(mid, mid, 1/2);

    let idx = this.vertices.push(mid) - 1;
    midpoints[key] = idx;

    return idx;
  }

  normalizeAndFlat() {
    let result = [];

    for (let v of this.vertices) {
      vec3.scale(v, vec3.normalize(v, v), this.radius);
      result.push(...v);
    }

    this.vertices = result;
  }
}
