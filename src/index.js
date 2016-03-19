import Stats from 'stats.js';

import './polyfill';
import GUI from './gui';
import Simulation from './simulation';
import L from './locale';


/*
 * Initialization of the simulation.
 */
let canvas = document.getElementById('area');
let tiles = document.getElementById('tiles');
let gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');

let simulation = new Simulation(gl, {tiles});
let gui = new GUI(simulation);

/*
 * Resize handling.
 */
window.addEventListener('resize', adjustCanvasSize);
adjustCanvasSize();

function adjustCanvasSize() {
  let factor = window.devicePixelRatio || 1;
  canvas.width = Math.floor(canvas.clientWidth * factor);
  canvas.height = Math.floor(canvas.clientHeight * factor);
  simulation.resize();
}

/*
 * Statistics initialization.
 */
let stats = document.getElementById('stats');

stats.appendChild(document.createTextNode(L`Simulation`));
let logicStats = new Stats();
stats.appendChild(logicStats.domElement);

stats.appendChild(document.createTextNode(L`Rendering`));
let renderStats = new Stats();
stats.appendChild(renderStats.domElement);

/*
 * Run the simulation.
 */
let past;

requestAnimationFrame(function loop(now) {
  if (!past) past = now;

  if (!document.hidden) {
    let delta = now - past;

    if (simulation.realtime) {
      let amount = delta / (simulation.deltaT*1000) | 0;
      now -= delta % (simulation.deltaT*1000);

      for (let i = 0; i < amount; ++i) {
        simulation.step();
        logicStats.update();
      }
    } else {
      simulation.step();
      logicStats.update();
    }

    simulation.render();
    renderStats.update();
  }

  past = now;
  requestAnimationFrame(loop, canvas);
}, canvas);
