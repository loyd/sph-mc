import Stats from 'stats.js';

import GUI from './gui';
import Simulation from './simulation';


let canvas = document.querySelector('#area');
let gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');

let simulation = new Simulation(gl);
let gui = new GUI(simulation);

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

let logicStats = new Stats();
let renderStats = new Stats();

document.body.appendChild(logicStats.domElement);
document.body.appendChild(renderStats.domElement);

//setTimeout(function logicLoop() {
  //setTimeout(logicLoop, 1000*simulation.dt);

  //logicStats.begin();
  //simulation.step();
  //logicStats.end();
//}, 1000*simulation.dt);

//requestAnimationFrame= function(cb) {
  //setTimeout(cb, 50);
//};

requestAnimationFrame(function renderLoop() {
  if (!document.hidden) {
    logicStats.begin();
    simulation.step();
    logicStats.end();

    renderStats.begin();
    simulation.render();
    renderStats.end();
  }

  requestAnimationFrame(renderLoop, canvas);
}, canvas);
