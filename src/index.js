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
document.body.appendChild(logicStats.domElement);

let renderStats = new Stats();
document.body.appendChild(renderStats.domElement);

//let past = performance.now();
//setImmediate(function logicLoop() {
  //let now = performance.now();

  //if (now - past >= simulation.deltaT*1000) {
    //if (simulation.deltaT > 0.004)
      //setTimeout(logicLoop, simulation.deltaT);
    //else
      //setImmediate(logicLoop);

    //past = now;

    //logicStats.update();
    //simulation.step();
  //} else
    //setImmediate(logicLoop);
//});

const DELTA_THRESHOLD = 1000/15;

let past;
let live = true;

requestAnimationFrame(function loop(now) {
  if (!past) past = now;

  if (!document.hidden) {
    let delta = now - past;

    if (delta > DELTA_THRESHOLD && live) {
      live = false;
      console.info('Realtime simulation is imposible.');
    }

    if (live) {
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
