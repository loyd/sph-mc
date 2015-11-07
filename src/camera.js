import {vec3, mat4} from 'gl-matrix';


export default class Camera {
  constructor(observable, origin) {
    this.origin = origin;
    this.vAngle = Math.PI/6;
    this.hAngle = Math.PI/5;
    this.fov = Math.PI/4;
    this.aspect = 16/9;
    this.dist = 3;
    this.zoom = 1;
    this.minZoom = .3;
    this.maxZoom = 5;
    this.near = 0.001;
    this.far = 1000;
    this.speed = Math.PI/1000;

    this.down = false;
    this.dirty = true;
    this.marker = {x: 0, y: 0};
    this.mouse = {x: 0, y: 0};
    this.matrix = mat4.create();
    this.update();

    observable.addEventListener('mousedown', e => this.onMouseDown(e));
    window.addEventListener('mousemove', e => this.onMouseMove(e));
    window.addEventListener('mouseup', e => this.onMouseUp(e));

    let wheel = 'onwheel' in window ? 'wheel'
              : 'onmousewheel' in window ? 'mousewheel'
              : 'MozMousePixelScroll';

    observable.addEventListener(wheel, e => this.onMouseWheel(e));
  }

  onMouseDown(e) {
    this.down = true;
    document.body.classList.add('camera');
    this.marker.x = this.mouse.x = e.clientX;
    this.marker.y = this.mouse.y = e.clientY;
    e.preventDefault();
  }

  onMouseMove(e) {
    if (!this.down)
      return;

    this.mouse.x = e.clientX;
    this.mouse.y = e.clientY;

    let dx = this.mouse.x - this.marker.x,
        dy = this.mouse.y - this.marker.y;

    this.hAngle -= dx * this.speed;
    this.vAngle += dy * this.speed;

    this.marker.x = this.mouse.x;
    this.marker.y = this.mouse.y;
    this.dirty = true;
  }

  onMouseUp(e) {
    this.down = false;
    document.body.classList.remove('camera');
  }

  onMouseWheel(e) {
    let delta = e.deltaY || e.detail || e.wheelDelta;
    this.zoom = Math.max(Math.min(this.zoom * (1 + delta*this.speed), this.maxZoom), this.minZoom);
    this.dirty = true;
  }

  setAspect(aspect) {
    this.aspect = aspect;
    this.dirty = true;
  }

  update() {
    if (!this.dirty)
      return;

    mat4.multiply(this.matrix, this.calcProj(), this.calcView());
    this.dirty = false;
  }

  calcProj() {
    let proj = mat4.create();
    mat4.perspective(proj, this.fov/this.zoom, this.aspect, this.near, this.far);
    return proj;
  }

  calcView() {
    let [vCos, vSin] = [Math.cos(this.vAngle), Math.sin(this.vAngle)];
    let [hCos, hSin] = [Math.cos(this.hAngle), Math.sin(this.hAngle)];

    let eye = [vCos*hSin, vSin, vCos*hCos];
    let right = [-hCos, 0, hSin];

    let up = vec3.cross(right, right, eye);
    let position = vec3.add(eye, vec3.scale(eye, eye, this.dist), this.origin);

    return mat4.lookAt(position, position, this.origin, up);
  }
}
