import Stats from 'stats.js';

import './polyfill';
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


let logicStats = new Stats();
let renderStats = new Stats();

document.body.appendChild(logicStats.domElement);
document.body.appendChild(renderStats.domElement);

setTimeout(function logicLoop() {
  setTimeout(logicLoop, 1000*simulation.deltaT);
  logicStats.update();
  simulation.step();
}, 1000*simulation.deltaT);

requestAnimationFrame(function renderLoop() {
  if (!document.hidden) {
    renderStats.update();
    simulation.render();
  }

  requestAnimationFrame(renderLoop, canvas);
}, canvas);
