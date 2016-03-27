import {vec2, vec3, mat4} from 'gl-matrix';

import * as utils from './utils';
import Camera from './camera';
import Mouse from './mouse';
import mcCases from './mc_cases';
import {BBox, Sphere} from './geometry';

import simpleTmpl from './glsl/simple.vert';
import cellTmpl from './glsl/cell.vert';
import index2dTmpl from './glsl/index2d.vert';
import particleTmpl from './glsl/particle.vert';
import quadTmpl from './glsl/quad.vert';
import traversalTmpl from './glsl/traversal.vert';
import renderSurfaceTmpl from './glsl/render_surface.vert';
import bboxTmpl from './glsl/bbox.vert';
import sphereTmpl from './glsl/sphere.vert';

import colorTmpl from './glsl/color.frag';
import meanTmpl from './glsl/mean.frag';
import densityTmpl from './glsl/density.frag';
import meanDensityTmpl from './glsl/mean_density.frag';
import lagrangeTmpl from './glsl/lagrange.frag';
import spreadTmpl from './glsl/spread.frag';
import nodeTmpl from './glsl/node.frag';
import relevantTmpl from './glsl/relevant.frag';
import pyramidTmpl from './glsl/pyramid.frag';
import packFloatTmpl from './glsl/pack_float.frag';
import compactTmpl from './glsl/compact.frag';
import triangleCreatorTmpl from './glsl/triangle_creator.frag';
import classicTmpl from './glsl/classic.frag';


export const MAX_PARTICLES = 262144;
export const MIN_RATIO = .01172;
export const MAX_VOXELS_PER_SIDE = 64;
export const MAX_TRIANGLES = 1048576;
export const SPHERE_RADIUS = .15;
export const SPHERE_DETAIL = 4;

export const DATA_TEX_SIZE = 2**Math.ceil(Math.log2(MAX_PARTICLES)/2);
export const CELL_XY_TEX_SIZE = 2**Math.ceil(Math.log2(3/(2*MIN_RATIO)));
export const CELL_Z_TEX_SIZE = 2**Math.ceil(Math.log2(CELL_XY_TEX_SIZE)/2);
export const CELLS_TEX_SIZE = CELL_XY_TEX_SIZE * CELL_Z_TEX_SIZE;
export const VOXEL_XY_TEX_SIZE = 2**Math.ceil(Math.log2(MAX_VOXELS_PER_SIDE));
export const VOXEL_Z_TEX_SIZE = 2**Math.ceil(Math.log2(VOXEL_XY_TEX_SIZE)/2);
export const VOXELS_TEX_SIZE = VOXEL_XY_TEX_SIZE * VOXEL_Z_TEX_SIZE;
export const VOXELS_PYRAMID_LVLS = Math.log2(VOXELS_TEX_SIZE);
export const TRIANGLES_TEX_SIZE = 2**Math.ceil(Math.log2(MAX_TRIANGLES)/2);

if (console && console.group) {
  console.group('Limits');
  console.info('Max particles: %f', MAX_PARTICLES);
  console.info('Data tex size: %fx%1$f', DATA_TEX_SIZE);
  console.info('Min ratio: %f', MIN_RATIO);
  console.info('Cells shape: (%f, %1$f, %f)', CELL_XY_TEX_SIZE, CELL_Z_TEX_SIZE**2);
  console.info('Cells tex size: %fx%1$f', CELLS_TEX_SIZE);
  console.info('Max voxels per side: %f', MAX_VOXELS_PER_SIDE);
  console.info('Voxels shape: (%f, %1$f, %f)', VOXEL_XY_TEX_SIZE, VOXEL_Z_TEX_SIZE**2);
  console.info('Voxels tex size: %fx%1$f', VOXELS_TEX_SIZE);
  console.info('Histogram pyramid levels: %f', VOXELS_PYRAMID_LVLS);
  console.info('Max triangles: %f', MAX_TRIANGLES);
  console.info('Triangles tex size: %fx%1$f', TRIANGLES_TEX_SIZE);
  console.info('Sphere radius: %f, detail: %f', SPHERE_RADIUS, SPHERE_DETAIL);
  console.groupEnd('Limits');
}


export default class Simulation {
  constructor(gl, resources) {
    this.gl = gl;

    this.gravity = -9.81;
    this.deltaT = .007;
    this.realtime = false;
    this.paused = false;

    this.density0 = 998.29;
    this.viscosity = 3.5;
    this.pressureK = 3;
    this.tension = .0728;
    this.restitution = 0;

    this.nParticles = 50000;
    this.mass = .007;
    this.ratio = .0457;
    this.mode = 'mockup';

    this.spread = 3;
    this.nVoxels = 40;
    this.isolevel = .53;

    this.ambient = .03;
    this.diffuse = .15;
    this.specular = .8;
    this.shininess = 10;
    this.attenuation = .8;
    this.color = [.4, .53, .7];
    this.opacity = .3;

    this.wait = {
      nParticles: this.nParticles
    };

    this.bbox = new BBox();
    this.sphere = new Sphere([.8, .15, .8], SPHERE_RADIUS, SPHERE_DETAIL);
    this.camera = new Camera([.5, .3, .5]);

    let interactive = false;
    this.mouse = new Mouse(gl.canvas)
      .on('down', () => interactive = this.isOverSphere())
      .on('up', () => interactive = false)
      .on('wheel', dw => this.camera.zoom(dw))
      .on('move', (dx, dy) => interactive ? this.moveSphere(dx, dy)
                                          : this.camera.rotate(dx, dy));

    this.activeCells = 0;

    this.extensions = this.getExtensions();
    this.programs = this.createPrograms();
    this.buffers = this.createBuffers();
    this.textures = this.createTextures(resources);
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
      sphereRadius: SPHERE_RADIUS
    };

    let voxelConsts = {
      zSize: VOXEL_Z_TEX_SIZE+'.',
      xySize: VOXEL_XY_TEX_SIZE+'.',
      totalSize: VOXELS_TEX_SIZE+'.',
      pyramidLvls: VOXELS_PYRAMID_LVLS+'.',
    };

    let simple = vs(simpleTmpl),
        cell = vs(cellTmpl, cellConsts),
        voxel = vs(cellTmpl, voxelConsts),
        index2d = vs(index2dTmpl),
        particle = vs(particleTmpl),
        quad = vs(quadTmpl),
        traversal = vs(traversalTmpl),
        renderSurface = vs(renderSurfaceTmpl),
        bbox = vs(bboxTmpl),
        sphere = vs(sphereTmpl);

    let mean = fs(meanTmpl),
        density = fs(densityTmpl, cellConsts),
        meanDensity = fs(meanDensityTmpl),
        lagrange = fs(lagrangeTmpl, cellConsts),
        color = fs(colorTmpl),
        spread = fs(spreadTmpl, voxelConsts),
        node = fs(nodeTmpl, voxelConsts),
        relevant = fs(relevantTmpl, voxelConsts),
        pyramid = fs(pyramidTmpl),
        packFloat = fs(packFloatTmpl),
        compact = fs(compactTmpl, voxelConsts),
        triangleCreator = fs(triangleCreatorTmpl, voxelConsts),
        classic = fs(classicTmpl);

    return {
      mean: link(cell, mean),
      density: link(index2d, density),
      meanDensity: link(cell, meanDensity),
      lagrange: link(index2d, lagrange),
      wireframe: link(simple, color),
      particle: link(particle, color),
      activity: link(voxel, color),
      spread: link(quad, spread),
      node: link(quad, node),
      relevant: link(quad, relevant),
      pyramid: link(quad, pyramid),
      packFloat: link(quad, packFloat),
      compact: link(traversal, compact),
      triangleCreator: link(traversal, triangleCreator),
      renderSurface: link(renderSurface, classic),
      bbox: link(bbox, classic),
      sphere: link(sphere, classic)
    };
  }

  createBuffers() {
    let coords = new Float32Array(2 * DATA_TEX_SIZE**2);
    for (let i = 0, n = DATA_TEX_SIZE**2; i < n; ++i) {
      coords[ i*2 ] = ((i % DATA_TEX_SIZE) + .5)/DATA_TEX_SIZE;
      coords[i*2+1] = ((i / DATA_TEX_SIZE|0) + .5)/DATA_TEX_SIZE;
    }

    let quad = [-1, -1, 1, -1, -1, 1, 1, 1];

    let indexes = new Float32Array(Math.max(VOXELS_TEX_SIZE, TRIANGLES_TEX_SIZE)**2);

    let activeCellCoords = new Float32Array(2 * VOXELS_TEX_SIZE**2);
    for (let i = 0, n = VOXELS_TEX_SIZE**2; i < n; ++i) {
      indexes[i] = i;
      activeCellCoords[ 2*i ] = ((i % VOXELS_TEX_SIZE) + .5)/VOXELS_TEX_SIZE;
      activeCellCoords[2*i+1] = ((i / VOXELS_TEX_SIZE|0) + .5)/VOXELS_TEX_SIZE;
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
        aposition: {dims: 3, data: this.bbox.vertices},
        anormal: {dims: 3, data: this.bbox.normals},
        texCoord: {dims: 2, data: this.bbox.texCoords}
      }, this.bbox.faces),
      bboxWireframe: utils.createBuffers(this.gl, {
        position: {dims: 3, data: this.bbox.vertices}
      }, this.bbox.edges),
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
      }),
      sphere: utils.createBuffers(this.gl, {
        aposition: {dims: 3, data: this.sphere.vertices}
      }, this.sphere.faces),
      sphereWireframe: utils.createBuffers(this.gl, {
        position: {dims: 3, data: this.sphere.vertices}
      }, this.sphere.edges)
    };
  }

  createTextures(resources) {
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
    let {RGB, RGBA, UNSIGNED_BYTE, NEAREST, LINEAR, LINEAR_MIPMAP_LINEAR} = gl;
    let FLOAT = this.extensions.float.type;

    return {
      meanPositions: utils.createTexture(gl, CELLS_TEX_SIZE, RGBA, NEAREST, FLOAT),
      meanVelDens: utils.createTexture(gl, CELLS_TEX_SIZE, RGBA, NEAREST, FLOAT),
      positions: utils.createTexture(gl, DATA_TEX_SIZE, RGBA, NEAREST, FLOAT, positions),
      _positions: utils.createTexture(gl, DATA_TEX_SIZE, RGBA, NEAREST, FLOAT),
      velDens: utils.createTexture(gl, DATA_TEX_SIZE, RGBA, NEAREST, FLOAT),
      _velDens: utils.createTexture(gl, DATA_TEX_SIZE, RGBA, NEAREST, FLOAT),
      activity: utils.createTexture(gl, VOXELS_TEX_SIZE, RGBA, NEAREST, FLOAT),
      nodes: utils.createTexture(gl, VOXELS_TEX_SIZE, RGBA, NEAREST, FLOAT),
      pyramid: utils.createTexture(gl, VOXELS_TEX_SIZE, RGBA, NEAREST, FLOAT),
      pyramidLvls: Array(...Array(VOXELS_PYRAMID_LVLS)).map((_, i) =>
        utils.createTexture(gl, 1 << i, RGBA, NEAREST, FLOAT)),
      totalActive: utils.createTexture(gl, 1, RGBA, NEAREST, UNSIGNED_BYTE),
      traversal: utils.createTexture(gl, VOXELS_TEX_SIZE, RGBA, NEAREST, FLOAT),
      mcCases: utils.createTexture(gl, 64, RGBA, NEAREST, FLOAT, mcCasesTex),
      vertices: [0, 0, 0].map(_ =>
        utils.createTexture(gl, TRIANGLES_TEX_SIZE, RGBA, NEAREST, FLOAT)),
      normals: [0, 0, 0].map(_ =>
        utils.createTexture(gl, TRIANGLES_TEX_SIZE, RGBA, NEAREST, FLOAT)),
      bbox: utils.createTextureFromImage(gl, RGB, LINEAR, LINEAR_MIPMAP_LINEAR, resources.tiles)
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

  pauseResume() {
    this.paused = !this.paused;
  }

  restart() {
    let {gl} = this;
    let FLOAT = this.extensions.float.type;

    let nParticles = this.wait.nParticles;
    let width = this.textures.positions.size;
    let height = Math.ceil(nParticles / width);
    let positions = new Float32Array(4 * width * height);

    utils.fillTexture(gl, this.textures.velDens, gl.RGBA, FLOAT, positions);

    let volume = Math.pow(this.mass * nParticles / this.density0, 1/3);
    for (let i = 0, n = 4 * nParticles; i < n; i += 4) {
      positions[ i ] = Math.random() * volume;
      positions[i+1] = 1 - Math.random() * volume;
      positions[i+2] = Math.random() * volume;
    }

    utils.fillTexture(gl, this.textures.positions, gl.RGBA, FLOAT, positions);
    this.nParticles = nParticles;

    if (this.paused && this.mode !== 'wireframe')
      this.generateSurface();
  }

  resize() {
    this.gl.viewport(0, 0, this.gl.drawingBufferWidth, this.gl.drawingBufferHeight);
    this.camera.setAspect(this.gl.drawingBufferWidth/this.gl.drawingBufferHeight);
  }

  isOverSphere() {
    let mx = (this.mouse.cursor.x / this.gl.drawingBufferWidth) * 2 - 1;
    let my = -(this.mouse.cursor.y / this.gl.drawingBufferHeight) * 2 + 1;
    let [cx, cy] = vec3.transformMat4(vec3.create(), this.sphere.center, this.camera.matrix);

    if (this.mode === 'dual')
      mx += mx < 0 ? .5 : -.5;

    let r2 = this.sphere.radius**2;
    let d2 = vec3.sqrDist(this.sphere.center, this.camera.position);
    let fovy = this.camera.fov/this.camera.curZoom;
    let pr2 = r2 / (Math.tan(fovy/2)**2 * (d2 - r2));
    return ((mx-cx)*this.camera.aspect)**2 + (my-cy)**2 < pr2;
  }

  moveSphere(dx, dy) {
    let delta = [(dx / this.gl.drawingBufferWidth) * 2,
                 -(dy / this.gl.drawingBufferHeight) * 2];

    let origin = vec3.fromValues(0, 0, 0);
    let [xAxis, zAxis] = [vec3.fromValues(1, 0, 0), vec3.fromValues(0, 0, 1)];
    vec3.transformMat4(origin, origin, this.camera.matrix);
    vec2.sub(xAxis, vec3.transformMat4(xAxis, xAxis, this.camera.matrix), origin);
    vec2.sub(zAxis, vec3.transformMat4(zAxis, zAxis, this.camera.matrix), origin);

    let sx = vec2.dot(delta, xAxis) / vec2.dot(xAxis, xAxis);
    let sz = vec2.dot(delta, zAxis) / vec2.dot(zAxis, zAxis);

    let cx = this.sphere.center[0];
    let cz = this.sphere.center[2];
    let r = this.sphere.radius;

    this.sphere.center[0] = Math.max(r, Math.min(cx + sx, 1 - r));
    this.sphere.center[2] = Math.max(r, Math.min(cz + sz, 1 - r));
  }

  step() {
    if (this.paused)
      return;

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
      restitution: this.restitution,
      deltaT: this.deltaT,
      mass: this.mass,
      gravity: this.gravity,
      wPressure: -45/(Math.PI*this.ratio**6),
      wViscosity: 45/(Math.PI*this.ratio**6),
      wTension: -945/(32*Math.PI*this.ratio**9),
      sphereCenter: this.sphere.center
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

    if (this.mode !== 'wireframe' && !this.paused)
      this.generateSurface();

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);

    let {drawingBufferWidth: vw, drawingBufferHeight: vh} = gl;

    switch (this.mode) {
      case 'wireframe':
        gl.viewport(0, 0, vw, vh);
        this.renderSphereWireframe();
        this.renderBBoxWireframe();
        this.renderParticles();
        break;

      case 'mockup':
        gl.viewport(0, 0, vw, vh);
        this.renderSphere();
        this.renderBBox();
        this.renderSurface();
        break;

      case 'dual':
        gl.enable(gl.SCISSOR_TEST);

        gl.viewport(-vw/4, 0, vw, vh);
        gl.scissor(0, 0, vw/2, vh);
        this.renderSphereWireframe();
        this.renderBBoxWireframe();
        this.renderParticles();

        gl.viewport(vw/4, 0, vw, vh);
        gl.scissor(vw/2, 0, vw/2, vh);
        this.renderSphere();
        this.renderBBox();
        this.renderSurface();

        gl.disable(gl.SCISSOR_TEST);
        break;
    }

    gl.disable(gl.DEPTH_TEST);
  }

  renderSphereWireframe() {
    let [program, buffer] = [this.programs.wireframe, this.buffers.sphereWireframe];

    this.gl.useProgram(program);
    utils.setUniforms(program, {
      mvp: mat4.translate(mat4.create(), this.camera.matrix, this.sphere.center),
      color: [.39, .24, .02, 1]
    });

    utils.setBuffersAndAttributes(this.gl, program, buffer);
    this.gl.drawElements(this.gl.LINES, this.sphere.edges.length, this.gl.UNSIGNED_SHORT, 0);
  }

  renderSphere() {
    let [program, buffer] = [this.programs.sphere, this.buffers.sphere];

    this.gl.useProgram(program);
    utils.setUniforms(program, {
      center: this.sphere.center,
      vp: this.camera.matrix,
      eye: this.camera.eye,
      ambient: this.ambient,
      diffuse: .25,
      specular: .45,
      shininess: 20,
      color: [.39, .24, .02],
      opacity: 1,
      texture: null
    });

    utils.setBuffersAndAttributes(this.gl, program, buffer);

    this.gl.enable(this.gl.CULL_FACE);
    this.gl.cullFace(this.gl.BACK);
    this.gl.drawElements(this.gl.TRIANGLES, this.sphere.faces.length, this.gl.UNSIGNED_SHORT, 0);
    this.gl.disable(this.gl.CULL_FACE);
  }

  renderBBoxWireframe() {
    let [program, buffer] = [this.programs.wireframe, this.buffers.bboxWireframe];

    this.gl.useProgram(program);
    utils.setUniforms(program, {
      mvp: this.camera.matrix,
      color: [1, 1, 1, 1]
    });
    utils.setBuffersAndAttributes(this.gl, program, buffer);
    this.gl.drawElements(this.gl.LINES, this.bbox.edges.length, this.gl.UNSIGNED_SHORT, 0);
  }

  renderBBox() {
    let [program, buffer] = [this.programs.bbox, this.buffers.bbox];

    this.gl.useProgram(program);
    utils.setUniforms(program, {
      mvp: this.camera.matrix,
      eye: this.camera.eye,
      ambient: this.ambient,
      diffuse: .4,
      specular: .35,
      shininess: 80,
      attenuation: this.attenuation,
      texture: this.textures.bbox,
      opacity: 1.
    });
    utils.setBuffersAndAttributes(this.gl, program, buffer);
    this.gl.enable(this.gl.CULL_FACE);
    this.gl.cullFace(this.gl.FRONT);
    this.gl.drawElements(this.gl.TRIANGLES, this.bbox.faces.length, this.gl.UNSIGNED_SHORT, 0);
    this.gl.disable(this.gl.CULL_FACE);
  }

  renderParticles() {
    let [program, buffer] = [this.programs.particle, this.buffers.particles];

    this.gl.useProgram(program);
    utils.setUniforms(program, {
      mvp: this.camera.matrix,
      positions: this.textures.positions,
      color: this.color.concat(1)
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
      mvp: this.camera.matrix,
      eye: this.camera.eye,
      ambient: this.ambient,
      diffuse: this.diffuse,
      specular: this.specular,
      shininess: this.shininess,
      attenuation: this.attenuation,
      color: this.color,
      opacity: this.opacity,
      texture: null
    });

    gl.enable(gl.BLEND);
    gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ZERO);
    gl.enable(gl.CULL_FACE);
    gl.cullFace(gl.BACK);
    gl.depthMask(false);

    gl.drawArrays(gl.TRIANGLES, 0, 12 * this.activeCells);

    gl.depthMask(true);
    gl.disable(gl.CULL_FACE);
    gl.disable(gl.BLEND);
  }

  generateSurface() {
    this.evaluateActivity();
    this.spreadActivity();
    this.evaluateNodes();
    this.evaluateRelevant();
    this.createHystoPyramid();
    this.createTriangles();
  }

  evaluateActivity() {
    this.drawParticles(this.programs.activity, this.framebuffers.activity, {
      positions: this.textures.positions,
      nCells: this.nVoxels,
      color: [1, 1, 1, 1]
    }, true);
  }

  spreadActivity() {
    for (let i = 0; i < this.spread; ++i) {
      this.drawQuad(this.programs.spread, this.framebuffers.nodes, {
        cells: this.textures.activity
      });

      let [t, f] = [this.textures, this.framebuffers];
      [t.activity, t.nodes] = [t.nodes, t.activity];
      [f.activity, f.nodes] = [f.nodes, f.activity];
    }
  }

  evaluateNodes() {
    this.drawQuad(this.programs.node, this.framebuffers.nodes, {
      cells: this.textures.activity
    });
  }

  evaluateRelevant() {
    this.drawQuad(this.programs.relevant, this.framebuffers.activity, {
      nodes: this.textures.nodes,
      isolevel: this.isolevel
    });
  }

  createHystoPyramid() {
    let {gl} = this;

    let lvl = VOXELS_PYRAMID_LVLS;
    let offset = 0;

    while (lvl --> 0) {
      let size = 1 << lvl;
      //if (size > 1) {
        //gl.enable(gl.SCISSOR_TEST);
        //gl.scissor(0, 0, size, size * .5);
      //}

      this.drawQuad(this.programs.pyramid, this.framebuffers.pyramidLvls[lvl], {
        data: this.textures.pyramidLvls[lvl + 1] || this.textures.activity,
        size: (1 << VOXELS_PYRAMID_LVLS - lvl) / VOXELS_TEX_SIZE
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
      invMax: VOXELS_TEX_SIZE**-2
    });

    let pixels = new Uint8Array(4);
    this.gl.readPixels(0, 0, 1, 1, this.gl.RGBA, this.gl.UNSIGNED_BYTE, pixels);
    let activeCells = (pixels[0]  + pixels[1]/255 + pixels[2]/65025 + pixels[3]/160581375);
    activeCells *= VOXELS_TEX_SIZE**2 / 255;
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
      cellSize: 1/this.nVoxels,
      isolevel: this.isolevel,
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
