import Stats from 'stats.js';

import Simulation from './simulation';


let canvas = document.querySelector('#area');
let gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');

let simulation = new Simulation(gl);

window.addEventListener('resize', adjustCanvasSize);
adjustCanvasSize();

function adjustCanvasSize() {
  let factor = window.devicePixelRatio || 1;
  canvas.width = Math.floor(canvas.clientWidth * factor);
  canvas.height = Math.floor(canvas.clientHeight * factor);
  simulation.resize();
}

window.requestAnimationFrame = window.requestAnimationFrame
                            || window.webkitRequestAnimationFrame
                            || window.mozRequestAnimationFrame
                            || window.oRequestAnimationFrame
                            || window.msRequestAnimationFrame;

if (!window.requestAnimationFrame) {
  let lastTime = 0;
  window.requestAnimationFrame = (callback, element) => {
      let currTime = Date.now();
      let timeToCall = Math.max(0, 16 - (currTime - lastTime));
      setTimeout(() => callback(currTime + timeToCall), timeToCall);
      lastTime = currTime + timeToCall;
      return id;
  };
}

let stats = new Stats();
document.body.appendChild(stats.domElement);

requestAnimationFrame(function loop(time) {
  stats.begin();
  simulation.step(time);
  stats.end();

  requestAnimationFrame(loop, canvas);
}, canvas);
