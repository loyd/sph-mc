import dat from 'dat-gui/vendor/dat.gui';


export default class GUI {
  constructor(simulation) {
    let gui = this.gui = new dat.GUI();

    let env = this.env = gui.addFolder('Environment');
    env.add(simulation, 'gravity', -15, 0, .01);
    env.add(simulation, 'deltaT', .002, .02, .0001);
    env.open();

    let fluid = this.fluid = gui.addFolder('Fluid material');
    fluid.add(simulation, 'temperature', 0, 80, 5);
    let a = fluid.add(simulation, 'density0', 100, 5000, .01);
    fluid.add(simulation, 'viscosity', 1, 50, .1);
    fluid.add(simulation, 'pressureK', .5, 10, .5);
    fluid.add(simulation, 'tension', 0, .2, .01);
    fluid.open();

    let sph = this.sph = gui.addFolder('SPH');
    sph.add(simulation, 'nParticles', 5000, 250000, 5000);
    sph.add(simulation, 'mass', .0005, .01, .0005);
    sph.add(simulation, 'ratio', .02, .1, .005);
    sph.add(simulation, 'mode', ['wireframe', 'mockup', 'dual']);
    sph.open();

    let mc = this.mc = gui.addFolder('MC');
    mc.add(simulation, 'spread', 0, 5, 1);
    mc.add(simulation, 'nVoxels', 0, 100, 1);
    mc.add(simulation, 'range', .2, .99, .01);
    mc.open();
  }
}
