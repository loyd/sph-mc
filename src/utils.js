export function compileVertexShader(gl, source) {
  return compileShader(gl, source, gl.VERTEX_SHADER);
}

export function compileFragmentShader(gl, source) {
  return compileShader(gl, source, gl.FRAGMENT_SHADER);
}

function compileShader(gl, source, type) {
  let shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS))
    throw new Error(`Could not compile shader: ${gl.getShaderInfoLog(shader)}`);

  return shader;
}

export function createProgramInfo(gl, vs, fs) {
  let program = createProgram(gl, vs, fs);

  return {
    program,
    uniformSetters: createUniformSetters(gl, program),
    attribSetters: createAttributeSetters(gl, program)
  };
}

function createProgram(gl, vs, fs) {
  let program = gl.createProgram();
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS))
      throw new Error(`Program failed to link: ${gl.getProgramInfoLog(program)}`);

  return program;
}

function createUniformSetters(gl, program) {
  let setters = Object.create(null);
  let count = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
  let textureUnit = 0;

  for (let i = 0; i < count; ++i) {
    let info = gl.getActiveUniform(program, i);
    if (!info)
      break;

    let name = info.name.replace('[0]', '');
    setters[name] = createUniformSetter(info);
  }

  return setters;

  function createUniformSetter(info) {
    let location = gl.getUniformLocation(program, info.name);
    let isArray = info.size > 1 && ~info.name.indexOf('[0]');

    switch (info.type) {
      case gl.FLOAT: return isArray ? (v => gl.uniform1fv(location, v))
                                    : (v => gl.uniform1f(location, v));
      case gl.FLOAT_VEC2: return v => gl.uniform2fv(location, v);
      case gl.FLOAT_VEC3: return v => gl.uniform3fv(location, v);
      case gl.FLOAT_VEC4: return v => gl.uniform4fv(location, v);
      case gl.INT: return isArray ? (v => gl.uniform1iv(location, v))
                                  : (v => gl.uniform1i(location, v));
      case gl.INT_VEC2: return v => gl.uniform2iv(location, v);
      case gl.INT_VEC3: return v => gl.uniform3iv(location, v);
      case gl.INT_VEC4: return v => gl.uniform4iv(location, v);
      case gl.BOOL: return isArray ? (v => gl.uniform1iv(location, v))
                                   : (v => gl.uniform1i(location, v));
      case gl.BOOL_VEC2: return v => gl.uniform2iv(location, v);
      case gl.BOOL_VEC3: return v => gl.uniform3iv(location, v);
      case gl.BOOL_VEC4: return v => gl.uniform4iv(location, v);
      case gl.FLOAT_MAT2: return v => gl.uniformMatrix2fv(location, false, v);
      case gl.FLOAT_MAT3: return v => gl.uniformMatrix3fv(location, false, v);
      case gl.FLOAT_MAT4: return v => gl.uniformMatrix4fv(location, false, v);
      case gl.SAMPLER_2D:
      case gl.SAMPLER_CUBE: {
        let bindPoint = info.type === gl.SAMPLER_2D ? gl.TEXTURE_2D : gl.TEXTURE_CUBE_MAP;

        if (isArray) {
          let units = [];

          for (let i = 0; i < info.size; ++i)
            units.push(textureUnit++);

          return textures => {
            gl.uniform1iv(location, units);
            for (let i = 0; i < textures.length; ++i) {
              gl.activeTexture(gl.TEXTURE0 + units[i]);
              gl.bindTexture(bindPoint, texture[i]);
            }
          };
        } else {
          let unit = textureUnit++;

          return texture => {
            gl.uniform1i(location, unit);
            gl.activeTexture(gl.TEXTURE0 + unit);
            gl.bindTexture(bindPoint, texture);
          };
        }
      }
      default:
        throw new Error(`Unknown type: 0x${info.type.toString(16)}`);
    }
  }
}

function createAttributeSetters(gl, program) {
  let setters = Object.create(null);
  let count = gl.getProgramParameter(program, gl.ACTIVE_ATTRIBUTES);

  for (let i = 0; i < count; ++i) {
    let info = gl.getActiveAttrib(program, i);
    if (!info)
      break;

    setters[info.name] = createAttributeSetter(info);
  }

  return setters;

  function createAttributeSetter(info) {
    let location = gl.getAttribLocation(program, info.name);

    return b => {
      gl.bindBuffer(gl.ARRAY_BUFFER, b.buffer);
      gl.enableVertexAttribArray(location);
      gl.vertexAttribPointer(location, b.dims, gl.FLOAT, false, 0, 0);
    };
  }
}

export function setUniforms(programInfo, values) {
  let setters = programInfo.uniformSetters;

  for (let name in values)
    if (name in setters)
      setters[name](values[name]);
}

export function setBuffersAndAttributes(gl, programInfo, bufferInfo) {
  let {attribs, indices} = bufferInfo;
  let setters = programInfo.attribSetters;

  for (var name in attribs)
    if (name in setters)
      setters[name](attribs[name]);

  if (indices)
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indices);
}

export function createBufferInfo(gl, arrays, indices) {
  var attribs = Object.create(null);

  for (let name in arrays) {
    let {data, dims} = arrays[name];
    let typed = new Float32Array(data);

    attribs[name] = {
      buffer: createBufferFromTypedArray(gl, typed, gl.ARRAY_BUFFER),
      dims: dims
    };
  }

  if (indices) {
    indices = new Uint16Array(indices);
    indices = createBufferFromTypedArray(gl, indices, gl.ELEMENT_ARRAY_BUFFER);
  }

  return {attribs, indices};
}

function createBufferFromTypedArray(gl, array, type) {
    let buffer = gl.createBuffer();
    gl.bindBuffer(type, buffer);
    gl.bufferData(type, array, gl.STATIC_DRAW);
    return buffer;
}

export function createTextureInfo(gl, size, format, maxFilter, minFilter, type, data = null) {
  let texture = gl.createTexture();

  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(gl.TEXTURE_2D, 0, format, size, size, 0, format, type, data);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, maxFilter);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, minFilter);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.bindTexture(gl.TEXTURE_2D, null);

  return {texture, size};
}

export function createFramebuffer(textureInfo) {
  let {texture, size} = textureInfo;

  let buffer = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, buffer);
  buffer.width = size;
  buffer.height = size;

  let renderbuffer = gl.createRenderbuffer();
  gl.bindRenderbuffer(gl.RENDERBUFFER, renderbuffer);
  gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, size, size);

  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
  gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, renderbuffer);

  gl.bindTexture(gl.TEXTURE_2D, null);
  gl.bindRenderbuffer(gl.RENDERBUFFER, null);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);

  return buffer;
}

export function drawBufferInfo(gl, type, bufferInfo, count) {
  if (bufferInfo.indices)
    gl.drawElements(type, count, gl.UNSIGNED_SHORT, 0);
  else
    gl.drawArrays(type, 0, count);
}
