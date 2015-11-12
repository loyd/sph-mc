import * as utils from './utils';
import Camera from './camera';
import mcCases from './mc_cases';

import bboxTmpl from './glsl/bbox.vert';
import cellTmpl from './glsl/cell.vert';
import index2dTmpl from './glsl/index2d.vert';
import particleTmpl from './glsl/particle.vert';
import quadTmpl from './glsl/quad.vert';
import traversalTmpl from './glsl/traversal.vert';
import renderSurfaceVsTmpl from './glsl/render_surface.vert';

import colorTmpl from './glsl/color.frag';
import meanTmpl from './glsl/mean.frag';
import densityTmpl from './glsl/density.frag';
import meanDensityTmpl from './glsl/mean_density.frag';
import lagrangeTmpl from './glsl/lagrange.frag';
import nodeTmpl from './glsl/node.frag';
import relevantTmpl from './glsl/relevant.frag';
import pyramidTmpl from './glsl/pyramid.frag';
import packFloatTmpl from './glsl/pack_float.frag';
import compactTmpl from './glsl/compact.frag';
import triangleCreatorTmpl from './glsl/triangle_creator.frag';
import renderSurfaceFsTmpl from './glsl/render_surface.frag';


const DATA_TEX_SIZE = 1024;
const CELL_XY_TEX_SIZE = 128;
const CELL_Z_TEX_SIZE = 16;
const TRIANGLES_TEX_SIZE = 1024;

const CELLS_TEX_SIZE = CELL_XY_TEX_SIZE * CELL_Z_TEX_SIZE;
const CELLS_PYRAMID_LVLS = Math.log2(CELLS_TEX_SIZE);

export default class Simulation {
  constructor(gl) {
    this.gl = gl;

    this.gravity = -9.81;
    this.deltaT = .005;

    this.temperature = 20;
    this.density0 = 998.29;
    this.viscosity = 3;
    this.pressureK = 3;
    this.tension = .0728;

    this.nParticles = 50000;
    this.mass = .005;
    this.ratio = .0457;
    this.mode = 'dual';

    this.range = .53;

    this.camera = new Camera(gl.canvas, [.5, .5, .5]);

    this.activeCells = 0;

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
      totalSize: CELLS_TEX_SIZE+'.',
      pyramidLvls: CELLS_PYRAMID_LVLS+'.'
    };

    let bbox = vs(bboxTmpl),
        cell = vs(cellTmpl, cellConsts),
        index2d = vs(index2dTmpl),
        particle = vs(particleTmpl),
        quad = vs(quadTmpl),
        traversal = vs(traversalTmpl),
        renderSurfaceVs = vs(renderSurfaceVsTmpl);

    let mean = fs(meanTmpl),
        density = fs(densityTmpl, cellConsts),
        meanDensity = fs(meanDensityTmpl),
        lagrange = fs(lagrangeTmpl, cellConsts),
        color = fs(colorTmpl),
        node = fs(nodeTmpl, cellConsts),
        relevant = fs(relevantTmpl, cellConsts),
        pyramid = fs(pyramidTmpl),
        packFloat = fs(packFloatTmpl),
        compact = fs(compactTmpl, cellConsts),
        triangleCreator = fs(triangleCreatorTmpl, cellConsts),
        renderSurfaceFs = fs(renderSurfaceFsTmpl);

    return {
      mean: link(cell, mean),
      density: link(index2d, density),
      meanDensity: link(cell, meanDensity),
      lagrange: link(index2d, lagrange),
      bbox: link(bbox, color),
      particle: link(particle, color),
      node: link(quad, node),
      relevant: link(quad, relevant),
      pyramid: link(quad, pyramid),
      packFloat: link(quad, packFloat),
      compact: link(traversal, compact),
      triangleCreator: link(traversal, triangleCreator),
      renderSurface: link(renderSurfaceVs, renderSurfaceFs)
    };
  }

  createBuffers() {
    let coords = new Float32Array(2 * DATA_TEX_SIZE**2);
    for (let i = 0, n = DATA_TEX_SIZE**2; i < n; ++i) {
      coords[ i*2 ] = ((i % DATA_TEX_SIZE) + .5)/DATA_TEX_SIZE;
      coords[i*2+1] = ((i / DATA_TEX_SIZE|0) + .5)/DATA_TEX_SIZE;
    }

    let corners = [
      0,0,0, 1,0,0, 1,0,0,  1,1,0, 1,1,0, 0,1,0,  0,1,0, 0,0,0, 0,0,1,  1,0,1, 1,0,1, 1,1,1,
      1,1,1, 0,1,1, 0,1,1,  0,0,1, 0,0,0, 0,0,1,  1,0,0, 1,0,1, 1,1,0,  1,1,1, 0,1,0, 0,1,1
    ];

    let quad = [-1, -1, 1, -1, -1, 1, 1, 1];

    let indexes = new Float32Array(Math.max(CELLS_TEX_SIZE, TRIANGLES_TEX_SIZE)**2);

    let activeCellCoords = new Float32Array(2 * CELLS_TEX_SIZE**2);
    for (let i = 0, n = CELLS_TEX_SIZE**2; i < n; ++i) {
      indexes[i] = i;
      activeCellCoords[ 2*i ] = ((i % CELLS_TEX_SIZE) + .5)/CELLS_TEX_SIZE;
      activeCellCoords[2*i+1] = ((i / CELLS_TEX_SIZE|0) + .5)/CELLS_TEX_SIZE;
    }

    let triangleCoords = new Float32Array(2 * TRIANGLES_TEX_SIZE**2);
    let vertexCoords = new Float32Array(2 * TRIANGLES_TEX_SIZE**2);

    for (let i = 0, n = TRIANGLES_TEX_SIZE**2; i < n; ++i) {
      indexes[i] = i;
      triangleCoords[ 2*i ] = ((i % TRIANGLES_TEX_SIZE) + .5)/TRIANGLES_TEX_SIZE;
      triangleCoords[2*i+1] = ((i / TRIANGLES_TEX_SIZE|0) + .5)/TRIANGLES_TEX_SIZE;

      let j = i/3 |0;
      vertexCoords[ 2*i ] = ((j % TRIANGLES_TEX_SIZE) + .5)/TRIANGLES_TEX_SIZE;
      vertexCoords[2*i+1] = ((j / TRIANGLES_TEX_SIZE|0) + .5)/TRIANGLES_TEX_SIZE;
    }

    return {
      particles: utils.createBuffers(this.gl, {
        texCoord: {dims: 2, data: coords}
      }),
      bbox: utils.createBuffers(this.gl, {
        position: {dims: 3, data: corners}
      }),
      quad: utils.createBuffers(this.gl, {
        vertex: {dims: 2, data: quad}
      }),
      compact: utils.createBuffers(this.gl, {
        index: {dims: 1, data: indexes},
        texCoord: {dims: 2, data: activeCellCoords}
      }),
      creator: utils.createBuffers(this.gl, {
        index: {dims: 1, data: indexes},
        texCoord: {dims: 2, data: triangleCoords}
      }),
      surface: utils.createBuffers(this.gl, {
        index: {dims: 1, data: indexes},
        texCoord: {dims: 2, data: vertexCoords}
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

    let mcCasesTex = new Float32Array(4*64*64);
    for (let i = 0; i < mcCases.length; ++i)
      mcCasesTex[i*4] = mcCases[i];

    let gl = this.gl;
    let {RGBA, UNSIGNED_BYTE, NEAREST} = gl;
    let FLOAT = this.extensions.float.type;

    return {
      meanPositions: utils.createTexture(gl, CELLS_TEX_SIZE, RGBA, NEAREST, FLOAT),
      meanVelDens: utils.createTexture(gl, CELLS_TEX_SIZE, RGBA, NEAREST, FLOAT),
      positions: utils.createTexture(gl, DATA_TEX_SIZE, RGBA, NEAREST, FLOAT, positions),
      _positions: utils.createTexture(gl, DATA_TEX_SIZE, RGBA, NEAREST, FLOAT),
      velDens: utils.createTexture(gl, DATA_TEX_SIZE, RGBA, NEAREST, FLOAT),
      _velDens: utils.createTexture(gl, DATA_TEX_SIZE, RGBA, NEAREST, FLOAT),
      activity: utils.createTexture(gl, CELLS_TEX_SIZE, RGBA, NEAREST, FLOAT),
      nodes: utils.createTexture(gl, CELLS_TEX_SIZE, RGBA, NEAREST, FLOAT),
      pyramid: utils.createTexture(gl, CELLS_TEX_SIZE, RGBA, NEAREST, FLOAT),
      pyramidLvls: Array(...Array(CELLS_PYRAMID_LVLS)).map((_, i) =>
        utils.createTexture(gl, 1 << i, RGBA, NEAREST, FLOAT)),
      totalActive: utils.createTexture(gl, 1, RGBA, NEAREST, UNSIGNED_BYTE),
      traversal: utils.createTexture(gl, CELLS_TEX_SIZE, RGBA, NEAREST, FLOAT),
      mcCases: utils.createTexture(gl, 64, RGBA, NEAREST, FLOAT, mcCasesTex),
      vertices: [0, 0, 0].map(_ =>
        utils.createTexture(gl, TRIANGLES_TEX_SIZE, RGBA, NEAREST, FLOAT)),
      normals: [0, 0, 0].map(_ =>
        utils.createTexture(gl, TRIANGLES_TEX_SIZE, RGBA, NEAREST, FLOAT))
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
      activity: utils.createFramebuffer(this.gl, this.textures.activity),
      nodes: utils.createFramebuffer(this.gl, this.textures.nodes),
      pyramidLvls: this.textures.pyramidLvls.map(tex => utils.createFramebuffer(this.gl, tex)),
      totalActive: utils.createFramebuffer(this.gl, this.textures.totalActive),
      traversal: utils.createFramebuffer(this.gl, this.textures.traversal),
      triangles: utils.createMRTFramebuffer(this.gl, this.extensions.mrt,
                                            ...this.textures.vertices,
                                            ...this.textures.normals)
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
    this.drawParticles(this.programs.mean, this.framebuffers.cells, {
      positions: this.textures.positions,
      velDens: this.textures.velDens,
      nCells: 3/(2*this.ratio)
    }, true, true);
  }

  evaluateDensities() {
    this.drawParticles(this.programs.density, this.framebuffers.velDens, {
      positions: this.textures.positions,
      meanPositions: this.textures.meanPositions,
      nCells: 3/(2*this.ratio),
      mass: this.mass,
      ratio2: this.ratio*this.ratio,
      wDefault: 315/(64*Math.PI * this.ratio**9)
    }, false, true);
  }

  evaluateMeanDensities() {
    this.drawParticles(this.programs.meanDensity, this.framebuffers.cells, {
      positions: this.textures.positions,
      velDens: this.textures.velDens,
      nCells: 3/(2*this.ratio)
    }, false, true);
  }

  evaluateLagrange() {
    this.drawParticles(this.programs.lagrange, this.framebuffers.lagrange, {
      positions: this.textures.positions,
      velDens: this.textures.velDens,
      meanPositions: this.textures.meanPositions,
      meanVelDens: this.textures.meanVelDens,
      nCells: 3/(2*this.ratio),
      ratio: this.ratio,
      ratio2: this.ratio*this.ratio,
      _3ratio2: 3*this.ratio*this.ratio,
      pressureK: this.pressureK,
      density0: this.density0,
      viscosity: this.viscosity,
      tension: this.tension,
      threshold: Math.sqrt(3*this.mass/(4*Math.PI*this.ratio**3)),
      deltaT: this.deltaT,
      mass: this.mass,
      gravity: this.gravity,
      wPressure: -45/(Math.PI*this.ratio**6),
      wViscosity: 45/(Math.PI*this.ratio**6),
      wTension: -945/(32*Math.PI*this.ratio**9)
    });

    let t = this.textures;
    [t.positions, t._positions] = [t._positions, t.positions];
    [t.velDens, t._velDens] = [t._velDens, t.velDens];

    let f = this.framebuffers;
    [f.velDens, f._velDens] = [f._velDens, f.velDens];
    [f.lagrange, f._lagrange] = [f._lagrange, f.lagrange];
  }

  render() {
    let {gl} = this;

    this.camera.update();

    if (this.mode !== 'wireframe')
      this.generateSurface();

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    let {drawingBufferWidth: vw, drawingBufferHeight: vh} = gl;

    switch (this.mode) {
      case 'wireframe':
        gl.viewport(0, 0, vw, vh);
        this.renderBBox();
        this.renderParticles();
        break;

      case 'mockup':
        gl.viewport(0, 0, vw, vh);
        this.renderBBox();
        this.renderSurface();
        break;

      case 'dual':
        gl.enable(gl.SCISSOR_TEST);

        gl.viewport(-vw/4, 0, vw, vh);
        gl.scissor(0, 0, vw/2, vh);
        this.renderBBox();
        this.renderParticles();

        gl.viewport(vw/4, 0, vw, vh);
        gl.scissor(vw/2, 0, vw/2, vh);
        this.renderBBox();
        this.renderSurface();

        gl.disable(gl.SCISSOR_TEST);
        break;
    }

    gl.disable(gl.BLEND);
    gl.disable(gl.DEPTH_TEST);
  }

  renderBBox() {
    let [program, buffer] = [this.programs.bbox, this.buffers.bbox];

    this.gl.useProgram(program);
    utils.setUniforms(program, {
      viewProj: this.camera.matrix,
      color: [1, 1, 1, 1]
    });
    utils.setBuffersAndAttributes(this.gl, program, buffer);
    this.gl.drawArrays(this.gl.LINES, 0, 24);
  }

  renderParticles() {
    let [program, buffer] = [this.programs.particle, this.buffers.particles];

    this.gl.useProgram(program);
    utils.setUniforms(program, {
      viewProj: this.camera.matrix,
      positions: this.textures.positions,
      color: [.92, .96, .98, 1]
    });
    utils.setBuffersAndAttributes(this.gl, program, buffer);
    this.gl.drawArrays(this.gl.POINTS, 0, this.nParticles);
  }

  renderSurface() {
    let {gl} = this;
    let program = this.programs.renderSurface;

    gl.useProgram(program);
    utils.setBuffersAndAttributes(gl, program, this.buffers.surface);

    utils.setUniforms(program, {
      vertices: this.textures.vertices,
      normals: this.textures.normals,
      viewProj: this.camera.matrix
    });

    gl.drawArrays(gl.TRIANGLES, 0, 12 * this.activeCells);
  }

  generateSurface() {
    this.evaluateNodes();
    this.evaluateRelevant();
    this.createHystoPyramid();
    this.createTriangles();
  }

  evaluateNodes() {
    this.drawQuad(this.programs.node, this.framebuffers.nodes, {
      cells: this.textures.meanPositions
    });
  }

  evaluateRelevant() {
    this.drawQuad(this.programs.relevant, this.framebuffers.activity, {
      nodes: this.textures.nodes,
      range: this.range
    });
  }

  createHystoPyramid() {
    let {gl} = this;

    let lvl = CELLS_PYRAMID_LVLS;
    let offset = 0;

    while (lvl --> 0) {
      let size = 1 << lvl;
      //if (size > 1) {
        //gl.enable(gl.SCISSOR_TEST);
        //gl.scissor(0, 0, size, size * .5);
      //}

      this.drawQuad(this.programs.pyramid, this.framebuffers.pyramidLvls[lvl], {
        data: this.textures.pyramidLvls[lvl + 1] || this.textures.activity,
        size: (1 << CELLS_PYRAMID_LVLS - lvl) / CELLS_TEX_SIZE
      });

      gl.bindTexture(gl.TEXTURE_2D, this.textures.pyramid);
      gl.copyTexSubImage2D(gl.TEXTURE_2D, 0, offset, 0, 0, 0, size, size);
      gl.bindTexture(gl.TEXTURE_2D, null);

      offset += size;
      //gl.disable(gl.SCISSOR_TEST);
    }

    // Read the total active cells.
    this.drawQuad(this.programs.packFloat, this.framebuffers.totalActive, {
      data: this.textures.pyramidLvls[0],
      invMax: CELLS_TEX_SIZE**-2
    });

    let pixels = new Uint8Array(4);
    this.gl.readPixels(0, 0, 1, 1, this.gl.RGBA, this.gl.UNSIGNED_BYTE, pixels);
    let activeCells = (pixels[0]  + pixels[1]/255 + pixels[2]/65025 + pixels[3]/160581375);
    activeCells *= CELLS_TEX_SIZE**2 / 255;
    this.activeCells = Math.round(activeCells);
  }

  createTriangles() {
    // Parse the pyramid for compaction.
    this.drawPoints(this.programs.compact, this.framebuffers.traversal,
                    this.buffers.compact, {
      base: this.textures.activity,
      pyramid: this.textures.pyramid
    }, this.activeCells);

    // Create triangles.
    this.drawPoints(this.programs.triangleCreator, this.framebuffers.triangles,
                    this.buffers.creator, {
      cellSize: 2/3*this.ratio,
      range: this.range,
      potentials: this.textures.nodes,
      traversal: this.textures.traversal,
      mcCases: this.textures.mcCases
    }, 4*this.activeCells);
  }

  drawParticles(program, framebuffer, uniforms, clear = false, add = false) {
    this.drawPoints(program, framebuffer, this.buffers.particles,
                    uniforms, this.nParticles, clear, add);
  }

  drawQuad(program, framebuffer, uniforms) {
    let {gl} = this;

    gl.useProgram(program);
    utils.setUniforms(program, uniforms);
    utils.setBuffersAndAttributes(gl, program, this.buffers.quad);

    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    gl.viewport(0, 0, framebuffer.size, framebuffer.size);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  drawPoints(program, framebuffer, buffers, uniforms, count, clear = false, add = false) {
    let {gl} = this;

    gl.useProgram(program);
    utils.setUniforms(program, uniforms);
    utils.setBuffersAndAttributes(gl, program, buffers);

    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    gl.viewport(0, 0, framebuffer.size, framebuffer.size);

    if (add) {
      gl.enable(gl.BLEND);
      gl.blendEquation(gl.FUNC_ADD);
      gl.blendFunc(gl.ONE, gl.ONE);
    }

    if (clear) {
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
    }

    gl.drawArrays(gl.POINTS, 0, count);
    if (add) gl.disable(gl.BLEND);
  }
}
