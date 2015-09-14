import dat from 'dat-gui/vendor/dat.gui';


export default class GUI {
  constructor(simulation) {
    let gui = this.gui = new dat.GUI();

    let env = this.env = gui.addFolder('Environment');
    env.add(simulation, 'gravity', -15, -5, 1);
    env.add(simulation, 'deltaT', 0, 0.02, 0.005);
    env.open();

    let fluid = this.fluid = gui.addFolder('Fluid material');
    fluid.add(simulation, 'temperature', 0, 80, 5);
    fluid.add(simulation, 'density0', 100, 5000);
    fluid.add(simulation, 'viscosity', 1, 50);
    fluid.open();

    let sph = this.sph = gui.addFolder('SPH');
    sph.add(simulation, 'nParticles', 5000, 250000, 5000);
    sph.add(simulation, 'mass', 0.005, 0.05, 0.005);
    sph.add(simulation, 'ratio', 0.02, 0.1, 0.005);
    sph.open();
  }
}
