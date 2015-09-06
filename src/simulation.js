import * as utils from './utils';
import BBox from './bbox';
import Camera from './camera';

import bboxTmpl from './glsl/bbox.vert';
import particlesTmpl from './glsl/particles.vert';

import colorTmpl from './glsl/color.frag';


const TEX_SIZE = 1024;

export default class Simulation {
  constructor(gl) {
    this.gl = gl;

    this.particles = 50000;
    this.dt = 0.01;

    this.camera = new Camera;
    this.bbox = new BBox(.5, .5, .5);

    this.initExtensions();
    this.initShaders();
    this.initBuffers();
    this.initTextures();
  }

  initExtensions() {
    let floatExt = this.gl.getExtension('OES_texture_float');
    if (floatExt)
      this.textureFloatType = this.gl.FLOAT;
    else {
      floatExt = this.gl.getExtension('OES_texture_half_float');
      if (floatExt)
        this.textureFloatType = floatExt.HALF_FLOAT_OES;
      else
        throw new Error("OES_texture_float and OES_texture_half_float is not available");
    }
  }

  initShaders() {
    let vs = (tmpl, consts) => utils.compileVertexShader(this.gl, tmpl(consts));
    let fs = (tmpl, consts) => utils.compileFragmentShader(this.gl, tmpl(consts));
    let link = (vs, fs) => utils.createProgramInfo(this.gl, vs, fs);

    let bbox = vs(bboxTmpl),
        particles = vs(particlesTmpl);

    let color = fs(colorTmpl);

    this.programs = {
      bbox: link(bbox, color),
      particles: link(particles, color)
    };
  }

  initBuffers() {
    let coords = [];
    for (let i = 0; i < this.particles; ++i)
      coords.push(((i % TEX_SIZE) + .5)/TEX_SIZE, ((i / TEX_SIZE|0) + .5)/TEX_SIZE);

    this.buffers = {
      particles: utils.createBufferInfo(this.gl, {
        coord: {dims: 2, data: coords}
      }),
      bbox: utils.createBufferInfo(this.gl, {
        position: {dims: 3, data: this.bbox.corners}
      })
    };
  }

  initTextures() {
    let {width: bw, height: bh, depth: bd} = this.bbox;

    let positions = new Float32Array(3 * TEX_SIZE * TEX_SIZE);
    for (let i = 0; i < positions.length; i += 3) {
      positions[ i ] = -bw/2 + Math.random()*bw/3;
      positions[i+1] =  bh/2 - Math.random()*bh/3;
      positions[i+2] = -bd/2 + Math.random()*bd/3;
    }

    let gl = this.gl;
    let {RGB, NEAREST, FLOAT} = gl;

    this.textures = {
      positions: utils.createTextureInfo(gl, TEX_SIZE, RGB, NEAREST, NEAREST, FLOAT, positions)
    };
  }

  resize() {
    this.gl.viewport(0, 0, this.gl.drawingBufferWidth, this.gl.drawingBufferHeight);
    this.camera.setAspect(this.gl.drawingBufferWidth/this.gl.drawingBufferHeight);
  }

  step() {
    this.gl.finish();
  }

  render() {
    this.camera.update();

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
    utils.drawBufferInfo(this.gl, this.gl.POINTS, buffer, this.particles);
  }
}
