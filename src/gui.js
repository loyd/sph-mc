import dat from 'dat-gui';

import L from './locale';


export default class GUI {
  constructor(simulation) {
    let gui = this.gui = new dat.GUI();

    gui.add(simulation, 'restart').name(L`Restart`);
    gui.add(simulation, 'pauseResume').name(L`Pause`).onChange(function() {
      this.name(simulation.paused ? L`Pause` : L`Resume`);
    });

    let env = this.env = gui.addFolder(L`Environment`);
    env.add(simulation, 'gravity', -15, 0, .01).name(L`Gravity`);
    env.add(simulation, 'deltaT', .002, .02, .0001).name(L`Time step`);
    env.open();

    let physics = this.physics = gui.addFolder(L`Fluid physics`);
    physics.add(simulation, 'temperature', 0, 80, 5).name(L`Temperature`);
    physics.add(simulation, 'density0', 100, 5000, .01).name(L`Density`);
    physics.add(simulation, 'viscosity', 1, 50, .1).name(L`Viscosity`);
    physics.add(simulation, 'pressureK', .5, 10, .5).name(L`Gas stiffness`);
    physics.add(simulation, 'tension', 0, .2, .01).name(L`Surface tension`);
    physics.add(simulation, 'restitution', 0, 1, .01).name(L`Restitution`);
    physics.open();

    let sph = this.sph = gui.addFolder(L`SPH`);
    sph.add(simulation.wait, 'nParticles', 5000, 250000, 5000).name(L`Particle count`);
    sph.add(simulation, 'mass', .0005, .01, .0005).name(L`Mass of particle`);
    sph.add(simulation, 'ratio', .02, .1, .005).name(L`Support radius`);
    sph.add(simulation, 'mode', {
      [L`wireframe`]: 'wireframe',
      [L`mockup`]: 'mockup',
      [L`dual`]: 'dual'
    }).name(L`Mode`);
    sph.open();

    let mc = this.mc = gui.addFolder(L`MC`);
    mc.add(simulation, 'spread', 0, 5, 1).name(L`Spread`);
    mc.add(simulation, 'nVoxels', 0, 70, 1).name(L`Voxel count`);
    mc.add(simulation, 'isolevel', .2, .99, .01).name(L`Isosurface level`);
    mc.open();

    let material = this.material = gui.addFolder(L`Optics`);
    material.add(simulation, 'ambient', 0, 1, .01).name(L`Ambient`);
    material.add(simulation, 'diffuse', 0, 1, .01).name(L`Diffuse`);
    material.add(simulation, 'specular', 0, 1, .01).name(L`Specular`);
    material.add(simulation, 'lustreless', 0, 80, 1).name(L`Lustreless`);

    let proxy = {color: simulation.color.map(c => c * 255)};
    let h = dat.color.color.math.component_from_hex;
    material.addColor(proxy, 'color').onChange(color => {
      if (typeof color === 'string') {
        let num = +('0x' + color.slice(1));
        simulation.color = [2, 1, 1].map(c => h(num, c) / 255);
      } else
        simulation.color = color.map(c => c / 255);
    }).name(L`Color`);

    material.add(simulation, 'opacity', 0, 1, .01).name(L`Opacity`);
    material.open();
  }
}
