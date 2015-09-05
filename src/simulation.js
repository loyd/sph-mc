import * as utils from './utils';
import BBox from './bbox';
import Camera from './camera';

import bboxTmpl from './glsl/bbox.vert';
import colorTmpl from './glsl/color.frag';


export default class Simulation {
  constructor(gl) {
    this.gl = gl;

    this.dt = 0.01;

    this.camera = new Camera;
    this.bbox = new BBox(.5, .5, .5);

    this.initExtensions();
    this.initShaders();
    this.initBuffers();
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
        color = fs(colorTmpl);

    this.programs = {
      bbox: link(bbox, color)
    };
  }

  initBuffers() {
    this.buffers = {
      bbox: utils.createBufferInfo(this.gl, {
        aVertexPosition: {dims: 3, data: this.bbox.corners}
      })
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

    this.gl.finish();
  }

  renderBBox() {
    let [program, buffer] = [this.programs.bbox, this.buffers.bbox];

    this.gl.useProgram(program.program);
    utils.setUniforms(program, {uVPMatrix: this.camera.matrix});
    utils.setBuffersAndAttributes(this.gl, program, buffer);
    utils.drawBufferInfo(this.gl, this.gl.LINES, buffer, 24);
  }
}
