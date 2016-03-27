import Stats from 'stats.js';

import './polyfill';
import GUI from './gui';
import Simulation from './simulation';
import L from './locale';


init();

function init() {
  let canvas = document.getElementById('area');
  let tiles = document.getElementById('tiles');

  tiles.complete ? onload() : tiles.onload = onload;

  function onload() {
    try {
      let simulation = initSimulation(canvas, tiles);
      let stats = initStats();

      runSimulation(canvas, simulation, stats);
    } catch (ex) {
      console && console.error(ex);
      document.body.innerHTML = `Sorry, fatal error:<br>${ex.message}`;
    }
  };
}

function initSimulation(canvas, tiles) {
  let gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
  let simulation = new Simulation(gl, {tiles});
  let gui = new GUI(simulation);

  window.addEventListener('resize', adjustCanvasSize);
  adjustCanvasSize();

  function adjustCanvasSize() {
    let factor = window.devicePixelRatio || 1;
    canvas.width = Math.floor(canvas.clientWidth * factor);
    canvas.height = Math.floor(canvas.clientHeight * factor);
    simulation.resize();
  }

  return simulation;
}

function initStats() {
  let stats = document.getElementById('stats');

  stats.appendChild(document.createTextNode(L`Simulation`));
  let logic = new Stats();
  stats.appendChild(logic.domElement);

  stats.appendChild(document.createTextNode(L`Rendering`));
  let render = new Stats();
  stats.appendChild(render.domElement);

  return {logic, render};
}

function runSimulation(canvas, simulation, stats) {
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
          stats.logic.update();
        }
      } else {
        simulation.step();
        stats.logic.update();
      }

      simulation.render();
      stats.render.update();
    }

    past = now;
    requestAnimationFrame(loop, canvas);
  }, canvas);
}
