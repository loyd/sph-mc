import * as utils from './utils';
import Camera from './camera';

import bboxTmpl from './glsl/bbox.vert';
import meanVsTmpl from './glsl/mean.vert';
import index2dTmpl from './glsl/index2d.vert';
import particlesTmpl from './glsl/particles.vert';

import colorTmpl from './glsl/color.frag';
import meanFsTmpl from './glsl/mean.frag';
import densityTmpl from './glsl/density.frag';
import meanDensityTmpl from './glsl/mean_density.frag';


const DATA_TEX_SIZE = 1024;
const CELL_XY_TEX_SIZE = 128;
const CELL_Z_TEX_SIZE = 16;

const CELLS_TEX_SIZE = CELL_XY_TEX_SIZE * CELL_Z_TEX_SIZE;

export default class Simulation {
  constructor(gl) {
    this.gl = gl;

    this.nParticles = 50000;
    this.dt = 0.01;
    this.ratio = 0.1;

    this.camera = new Camera([.5, .5, .5]);

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
    let link = (vs, fs) => utils.createProgramInfo(this.gl, vs, fs);

    let cellConsts = {
      zSize: CELL_Z_TEX_SIZE+'.',
      xySize: CELL_XY_TEX_SIZE+'.',
      totalSize: CELLS_TEX_SIZE+'.'
    };

    let bbox = vs(bboxTmpl),
        meanVs = vs(meanVsTmpl, cellConsts),
        index2d = vs(index2dTmpl),
        particles = vs(particlesTmpl);

    let meanFs = fs(meanFsTmpl),
        density = fs(densityTmpl, cellConsts),
        meanDensity = fs(meanDensityTmpl),
        color = fs(colorTmpl);

    return {
      bbox: link(bbox, color),
      mean: link(meanVs, meanFs),
      density: link(index2d, density),
      meanDensity: link(index2d, meanDensity),
      particles: link(particles, color)
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
      particles: utils.createBufferInfo(this.gl, {
        texCoord: {dims: 2, data: coords}
      }),
      bbox: utils.createBufferInfo(this.gl, {
        position: {dims: 3, data: corners}
      })
    };
  }

  createTextures() {
    let positions = new Float32Array(4 * DATA_TEX_SIZE*DATA_TEX_SIZE);
    for (let i = 0, n = 4 * this.nParticles; i < n; i += 4) {
      positions[ i ] = Math.random()/3;
      positions[i+1] = 1 - Math.random()/2;
      positions[i+2] = Math.random()/3;
    }

    let gl = this.gl;
    let {RGBA, NEAREST} = gl;
    let FLOAT = this.extensions.float.type;

    return {
      positions: utils.createTextureInfo(gl, DATA_TEX_SIZE, RGBA, NEAREST, NEAREST, FLOAT,
                                         positions),
      velDens: utils.createTextureInfo(gl, DATA_TEX_SIZE, RGBA, NEAREST, NEAREST, FLOAT),
      meanPositions: utils.createTextureInfo(gl, CELLS_TEX_SIZE, RGBA, NEAREST, NEAREST, FLOAT),
      meanVelDens: utils.createTextureInfo(gl, CELLS_TEX_SIZE, RGBA, NEAREST, NEAREST, FLOAT)
    };
  }

  createFramebuffers() {
    return {
      cells: utils.createMRTFramebufferInfo(this.gl, this.extensions.mrt,
                                            this.textures.meanPositions,
                                            this.textures.meanVelDens),
      velDens: utils.createFramebufferInfo(this.gl, this.textures.velDens)
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

    this.gl.finish();
  }

  evaluateMeans() {
    let [program, buffer] = [this.programs.mean, this.buffers.particles];

    this.gl.useProgram(program.program);
    utils.setUniforms(program, {
      positions: this.textures.positions.texture,
      velDens: this.textures.velDens.texture,
      nCells: Math.ceil(3/(2*this.ratio))
    });
    utils.setBuffersAndAttributes(this.gl, program, buffer);

    this.evaluate(this.framebuffers.cells.framebuffer, true, true);
  }

  evaluateDensities() {
    let [program, buffer] = [this.programs.density, this.buffers.particles];

    this.gl.useProgram(program.program);
    utils.setUniforms(program, {
      positions: this.textures.positions.texture,
      meanPositions: this.textures.meanPositions.texture,
      nCells: Math.ceil(3/(2*this.ratio)),
      mass: this.mass,
      ratio2: this.ratio*this.ratio,
      wDefault: 315/(64*Math.PI * this.ratio**9)
    });
    utils.setBuffersAndAttributes(this.gl, program, buffer);

    this.evaluate(this.framebuffers.velDens, false, true);
  }

  evaluateMeanDensities() {
    let [program, buffer] = [this.programs.meanDensity, this.buffers.particles];

    this.gl.useProgram(program.program);
    utils.setUniforms(program, {
      velDens: this.textures.velDens.texture
    });
    utils.setBuffersAndAttributes(this.gl, program, buffer);

    this.evaluate(this.framebuffers.cells, false, true);
  }

  evaluate(framebuffer, clear = false, add = false) {
    let {gl} = this;

    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer.framebuffer);

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
    if (add) gl.disable (gl.BLEND);
  }

  render() {
    this.camera.update();

    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
    this.gl.viewport(0, 0, this.gl.drawingBufferWidth, this.gl.drawingBufferHeight);

    this.renderBBox();
    this.renderParticles();

    this.gl.finish();
  }

  renderBBox() {
    let [program, buffer] = [this.programs.bbox, this.buffers.bbox];

    this.gl.useProgram(program.program);
    utils.setUniforms(program, {viewProj: this.camera.matrix});
    utils.setBuffersAndAttributes(this.gl, program, buffer);
    utils.drawBufferInfo(this.gl, this.gl.LINES, buffer, 24);
  }

  renderParticles() {
    let [program, buffer] = [this.programs.particles, this.buffers.particles];

    this.gl.useProgram(program.program);
    utils.setUniforms(program, {
      viewProj: this.camera.matrix,
      positions: this.textures.positions.texture
    });
    utils.setBuffersAndAttributes(this.gl, program, buffer);
    utils.drawBufferInfo(this.gl, this.gl.POINTS, buffer, this.nParticles);
  }
}
