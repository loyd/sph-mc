import * as utils from './utils';
import Camera from './camera';

import bboxTmpl from './glsl/bbox.vert';
import cellTmpl from './glsl/cell.vert';
import index2dTmpl from './glsl/index2d.vert';
import particleTmpl from './glsl/particle.vert';

import colorTmpl from './glsl/color.frag';
import whiteColorTmpl from './glsl/white_color.frag';
import meanTmpl from './glsl/mean.frag';
import densityTmpl from './glsl/density.frag';
import meanDensityTmpl from './glsl/mean_density.frag';
import lagrangeTmpl from './glsl/lagrange.frag';


const DATA_TEX_SIZE = 1024;
const CELL_XY_TEX_SIZE = 128;
const CELL_Z_TEX_SIZE = 16;

const CELLS_TEX_SIZE = CELL_XY_TEX_SIZE * CELL_Z_TEX_SIZE;

export default class Simulation {
  constructor(gl) {
    this.gl = gl;

    this.nParticles = 50000;
    this.density0 = 998.29;
    this.temperature = 20;
    this.mass = 0.005;
    this.deltaT = 0.005;
    this.gravity = -9.81;
    this.viscosity = 3;

    this.pressureK = 3;
    this.ratio = 0.0457;
    this.mode = 'dual';

    this.camera = new Camera(gl.canvas, [.5, .5, .5]);

    this.extensions = this.getExtensions();
    this.programs = this.createPrograms();
    this.buffers = this.createBuffers();
    this.textures = this.createTextures();
    this.framebuffers = this.createFramebuffers();
  }

  getExtensions() {
    let float = this.gl.getExtension('OES_texture_float');
    if (float)
      float.type = this.gl.FLOAT;
    else {
      float = this.gl.getExtension('OES_texture_half_float');
      if (float)
        float.type = float.HALF_FLOAT_OES;
      else
        throw new Error("OES_texture_float and OES_texture_half_float is not available");
    }

    let mrt = this.gl.getExtension('WEBGL_draw_buffers');
    if (!mrt)
      throw new Error("WEBGL_draw_buffers is not available");

    return {float, mrt};
  }

  createPrograms() {
    let vs = (tmpl, consts) => utils.compileVertexShader(this.gl, tmpl(consts));
    let fs = (tmpl, consts) => utils.compileFragmentShader(this.gl, tmpl(consts));
    let link = (vs, fs) => utils.createProgram(this.gl, vs, fs);

    let cellConsts = {
      zSize: CELL_Z_TEX_SIZE+'.',
      xySize: CELL_XY_TEX_SIZE+'.',
      totalSize: CELLS_TEX_SIZE+'.'
    };

    let bbox = vs(bboxTmpl),
        cell = vs(cellTmpl, cellConsts),
        index2d = vs(index2dTmpl),
        particle = vs(particleTmpl);

    let mean = fs(meanTmpl),
        density = fs(densityTmpl, cellConsts),
        meanDensity = fs(meanDensityTmpl),
        lagrange = fs(lagrangeTmpl, cellConsts),
        color = fs(colorTmpl),
        whiteColor = fs(whiteColorTmpl);

    return {
      mean: link(cell, mean),
      density: link(index2d, density),
      meanDensity: link(cell, meanDensity),
      lagrange: link(index2d, lagrange),
      activity: link(cell, whiteColor),
      bbox: link(bbox, color),
      particle: link(particle, color)
    };
  }

  createBuffers() {
    let coords = new Float32Array(2 * this.nParticles);
    for (let i = 0; i < coords.length; i += 2) {
      coords[ i ] = ((i % DATA_TEX_SIZE) + .5)/DATA_TEX_SIZE;
      coords[i+1] = ((i / DATA_TEX_SIZE|0) + .5)/DATA_TEX_SIZE;
    }

    let corners = [
      0,0,0, 1,0,0, 1,0,0,  1,1,0, 1,1,0, 0,1,0,  0,1,0, 0,0,0, 0,0,1,  1,0,1, 1,0,1, 1,1,1,
      1,1,1, 0,1,1, 0,1,1,  0,0,1, 0,0,0, 0,0,1,  1,0,0, 1,0,1, 1,1,0,  1,1,1, 0,1,0, 0,1,1
    ];

    return {
      particles: utils.createBuffers(this.gl, {
        texCoord: {dims: 2, data: coords}
      }),
      bbox: utils.createBuffers(this.gl, {
        position: {dims: 3, data: corners}
      })
    };
  }

  createTextures() {
    let positions = new Float32Array(4 * DATA_TEX_SIZE*DATA_TEX_SIZE);
    let volume = Math.pow(this.mass * this.nParticles / this.density0, 1/3);
    for (let i = 0, n = 4 * this.nParticles; i < n; i += 4) {
      positions[ i ] = Math.random() * volume;
      positions[i+1] = 1 - Math.random() * volume;
      positions[i+2] = Math.random() * volume;
    }

    let gl = this.gl;
    let {RGBA, NEAREST} = gl;
    let FLOAT = this.extensions.float.type;

    return {
      meanPositions: utils.createTexture(gl, CELLS_TEX_SIZE, RGBA, NEAREST, FLOAT),
      meanVelDens: utils.createTexture(gl, CELLS_TEX_SIZE, RGBA, NEAREST, FLOAT),
      positions: utils.createTexture(gl, DATA_TEX_SIZE, RGBA, NEAREST, FLOAT, positions),
      _positions: utils.createTexture(gl, DATA_TEX_SIZE, RGBA, NEAREST, FLOAT),
      velDens: utils.createTexture(gl, DATA_TEX_SIZE, RGBA, NEAREST, FLOAT),
      _velDens: utils.createTexture(gl, DATA_TEX_SIZE, RGBA, NEAREST, FLOAT),
      activity: utils.createTexture(gl, CELLS_TEX_SIZE, RGBA, NEAREST, FLOAT)
    };
  }

  createFramebuffers() {
    return {
      cells: utils.createMRTFramebuffer(this.gl, this.extensions.mrt,
                                        this.textures.meanPositions,
                                        this.textures.meanVelDens),
      velDens: utils.createFramebuffer(this.gl, this.textures.velDens),
      _velDens: utils.createFramebuffer(this.gl, this.textures._velDens),
      lagrange: utils.createMRTFramebuffer(this.gl, this.extensions.mrt,
                                           this.textures._positions,
                                           this.textures._velDens),
      _lagrange: utils.createMRTFramebuffer(this.gl, this.extensions.mrt,
                                            this.textures.positions,
                                            this.textures.velDens),
      activity: utils.createFramebuffer(this.gl, this.textures.activity)
    };
  }

  resize() {
    this.gl.viewport(0, 0, this.gl.drawingBufferWidth, this.gl.drawingBufferHeight);
    this.camera.setAspect(this.gl.drawingBufferWidth/this.gl.drawingBufferHeight);
  }

  step() {
    this.evaluateMeans();
    this.evaluateDensities();
    this.evaluateMeanDensities();
    this.evaluateLagrange();
  }

  evaluateMeans() {
    this.evaluate(this.programs.mean, this.framebuffers.cells, {
      positions: this.textures.positions,
      velDens: this.textures.velDens,
      nCells: 3/(2*this.ratio)
    }, true, true);
  }

  evaluateDensities() {
    this.evaluate(this.programs.density, this.framebuffers.velDens, {
      positions: this.textures.positions,
      meanPositions: this.textures.meanPositions,
      nCells: 3/(2*this.ratio),
      mass: this.mass,
      ratio2: this.ratio*this.ratio,
      wDefault: 315/(64*Math.PI * this.ratio**9)
    }, false, true);
  }

  evaluateMeanDensities() {
    this.evaluate(this.programs.meanDensity, this.framebuffers.cells, {
      positions: this.textures.positions,
      velDens: this.textures.velDens,
      nCells: 3/(2*this.ratio)
    }, false, true);
  }

  evaluateLagrange() {
    this.evaluate(this.programs.lagrange, this.framebuffers.lagrange, {
      positions: this.textures.positions,
      velDens: this.textures.velDens,
      meanPositions: this.textures.meanPositions,
      meanVelDens: this.textures.meanVelDens,
      nCells: 3/(2*this.ratio),
      ratio: this.ratio,
      pressureK: this.pressureK,
      density0: this.density0,
      viscosity: this.viscosity,
      deltaT: this.deltaT,
      mass: this.mass,
      gravity: this.gravity,
      wPressure: -45/(Math.PI*this.ratio**6),
      wViscosity: 45/(Math.PI*this.ratio**6)
    });

    let t = this.textures;
    [t.positions, t._positions] = [t._positions, t.positions];
    [t.velDens, t._velDens] = [t._velDens, t.velDens];

    let f = this.framebuffers;
    [f.velDens, f._velDens] = [f._velDens, f.velDens];
    [f.lagrange, f._lagrange] = [f._lagrange, f.lagrange];
  }

  render() {
    this.camera.update();

    if (this.mode !== 'wireframe')
      this.generateSurface();

    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);

    let {drawingBufferWidth: vw, drawingBufferHeight: vh} = this.gl;

    switch (this.mode) {
      case 'wireframe':
        this.gl.viewport(0, 0, vw, vh);
        this.renderBBox();
        this.renderParticles();
        break;

      case 'mockup':
        this.gl.viewport(0, 0, vw, vh);
        this.renderBBox();
        this.renderSurface();
        break;

      case 'dual':
        let [hvw, hvh, qvh] = [vw/2, vh/2, vh/4];
        this.gl.viewport(0, qvh, hvw, hvh);
        this.renderBBox();
        this.renderParticles();

        this.gl.viewport(hvw, qvh, hvw, hvh);
        this.renderBBox();
        this.renderSurface();
        break;
    }
  }

  renderBBox() {
    let [program, buffer] = [this.programs.bbox, this.buffers.bbox];

    this.gl.useProgram(program);
    utils.setUniforms(program, {viewProj: this.camera.matrix});
    utils.setBuffersAndAttributes(this.gl, program, buffer);
    this.gl.drawArrays(this.gl.LINES, 0, 24);
  }

  renderParticles() {
    let [program, buffer] = [this.programs.particle, this.buffers.particles];

    this.gl.useProgram(program);
    utils.setUniforms(program, {
      viewProj: this.camera.matrix,
      positions: this.textures.positions
    });
    utils.setBuffersAndAttributes(this.gl, program, buffer);
    this.gl.drawArrays(this.gl.POINTS, 0, this.nParticles);
  }

  generateSurface() {
    this.evaluateActivity();
  }

  evaluateActivity() {
    this.evaluate(this.programs.activity, this.framebuffers.activity, null, true); 
  }

  renderSurface() {}

  evaluate(program, framebuffer, uniforms, clear = false, add = false) {
    let {gl} = this;

    gl.useProgram(program);
    utils.setUniforms(program, uniforms);
    utils.setBuffersAndAttributes(gl, program, this.buffers.particles);

    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);

    if (clear) {
      gl.clearColor(0.0, 0.0, 0.0, 0.0);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    }

    gl.viewport(0, 0, framebuffer.size, framebuffer.size);

    if (add) {
      gl.enable(gl.BLEND);
      gl.blendEquation(gl.FUNC_ADD);
      gl.blendFunc(gl.ONE, gl.ONE);
    }

    gl.drawArrays(gl.POINTS, 0, this.nParticles);
    if (add) gl.disable(gl.BLEND);
  }
}
