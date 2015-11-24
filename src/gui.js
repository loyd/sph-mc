import dat from 'dat-gui';


export default class GUI {
  constructor(simulation) {
    let gui = this.gui = new dat.GUI();

    let env = this.env = gui.addFolder('Environment');
    env.add(simulation, 'gravity', -15, 0, .01);
    env.add(simulation, 'deltaT', .002, .02, .0001);
    env.open();

    let physics = this.physics = gui.addFolder('Fluid physics');
    physics.add(simulation, 'temperature', 0, 80, 5);
    physics.add(simulation, 'density0', 100, 5000, .01);
    physics.add(simulation, 'viscosity', 1, 50, .1);
    physics.add(simulation, 'pressureK', .5, 10, .5);
    physics.add(simulation, 'tension', 0, .2, .01);
    physics.add(simulation, 'restitution', 0, 1, .01);
    physics.open();

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

    let material = this.material = gui.addFolder('Fluid material');
    material.add(simulation, 'ambient', 0, 1, .01);
    material.add(simulation, 'diffuse', 0, 1, .01);
    material.add(simulation, 'specular', 0, 1, .01);
    material.add(simulation, 'lustreless', 0, 80, 1);

    let proxy = {color: simulation.color.map(c => c * 255)};
    let h = dat.color.color.math.component_from_hex;
    material.addColor(proxy, 'color').onChange(color => {
      if (typeof color === 'string') {
        let num = +('0x' + color.slice(1));
        simulation.color = [2, 1, 1].map(c => h(num, c) / 255);
      } else
        simulation.color = color.map(c => c / 255);
    });

    material.add(simulation, 'opacity', 0, 1, .01);
    material.open();
  }
}
