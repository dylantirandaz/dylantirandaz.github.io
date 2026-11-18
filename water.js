// Watercolour that flows behind the page.
//
// A fragment shader paints pigment on a canvas as large as the page, so the
// washes scroll with the text. The pigment follows a noise field that is bent
// by two more noise fields, and all three move with time. That is why the
// colour runs and folds as water does: no shape is drawn and then moved.
//
// The canvas has one cell for each few screen pixels. A wash has no fine
// detail, so the browser can enlarge it, and the cost for each frame stays low.
(() => {
  const FRAGMENT_SHADER = `
    precision highp float;
    uniform vec2 size;   // canvas cells
    uniform float time;  // seconds, at the speed of the flow

    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
    }

    float noise(vec2 p) {
      vec2 cell = floor(p);
      vec2 f = fract(p);
      vec2 u = f * f * (3.0 - 2.0 * f);
      return mix(
        mix(hash(cell), hash(cell + vec2(1.0, 0.0)), u.x),
        mix(hash(cell + vec2(0.0, 1.0)), hash(cell + vec2(1.0, 1.0)), u.x),
        u.y);
    }

    // Four octaves of noise; the result is between 0 and 1.
    float fbm(vec2 p) {
      float sum = 0.0;
      float weight = 0.5;
      for (int octave = 0; octave < 4; octave++) {
        sum += weight * noise(p);
        p = p * 2.03 + vec2(17.0, 9.0);
        weight *= 0.5;
      }
      return sum / 0.9375;
    }

    // Fresco pigments.
    const vec3 ROSE = vec3(0.843, 0.631, 0.600);
    const vec3 AZURITE = vec3(0.247, 0.369, 0.576);
    const vec3 OCHRE = vec3(0.784, 0.608, 0.235);
    const vec3 TERRA_VERDE = vec3(0.482, 0.549, 0.416);

    void main() {
      // Page position: x from 0 to 1 across the page, y in the same unit from the top.
      vec2 page = vec2(gl_FragCoord.x, size.y - gl_FragCoord.y) / size.x;
      // The water runs slowly down and to the right.
      vec2 p = page * 1.5 - time * vec2(0.012, 0.02);

      // Two currents bend the field that holds the pigment.
      vec2 slow = vec2(
        fbm(p + vec2(0.0, 0.05 * time)),
        fbm(p + vec2(5.2, 1.3) - 0.04 * time));
      vec2 fast = vec2(
        fbm(p + 2.6 * slow + vec2(1.7, 9.2) + 0.11 * time),
        fbm(p + 2.6 * slow + vec2(8.3, 2.8) - 0.09 * time));
      float pigment = fbm(p + 2.8 * fast);

      // The currents also set which pigment is in the water, so colours run into each other.
      vec3 colour = mix(
        mix(ROSE, AZURITE, smoothstep(0.38, 0.62, slow.x)),
        mix(OCHRE, TERRA_VERDE, smoothstep(0.38, 0.62, slow.y)),
        smoothstep(0.42, 0.58, fast.x));

      // A soft body of colour, and a darker line at its edge where pigment collects.
      float body = smoothstep(0.50, 0.68, pigment);
      float rim = exp(-pow((pigment - 0.535) / 0.018, 2.0));
      // Paper grain; it stays with the page, not with the water.
      float grain = 0.82 + 0.36 * noise(page * 90.0);
      float alpha = (0.62 * body + 0.16 * rim) * grain;

      gl_FragColor = vec4(colour * alpha, alpha);
    }
  `;

  const VERTEX_SHADER = `
    attribute vec2 corner;
    void main() {
      gl_Position = vec4(corner, 0.0, 1.0);
    }
  `;

  const canvas = document.querySelector('.washes');
  const gl = canvas.getContext('webgl', { antialias: false });
  if (gl === null) {
    throw new Error('water.js: WebGL is not available, so the washes cannot be drawn.');
  }

  function compile(type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      throw new Error('water.js: ' + gl.getShaderInfoLog(shader));
    }
    return shader;
  }

  const program = gl.createProgram();
  gl.attachShader(program, compile(gl.VERTEX_SHADER, VERTEX_SHADER));
  gl.attachShader(program, compile(gl.FRAGMENT_SHADER, FRAGMENT_SHADER));
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error('water.js: ' + gl.getProgramInfoLog(program));
  }
  gl.useProgram(program);

  // One triangle that covers the canvas.
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const corner = gl.getAttribLocation(program, 'corner');
  gl.enableVertexAttribArray(corner);
  gl.vertexAttribPointer(corner, 2, gl.FLOAT, false, 0, 0);

  const sizeUniform = gl.getUniformLocation(program, 'size');
  const timeUniform = gl.getUniformLocation(program, 'time');

  function draw(seconds) {
    // A long page on a phone is taller than a canvas can be at 3 pixels for each cell.
    const pixelsPerCell = Math.max(3, Math.ceil(canvas.clientHeight / 4000));
    const width = Math.ceil(canvas.clientWidth / pixelsPerCell);
    const height = Math.ceil(canvas.clientHeight / pixelsPerCell);
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
      gl.viewport(0, 0, width, height);
    }
    gl.uniform2f(sizeUniform, width, height);
    gl.uniform1f(timeUniform, seconds);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
    // Still water: one frame, and one more each time the page changes size.
    new ResizeObserver(() => draw(0)).observe(canvas);
  } else {
    // Less than 1 makes the water slower than the clock.
    const FLOW_SPEED = 0.45;
    const step = (milliseconds) => {
      draw(milliseconds / 1000 * FLOW_SPEED);
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }
})();
