import {vec3, mat4} from 'gl-matrix';


export default class Camera {
  constructor(origin) {
    this.origin = origin;
    this.vAngle = Math.PI/6;
    this.hAngle = Math.PI/5;
    this.fov = Math.PI/4;
    this.aspect = 16/9;
    this.dist = 2;
    this.curZoom = 1;
    this.minZoom = 1;
    this.maxZoom = 5;
    this.near = 0.01;
    this.far = 100;
    this.speed = Math.PI/1000;

    this.eye = vec3.create();
    this.position = vec3.create();
    this.view = mat4.create();
    this.proj = mat4.create();
    this.matrix = mat4.create();
    this.update();
  }

  setAspect(aspect) {
    this.aspect = aspect;
    this.update();
  }

  rotate(dx, dy) {
    this.vAngle += dy * this.speed;
    this.hAngle -= dx * this.speed;
    this.update();
  }

  zoom(dw) {
    let newZoom = this.curZoom * (1 + dw * this.speed);
    this.curZoom = Math.max(this.minZoom, Math.min(newZoom, this.maxZoom));
    this.update();
  }

  update() {
    this.calcProj();
    this.calcView();
    mat4.multiply(this.matrix, this.proj, this.view);
  }

  calcProj() {
    mat4.perspective(this.proj, this.fov/this.curZoom, this.aspect, this.near, this.far);
  }

  calcView() {
    let [vCos, vSin] = [Math.cos(this.vAngle), Math.sin(this.vAngle)];
    let [hCos, hSin] = [Math.cos(this.hAngle), Math.sin(this.hAngle)];

    let eye = vec3.fromValues(vCos*hSin, vSin, vCos*hCos);
    let right = vec3.fromValues(-hCos, 0, hSin);

    vec3.negate(this.eye, eye);

    let up = vec3.cross(right, right, eye);
    this.position = vec3.add(eye, vec3.scale(eye, eye, this.dist), this.origin);

    mat4.lookAt(this.view, this.position, this.origin, up);
  }
}
