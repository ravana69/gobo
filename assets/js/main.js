(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var BaseFilter, Rect,
  bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

Rect = require('./libs/object/Rect');

BaseFilter = (function() {
  function BaseFilter(gl, shader) {
    this.texture = bind(this.texture, this);
    this._attachUniform = bind(this._attachUniform, this);
    this.draw = bind(this.draw, this);
    this.attachTexture = bind(this.attachTexture, this);
    this.canvasSize = bind(this.canvasSize, this);
    this.init = bind(this.init, this);
    this._gl = gl;
    this._shader = shader;
    this._model;
    this._modelMtx;
    this._mvpMtx;
    this._prg;
    this._texture;
    this._drawSize = new Rect();
    this._frameBuffer;
    this._vbo = {};
    this._ibo;
  }

  BaseFilter.prototype.init = function() {
    this._modelMtx = MY.gu.createMatrix();
    this._mvpMtx = MY.gu.createMatrix();
    this._prg = MY.gu.createProgram(this._gl, MY.gu.createShader(this._gl, this._shader.v), MY.gu.createShader(this._gl, this._shader.f));
    this._model = MY.gu.planeModelData();
    this._vbo.position = MY.gu.createVBO(this._gl, this._prg, "position", 3, this._model.p);
    return this._ibo = MY.gu.createIBO(this._gl, this._model.i);
  };

  BaseFilter.prototype.canvasSize = function(w, h) {
    this._drawSize.w = w;
    this._drawSize.h = h;
    return this._frameBuffer = MY.gu.createFramebuffer(this._gl, this._drawSize.w, this._drawSize.h);
  };

  BaseFilter.prototype.attachTexture = function(texture) {
    return this._texture = texture;
  };

  BaseFilter.prototype.draw = function(cameraMtx, isDrawMainBuffer) {
    var m;
    if (isDrawMainBuffer) {
      this._gl.bindFramebuffer(this._gl.FRAMEBUFFER, null);
    } else {
      this._gl.bindFramebuffer(this._gl.FRAMEBUFFER, this._frameBuffer.f);
    }
    this._gl.clear(this._gl.COLOR_BUFFER_BIT | this._gl.DEPTH_BUFFER_BIT);
    MY.gu.attachProgram(this._gl, this._prg);
    m = MY.gu.m();
    m.identity(this._modelMtx);
    m.multiply(cameraMtx, this._modelMtx, this._mvpMtx);
    this._attachUniform();
    this._gl.activeTexture(this._gl.TEXTURE0);
    this._gl.bindTexture(this._gl.TEXTURE_2D, this._texture);
    MY.gu.attachUniform(this._gl, this._prg, "texture", "int", 0);
    this._gl.bindBuffer(this._gl.ELEMENT_ARRAY_BUFFER, this._ibo);
    MY.gu.attachVBO(this._gl, this._vbo.position);
    this._gl.drawElements(this._gl.TRIANGLES, this._model.i.length, this._gl.UNSIGNED_SHORT, 0);
    return this._gl.bindFramebuffer(this._gl.FRAMEBUFFER, null);
  };

  BaseFilter.prototype._attachUniform = function() {
    MY.gu.attachUniform(this._gl, this._prg, "mvpMatrix", "mat4", this._mvpMtx);
    return MY.gu.attachUniform(this._gl, this._prg, "resolution", "vec2", [this._drawSize.w, this._drawSize.h]);
  };

  BaseFilter.prototype.texture = function() {
    return this._frameBuffer.t;
  };

  return BaseFilter;

})();

module.exports = BaseFilter;


},{"./libs/object/Rect":30}],2:[function(require,module,exports){
var Bg, BgDots, BgLines, BgNoise, BlurFilter, Camera, ColorCorrectionFilter, FrameBuffer, FxaaFilter, GlitchFilter, PartialDraw,
  bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

Camera = require('./Camera');

FrameBuffer = require('./FrameBuffer');

BlurFilter = require('./BlurFilter');

FxaaFilter = require('./FxaaFilter');

GlitchFilter = require('./GlitchFilter');

ColorCorrectionFilter = require('./ColorCorrectionFilter');

BgNoise = require('./BgNoise');

PartialDraw = require('./PartialDraw');

BgLines = require('./BgLines');

BgDots = require('./BgDots');

Bg = (function() {
  function Bg(id) {
    this._update = bind(this._update, this);
    this._updateColor = bind(this._updateColor, this);
    this._resize = bind(this._resize, this);
    this.init = bind(this.init, this);
    this._id = id || "xBg";
    this._c;
    this._gl;
    this._camera;
    this._lines;
    this._dots;
    this._capture;
    this._colorFilter = [];
    this._fxaa;
    this._glitch;
    this._noise;
    this._noiseGlitch;
    this._partial;
    this._colors = [];
  }

  Bg.prototype.init = function() {
    var color, i, num;
    this._c = document.getElementById(this._id);
    this._gl = MY.gu.getGlContext(this._id);
    this._gl.enable(this._gl.DEPTH_TEST);
    this._gl.depthFunc(this._gl.LEQUAL);
    this._gl.enable(this._gl.BLEND);
    this._gl.blendFuncSeparate(this._gl.SRC_ALPHA, this._gl.ONE_MINUS_SRC_ALPHA, this._gl.ONE, this._gl.ONE);
    this._gl.clearColor(0, 0, 0, 1);
    this._gl.enable(this._gl.CULL_FACE);
    this._camera = new Camera(45);
    this._camera.init();
    this._lines = new BgLines(this._gl);
    this._lines.init();
    this._dots = new BgDots(this._gl);
    this._dots.init();
    i = 0;
    num = 3;
    while (i < num) {
      color = new ColorCorrectionFilter(this._gl);
      color.init();
      this._colorFilter.push(color);
      i++;
    }
    this._noise = new BgNoise(this._gl);
    this._noise.init();
    this._noiseGlitch = new BgNoise(this._gl);
    this._noiseGlitch.init();
    this._glitch = new GlitchFilter(this._gl);
    this._glitch.init();
    this._capture = new FrameBuffer(this._gl);
    this._capture.init();
    this._partial = new PartialDraw(this._gl);
    this._partial.init();
    i = 0;
    while (i < 9) {
      this._colors.push({
        key: MY.u.range(1000) * 0.001,
        val: 0
      });
      i++;
    }
    MY.resize.add(this._resize, true);
    MY.update.add(this._update);
    return MY.param.addCallBack("dotNum", (function(_this) {
      return function() {
        return _this._resize(MY.resize.sw(), MY.resize.sh());
      };
    })(this));
  };

  Bg.prototype._resize = function(w, h) {
    var i, j, len, ref, scale1, scale2, val;
    if ((window.devicePixelRatio != null) && window.devicePixelRatio >= 2) {
      scale1 = 2;
      scale2 = 1;
    } else {
      scale1 = 1;
      scale2 = 1;
    }
    this._c.width = w * scale1;
    this._c.height = h * scale1;
    $("#" + this._id).css({
      width: w * scale2,
      height: h * scale2
    });
    this._gl.viewport(0, 0, this._c.width, this._c.height);
    this._camera.pixel(this._c.height);
    w = this._c.width;
    h = this._c.height;
    this._lines.canvasSize(w, h);
    this._dots.createDots(w, h);
    this._capture.canvasSize(w, h);
    ref = this._colorFilter;
    for (i = j = 0, len = ref.length; j < len; i = ++j) {
      val = ref[i];
      val.canvasSize(w, h);
    }
    this._glitch.canvasSize(w, h);
    this._noise.create(w, h);
    return this._noiseGlitch.create(this._c.width, this._c.height);
  };

  Bg.prototype._updateColor = function() {
    var i, j, len, ref, val;
    ref = this._colors;
    for (i = j = 0, len = ref.length; j < len; i = ++j) {
      val = ref[i];
      val.val = MY.u.map(Math.sin(MY.u.radian(i * val.key + MY.update.cnt * val.key)), 0, 50, -1, 1);
    }
    MY.param.r0 = this._colors[0].val;
    MY.param.g0 = this._colors[1].val;
    MY.param.b0 = this._colors[2].val;
    MY.param.r1 = this._colors[3].val;
    MY.param.g1 = this._colors[4].val;
    MY.param.b1 = this._colors[5].val;
    MY.param.r2 = this._colors[6].val;
    MY.param.g2 = this._colors[7].val;
    return MY.param.b2 = this._colors[8].val;
  };

  Bg.prototype._update = function() {
    this._updateColor();
    this._camera.updateMatrix(this._c.width, this._c.height);
    this._capture.startCapture();
    this._lines.draw(this._camera.pvMatrix());
    if (MY.param.dot) {
      this._dots.draw(this._camera.pvMatrix());
    }
    this._capture.stopCapture();
    this._colorFilter[0].attachTexture(this._capture.texture());
    this._colorFilter[0].mulRGB(MY.param.r0 * 0.1, MY.param.g0 * 0.1, MY.param.b0 * 0.1);
    this._colorFilter[0].draw(MY.gu.orthoMatrix());
    this._colorFilter[1].attachTexture(this._capture.texture());
    this._colorFilter[1].mulRGB(MY.param.r1 * 0.1, MY.param.g1 * 0.1, MY.param.b1 * 0.1);
    this._colorFilter[1].draw(MY.gu.orthoMatrix());
    this._colorFilter[2].attachTexture(this._capture.texture());
    this._colorFilter[2].mulRGB(MY.param.r2 * 0.1, MY.param.g2 * 0.1, MY.param.b2 * 0.1);
    this._colorFilter[2].draw(MY.gu.orthoMatrix());
    this._capture.startCapture();
    this._partial.attachTexture(this._colorFilter[0].texture(), this._colorFilter[1].texture(), this._colorFilter[2].texture(), this._noise.texture());
    this._partial.draw(MY.gu.orthoMatrix());
    this._capture.stopCapture();
    this._glitch.attachNoiseTexture(this._noiseGlitch.texture());
    this._glitch.attachTexture(this._capture.texture());
    this._glitch.draw(MY.gu.orthoMatrix(), true);
    return this._gl.flush();
  };

  return Bg;

})();

module.exports = Bg;


},{"./BgDots":4,"./BgLines":5,"./BgNoise":6,"./BlurFilter":7,"./Camera":8,"./ColorCorrectionFilter":9,"./FrameBuffer":12,"./FxaaFilter":14,"./GlitchFilter":15,"./PartialDraw":19}],3:[function(require,module,exports){
var BgDotParts,
  bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

BgDotParts = (function() {
  function BgDotParts(gl, id) {
    this.draw = bind(this.draw, this);
    this.createVertex = bind(this.createVertex, this);
    this.dispose = bind(this.dispose, this);
    this.init = bind(this.init, this);
    this._gl = gl;
    this._id = id;
    this._model = {};
    this._modelMtx;
    this._mvpMtx;
    this._vsObj;
    this._fsObj;
    this._prg;
    this._vbo = {};
    this._range;
    this._speed;
    this._translate = {
      x: 0,
      y: 0,
      z: 0
    };
    this._translateOffset = {
      x: 0,
      y: 0,
      z: 0
    };
    this._rotateSpeed;
  }

  BgDotParts.prototype.init = function() {
    this._modelMtx = MY.gu.createMatrix();
    this._mvpMtx = MY.gu.createMatrix();
    this._vsObj = MY.gu.createShader(this._gl, "vDot");
    this._fsObj = MY.gu.createShader(this._gl, "fDot");
    return this._prg = MY.gu.createProgram(this._gl, this._vsObj, this._fsObj);
  };

  BgDotParts.prototype.dispose = function() {
    if (this._prg != null) {
      MY.gu.disposeProgram(this._gl, this._prg, this._vsObj, this._fsObj);
      this._prg = null;
      this._vsObj = null;
      this._fsObj = null;
    }
    this._modelMtx = null;
    this._model = null;
    this._mvpMtx = null;
    this._vbo = null;
    return this._gl = null;
  };

  BgDotParts.prototype.createVertex = function(x, y, z, radius) {
    if (MY.u.hit(2)) {
      this._model = sphere(2, 8, radius);
    } else {
      this._model = cube(radius);
    }
    this._translate.x = x;
    this._translate.y = y;
    this._translate.z = z;
    this._vbo.position = MY.gu.createVBO(this._gl, this._prg, "position", 3, this._model.p);
    this._vbo.normal = MY.gu.createVBO(this._gl, this._prg, "normal", 3, this._model.n);
    this._ibo = MY.gu.createIBO(this._gl, this._model.i);
    this._range = MY.u.random(5, 40);
    this._speed = MY.u.random(100, 300) * 0.0001;
    return this._rotateSpeed = MY.u.range(300) * 0.0001;
  };

  BgDotParts.prototype.draw = function(cameraMtx) {
    var dotRange, m, radian, radius;
    radian = this._id + MY.update.cnt * 0.01;
    radius = this._range * MY.u.map(Math.sin(MY.u.radian((this._id * 0.5 + MY.update.cnt) * 3)), 1, MY.param.dotRange, -1, 1);
    this._translateOffset.x = Math.sin(radian) * radius;
    this._translateOffset.y = Math.cos(radian) * radius;
    this._translateOffset.z = Math.sin(radian) * radius;
    dotRange = this._range * (MY.param.dotSize * 0.01);
    MY.gu.attachProgram(this._gl, this._prg);
    m = MY.gu.m();
    m.identity(this._modelMtx);
    m.translate(this._modelMtx, [this._translate.x + this._translateOffset.x, this._translate.y + this._translateOffset.y, this._translate.z + this._translateOffset.z], this._modelMtx);
    m.rotate(this._modelMtx, MY.update.cnt * this._rotateSpeed, [1, 1, 1], this._modelMtx);
    m.multiply(cameraMtx, this._modelMtx, this._mvpMtx);
    MY.gu.attachUniform(this._gl, this._prg, "mvpMatrix", "mat4", this._mvpMtx);
    MY.gu.attachUniform(this._gl, this._prg, "time", "float", MY.update.cnt * this._speed);
    MY.gu.attachUniform(this._gl, this._prg, "baseColor", "vec4", [MY.conf.BASE_COLOR[0], MY.conf.BASE_COLOR[1], MY.conf.BASE_COLOR[2], 1]);
    MY.gu.attachUniform(this._gl, this._prg, "id", "float", this._id * 0.5);
    MY.gu.attachUniform(this._gl, this._prg, "range", "float", dotRange);
    this._gl.bindBuffer(this._gl.ELEMENT_ARRAY_BUFFER, this._ibo);
    MY.gu.attachVBO(this._gl, this._vbo.position);
    MY.gu.attachVBO(this._gl, this._vbo.normal);
    return this._gl.drawElements(this._gl.TRIANGLES, this._model.i.length, this._gl.UNSIGNED_SHORT, 0);
  };

  return BgDotParts;

})();

module.exports = BgDotParts;


},{}],4:[function(require,module,exports){
var BgDotParts, BgDots,
  bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

BgDotParts = require('./BgDotParts');

BgDots = (function() {
  function BgDots(gl) {
    this.draw = bind(this.draw, this);
    this.disposeDots = bind(this.disposeDots, this);
    this.createDots = bind(this.createDots, this);
    this.init = bind(this.init, this);
    this._gl = gl;
    this._parts = [];
  }

  BgDots.prototype.init = function() {};

  BgDots.prototype.createDots = function(w, h) {
    var add, c, dotRadius, i, max, maxRadius, minRadius, parts, r, radian, radius, results, x, y, z;
    this.disposeDots();
    this._parts = [];
    c = 0.5;
    r = 0.04;
    minRadius = Math.min(w, h) * (c + r);
    maxRadius = Math.min(w, h) * (c - r);
    i = 0;
    max = 360;
    add = 360 / MY.param.dotNum;
    results = [];
    while (i < max) {
      if (this._parts.length % 2 === 0) {
        radius = minRadius;
      } else {
        radius = maxRadius;
      }
      if (MY.u.hit(3)) {
        radius = MY.u.random(minRadius, maxRadius);
      }
      radian = MY.u.radian(i);
      x = Math.sin(radian) * radius;
      y = Math.cos(radian) * radius;
      z = MY.u.range(10);
      dotRadius = MY.u.random(10, 300) * 0.1;
      parts = new BgDotParts(this._gl, this._parts.length);
      parts.init();
      parts.createVertex(x, y, z, dotRadius);
      this._parts.push(parts);
      results.push(i += add);
    }
    return results;
  };

  BgDots.prototype.disposeDots = function() {
    var i, j, len, ref, val;
    if (this._parts != null) {
      ref = this._parts;
      for (i = j = 0, len = ref.length; j < len; i = ++j) {
        val = ref[i];
        val.dispose();
      }
      return this._parts = null;
    }
  };

  BgDots.prototype.draw = function(camera) {
    var i, j, len, ref, results, val;
    ref = this._parts;
    results = [];
    for (i = j = 0, len = ref.length; j < len; i = ++j) {
      val = ref[i];
      results.push(val.draw(camera));
    }
    return results;
  };

  return BgDots;

})();

module.exports = BgDots;


},{"./BgDotParts":3}],5:[function(require,module,exports){
var BgLines,
  bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

BgLines = (function() {
  function BgLines(gl) {
    this._addVertex = bind(this._addVertex, this);
    this._createModelData = bind(this._createModelData, this);
    this.draw = bind(this.draw, this);
    this.canvasSize = bind(this.canvasSize, this);
    this.init = bind(this.init, this);
    this._gl = gl;
    this._model = {};
    this._modelMtx;
    this._mvpMtx;
    this._prg;
    this._vbo = {};
    this._rangeOffset = 1;
  }

  BgLines.prototype.init = function() {
    this._modelMtx = MY.gu.createMatrix();
    this._mvpMtx = MY.gu.createMatrix();
    return this._prg = MY.gu.createProgram(this._gl, MY.gu.createShader(this._gl, "vLine"), MY.gu.createShader(this._gl, "fLine"));
  };

  BgLines.prototype.canvasSize = function(w, h) {
    this._createModelData(w, h);
    this._vbo.position = MY.gu.createVBO(this._gl, this._prg, "position", 3, this._model.p);
    this._vbo.id = MY.gu.createVBO(this._gl, this._prg, "id", 1, this._model.id);
    return this._vbo.range = MY.gu.createVBO(this._gl, this._prg, "range", 3, this._model.range);
  };

  BgLines.prototype.draw = function(cameraMtx) {
    var m;
    if (!MY.param.line) {
      return;
    }
    if (MY.param.lineMove) {
      this._rangeOffset = 1;
    } else {
      this._rangeOffset = 0;
    }
    MY.gu.attachProgram(this._gl, this._prg);
    m = MY.gu.m();
    m.identity(this._modelMtx);
    m.rotate(this._modelMtx, MY.update.cnt * MY.param.speed * 0.00001, [0, 0, 1], this._modelMtx);
    m.multiply(cameraMtx, this._modelMtx, this._mvpMtx);
    MY.gu.attachUniform(this._gl, this._prg, "mvpMatrix", "mat4", this._mvpMtx);
    MY.gu.attachUniform(this._gl, this._prg, "time", "float", MY.update.cnt * 0.05);
    MY.gu.attachUniform(this._gl, this._prg, "baseColor", "vec4", [MY.conf.BASE_COLOR[0], MY.conf.BASE_COLOR[1], MY.conf.BASE_COLOR[2], MY.param.lineAlpha * 0.01]);
    MY.gu.attachUniform(this._gl, this._prg, "rangeOffset", "float", this._rangeOffset);
    MY.gu.attachVBO(this._gl, this._vbo.position);
    MY.gu.attachVBO(this._gl, this._vbo.id);
    MY.gu.attachVBO(this._gl, this._vbo.range);
    return this._gl.drawArrays(this._gl.LINE_STRIP, 0, this._model.p.length / 3);
  };

  BgLines.prototype._createModelData = function(w, h) {
    var c, i, idBuffer, num, positionBuffer, r, radiusIn, radiusOut, rangeBuffer;
    positionBuffer = [];
    idBuffer = [];
    rangeBuffer = [];
    i = 0;
    num = 400;
    while (i < num) {
      c = 0.65;
      r = 0.05;
      radiusOut = Math.min(w, h) * (c + r);
      radiusIn = Math.min(w, h) * (c - r);
      this._addVertex(i, radiusOut, radiusIn, 120, positionBuffer, idBuffer, rangeBuffer);
      i++;
    }
    this._model.p = positionBuffer;
    this._model.id = idBuffer;
    return this._model.range = rangeBuffer;
  };

  BgLines.prototype._addVertex = function(offset, radiusOut, radiusIn, add, positionBuffer, idBuffer, rangeBuffer) {
    var ang, i, radian, radius, range, results, x, y;
    i = 0;
    ang = -offset;
    results = [];
    while (ang <= 360 - offset) {
      radius = i % 2 === 0 ? radiusOut : radiusIn;
      radian = MY.u.radian(ang);
      x = Math.sin(radian) * radius;
      y = Math.cos(radian) * radius;
      positionBuffer.push(x);
      positionBuffer.push(y);
      positionBuffer.push(0);
      idBuffer.push(i * 20);
      range = MY.u.random(10, 200);
      range = 20;
      rangeBuffer.push(range);
      rangeBuffer.push(range);
      rangeBuffer.push(0);
      i++;
      results.push(ang += add);
    }
    return results;
  };

  return BgLines;

})();

module.exports = BgLines;


},{}],6:[function(require,module,exports){
var BgNoise, Texture,
  bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

Texture = require('./Texture');

BgNoise = (function() {
  function BgNoise(gl) {
    this.texture = bind(this.texture, this);
    this.create = bind(this.create, this);
    this.init = bind(this.init, this);
    this._gl = gl;
    this._model;
    this._prg;
    this._fBuffer;
    this._noiseTexture;
    this._vbo = {};
    this._ibo;
  }

  BgNoise.prototype.init = function() {
    if (MY.u.isSmt()) {
      this._noiseTexture = new Texture(this._gl, MY.conf.PATH_IMG + "/noise.jpg", 0);
    }
    this._model = MY.gu.planeModelData();
    this._prg = MY.gu.createProgram(this._gl, MY.gu.createShader(this._gl, 'vNoise'), MY.gu.createShader(this._gl, 'fNoise'));
    this._vbo.position = MY.gu.createVBO(this._gl, this._prg, "position", 3, this._model.p);
    return this._ibo = MY.gu.createIBO(this._gl, this._model.i);
  };

  BgNoise.prototype.create = function(w, h) {
    if (this._noiseTexture != null) {
      return;
    }
    this._fBuffer = MY.gu.createFramebuffer(this._gl, w, h);
    this._gl.bindFramebuffer(this._gl.FRAMEBUFFER, this._fBuffer.f);
    this._gl.clear(this._gl.COLOR_BUFFER_BIT);
    MY.gu.attachProgram(this._gl, this._prg);
    MY.gu.attachUniform(this._gl, this._prg, "resolution", "vec2", [w, h]);
    MY.gu.attachUniform(this._gl, this._prg, "offset", "vec2", [MY.u.range(w), MY.u.range(h)]);
    this._gl.bindBuffer(this._gl.ELEMENT_ARRAY_BUFFER, this._ibo);
    MY.gu.attachVBO(this._gl, this._vbo.position);
    this._gl.drawElements(this._gl.TRIANGLES, this._model.i.length, this._gl.UNSIGNED_SHORT, 0);
    return this._gl.bindFramebuffer(this._gl.FRAMEBUFFER, null);
  };

  BgNoise.prototype.texture = function() {
    if (this._noiseTexture != null) {
      return this._noiseTexture.t;
    } else {
      return this._fBuffer.t;
    }
  };

  return BgNoise;

})();

module.exports = BgNoise;


},{"./Texture":21}],7:[function(require,module,exports){
var BaseFilter, BlurFilter, Rect,
  extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  hasProp = {}.hasOwnProperty;

Rect = require('./libs/object/Rect');

BaseFilter = require('./BaseFilter');

BlurFilter = (function(superClass) {
  extend(BlurFilter, superClass);

  function BlurFilter(gl) {
    BlurFilter.__super__.constructor.call(this, gl, {
      v: "vBlur",
      f: "fBlur"
    });
  }

  return BlurFilter;

})(BaseFilter);

module.exports = BlurFilter;


},{"./BaseFilter":1,"./libs/object/Rect":30}],8:[function(require,module,exports){
var Camera,
  bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

Camera = (function() {
  function Camera(fov) {
    this.fov = bind(this.fov, this);
    this.pixel = bind(this.pixel, this);
    this.cameraPosition = bind(this.cameraPosition, this);
    this.pvMatrix = bind(this.pvMatrix, this);
    this.updateMatrix = bind(this.updateMatrix, this);
    this.init = bind(this.init, this);
    this._cameraPosition = {
      x: 0,
      y: 0,
      z: 0
    };
    this._fov = fov || 45;
    this._vMtx;
    this._pMtx;
    this._pvMtx;
  }

  Camera.prototype.init = function() {
    this._vMtx = MY.gu.createMatrix();
    this._pMtx = MY.gu.createMatrix();
    return this._pvMtx = MY.gu.createMatrix();
  };

  Camera.prototype.updateMatrix = function(canvasWidth, canvasHeight) {
    var m;
    m = MY.gu.m();
    m.lookAt([this._cameraPosition.x, this._cameraPosition.y, this._cameraPosition.z], [0, 0, 0], [0, 1, 0], this._vMtx);
    m.perspective(this._fov, canvasWidth / canvasHeight, 0.1, 10000, this._pMtx);
    return m.multiply(this._pMtx, this._vMtx, this._pvMtx);
  };

  Camera.prototype.pvMatrix = function() {
    return this._pvMtx;
  };

  Camera.prototype.cameraPosition = function(x, y, z) {
    if ((x != null) || (y != null) || (z != null)) {
      this._cameraPosition.x = x;
      this._cameraPosition.y = y;
      return this._cameraPosition.z = z;
    } else {
      return this._cameraPosition;
    }
  };

  Camera.prototype.pixel = function(canvasHeight) {
    return this._cameraPosition.z = (canvasHeight / 2) / Math.tan((this._fov * Math.PI / 180) / 2);
  };

  Camera.prototype.fov = function(val) {
    if (val != null) {
      return this._fov = val;
    } else {
      return this._fov;
    }
  };

  return Camera;

})();

module.exports = Camera;


},{}],9:[function(require,module,exports){
var BaseFilter, ColorCorrectionFilter, Rect,
  bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
  extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  hasProp = {}.hasOwnProperty;

Rect = require('./libs/object/Rect');

BaseFilter = require('./BaseFilter');

ColorCorrectionFilter = (function(superClass) {
  extend(ColorCorrectionFilter, superClass);

  function ColorCorrectionFilter(gl) {
    this.mulRGB = bind(this.mulRGB, this);
    this.posRGB = bind(this.posRGB, this);
    this._attachUniform = bind(this._attachUniform, this);
    ColorCorrectionFilter.__super__.constructor.call(this, gl, {
      v: "vColorCorrection",
      f: "fColorCorrection"
    });
    this._powRGB = [1, 1, 1];
    this._mulRGB = [1, 1, 1];
  }

  ColorCorrectionFilter.prototype._attachUniform = function() {
    MY.gu.attachUniform(this._gl, this._prg, "mvpMatrix", "mat4", this._mvpMtx);
    MY.gu.attachUniform(this._gl, this._prg, "resolution", "vec2", [this._drawSize.w, this._drawSize.h]);
    MY.gu.attachUniform(this._gl, this._prg, "powRGB", "vec3", this._powRGB);
    return MY.gu.attachUniform(this._gl, this._prg, "mulRGB", "vec3", this._mulRGB);
  };

  ColorCorrectionFilter.prototype.posRGB = function(r, g, b) {
    return this._powRGB = [r, g, b];
  };

  ColorCorrectionFilter.prototype.mulRGB = function(r, g, b) {
    return this._mulRGB = [r, g, b];
  };

  return ColorCorrectionFilter;

})(BaseFilter);

module.exports = ColorCorrectionFilter;


},{"./BaseFilter":1,"./libs/object/Rect":30}],10:[function(require,module,exports){
var Conf;

Conf = (function() {
  function Conf() {
    var key, ref, val;
    this.RELEASE = false;
    this.FLG = {
      LOG: true,
      PARAM: true,
      STATS: true
    };
    if (this.RELEASE) {
      ref = this.FLG;
      for (key in ref) {
        val = ref[key];
        this.FLG[key] = false;
      }
    }
    this.PATH_IMG = "./assets/img";
    this.BASE_COLOR = [92 / 255, 89 / 255, 112 / 255];
  }

  return Conf;

})();

module.exports = Conf;


},{}],11:[function(require,module,exports){
var Bg, Contents, DisplayTransform,
  bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

DisplayTransform = require('./libs/display/DisplayTransform');

Bg = require('./Bg');

Contents = (function() {
  function Contents() {
    this._resize = bind(this._resize, this);
    this._start = bind(this._start, this);
    this.init = bind(this.init, this);
    this._test;
    this._bg;
  }

  Contents.prototype.init = function() {
    return this._start();
  };

  Contents.prototype._start = function() {
    this._bg = new Bg("xBg");
    this._bg.init();
    return $("#xBg").css({
      position: "absolute",
      top: 0,
      left: 0
    });
  };

  Contents.prototype._resize = function(w, h) {
    var scale;
    scale = w / this._test.width();
    if (this._test.height() * scale < h) {
      scale = h / this._test.height();
    }
    this._test.scale(scale, scale);
    return this._test.render();
  };

  return Contents;

})();

module.exports = Contents;


},{"./Bg":2,"./libs/display/DisplayTransform":25}],12:[function(require,module,exports){
var FrameBuffer, Rect,
  bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

Rect = require('./libs/object/Rect');

FrameBuffer = (function() {
  function FrameBuffer(gl) {
    this.texture = bind(this.texture, this);
    this.stopCapture = bind(this.stopCapture, this);
    this.startCapture = bind(this.startCapture, this);
    this.canvasSize = bind(this.canvasSize, this);
    this.init = bind(this.init, this);
    this._gl = gl;
    this._frameBuffer;
  }

  FrameBuffer.prototype.init = function() {};

  FrameBuffer.prototype.canvasSize = function(w, h) {
    return this._frameBuffer = MY.gu.createFramebuffer(this._gl, w, h);
  };

  FrameBuffer.prototype.startCapture = function() {
    this._gl.bindFramebuffer(this._gl.FRAMEBUFFER, this._frameBuffer.f);
    this._gl.blendFuncSeparate(this._gl.SRC_ALPHA, this._gl.ONE_MINUS_SRC_ALPHA, this._gl.ONE, this._gl.ONE);
    return this._gl.clear(this._gl.COLOR_BUFFER_BIT | this._gl.DEPTH_BUFFER_BIT);
  };

  FrameBuffer.prototype.stopCapture = function() {
    return this._gl.bindFramebuffer(this._gl.FRAMEBUFFER, null);
  };

  FrameBuffer.prototype.texture = function() {
    return this._frameBuffer.t;
  };

  return FrameBuffer;

})();

module.exports = FrameBuffer;


},{"./libs/object/Rect":30}],13:[function(require,module,exports){
var Func,
  bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
  slice = [].slice;

Func = (function() {
  function Func() {
    this.getPEGeo = bind(this.getPEGeo, this);
    this.setScroll = bind(this.setScroll, this);
    this.trackPageView = bind(this.trackPageView, this);
    this.log = bind(this.log, this);
  }

  Func.prototype.log = function() {
    var params;
    params = 1 <= arguments.length ? slice.call(arguments, 0) : [];
    if (MY.conf.FLG.LOG) {
      if ((typeof console !== "undefined" && console !== null) && (console.log != null)) {
        return console.log.apply(console, params);
      }
    }
  };

  Func.prototype.trackPageView = function(url) {
    if (typeof ga !== "undefined" && ga !== null) {
      this.log("##################### trackPageView::", url);
      return ga('send', 'pageview', url);
    }
  };

  Func.prototype.setScroll = function(bool) {
    if (bool === false) {
      return $(window).on('touchmove.noScroll', (function(_this) {
        return function(e) {
          return e.preventDefault();
        };
      })(this));
    } else {
      return $(window).off('touchmove.noScroll');
    }
  };

  Func.prototype.getPEGeo = function(w, h) {
    var geo, index, pos, uv;
    geo = new THREE.BufferGeometry();
    geo.addAttribute('index', new THREE.BufferAttribute(new Uint16Array(3 * 2), 1));
    geo.addAttribute('position', new THREE.BufferAttribute(new Float32Array(3 * 4), 3));
    geo.addAttribute('uv', new THREE.BufferAttribute(new Float32Array(2 * 4), 2));
    pos = geo.attributes.position.array;
    pos[0] = -w * 0.5;
    pos[1] = -h * 0.5;
    pos[2] = 0;
    pos[3] = w * 0.5;
    pos[4] = -h * 0.5;
    pos[5] = 0;
    pos[6] = w * 0.5;
    pos[7] = h * 0.5;
    pos[8] = 0;
    pos[9] = -w * 0.5;
    pos[10] = h * 0.5;
    pos[11] = 0;
    index = geo.attributes.index.array;
    index[0] = 0;
    index[1] = 1;
    index[2] = 2;
    index[3] = 0;
    index[4] = 2;
    index[5] = 3;
    uv = geo.attributes.uv.array;
    uv[0] = 0;
    uv[1] = 0;
    uv[2] = 1;
    uv[3] = 0;
    uv[4] = 1;
    uv[5] = 1;
    uv[6] = 0;
    uv[7] = 1;
    return geo;
  };

  return Func;

})();

module.exports = Func;


},{}],14:[function(require,module,exports){
var BaseFilter, FxaaFilter,
  bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
  extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  hasProp = {}.hasOwnProperty;

BaseFilter = require('./BaseFilter');

FxaaFilter = (function(superClass) {
  extend(FxaaFilter, superClass);

  function FxaaFilter(gl) {
    this._attachUniform = bind(this._attachUniform, this);
    FxaaFilter.__super__.constructor.call(this, gl, {
      v: "vFXAA",
      f: "fFXAA"
    });
    this._powRGB = [1, 1, 1];
    this._mulRGB = [1, 1, 1];
  }

  FxaaFilter.prototype._attachUniform = function() {
    MY.gu.attachUniform(this._gl, this._prg, "mvpMatrix", "mat4", this._mvpMtx);
    MY.gu.attachUniform(this._gl, this._prg, "resolution", "vec2", [1 / this._drawSize.w, 1 / this._drawSize.h]);
    MY.gu.attachUniform(this._gl, this._prg, "reduceMin", "float", 1 / 128);
    MY.gu.attachUniform(this._gl, this._prg, "reduceMul", "float", 1 / 8);
    return MY.gu.attachUniform(this._gl, this._prg, "spanMax", "float", 8);
  };

  return FxaaFilter;

})(BaseFilter);

module.exports = FxaaFilter;


},{"./BaseFilter":1}],15:[function(require,module,exports){
var BaseFilter, GlitchFilter, Rect,
  bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
  extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  hasProp = {}.hasOwnProperty;

Rect = require('./libs/object/Rect');

BaseFilter = require('./BaseFilter');

GlitchFilter = (function(superClass) {
  extend(GlitchFilter, superClass);

  function GlitchFilter(gl) {
    this.attachNoiseTexture = bind(this.attachNoiseTexture, this);
    this._attachUniform = bind(this._attachUniform, this);
    GlitchFilter.__super__.constructor.call(this, gl, {
      v: "vGlitch",
      f: "fGlitch"
    });
    this._noiseTexture;
    this._distortion = [0, 0, 0];
  }

  GlitchFilter.prototype._attachUniform = function() {
    var dx, dy, i, j, len, range, ref, val;
    if (MY.u.isSmt()) {
      range = MY.u.map(Math.cos(MY.update.cnt * 0.02), 50, 200, -1, 1);
    } else {
      dx = MY.resize.sw();
      dy = MY.resize.sh();
      range = MY.u.map(MY.mouse.dist(0, 0), 0, 300, 0, Math.sqrt(dx * dx + dy * dy));
    }
    ref = this._distortion;
    for (i = j = 0, len = ref.length; j < len; i = ++j) {
      val = ref[i];
      this._distortion[i] = Math.sin((i * 2 + MY.update.cnt) * 0.05) * range * 0.001;
    }
    MY.gu.attachUniform(this._gl, this._prg, "mvpMatrix", "mat4", this._mvpMtx);
    MY.gu.attachUniform(this._gl, this._prg, "resolution", "vec2", [this._drawSize.w, this._drawSize.h]);
    MY.gu.attachUniform(this._gl, this._prg, "distortion", "vec3", this._distortion);
    this._gl.activeTexture(this._gl.TEXTURE1);
    this._gl.bindTexture(this._gl.TEXTURE_2D, this._noiseTexture);
    return MY.gu.attachUniform(this._gl, this._prg, "noiseTexture", "int", 1);
  };

  GlitchFilter.prototype.attachNoiseTexture = function(noiseTexture) {
    return this._noiseTexture = noiseTexture;
  };

  return GlitchFilter;

})(BaseFilter);

module.exports = GlitchFilter;


},{"./BaseFilter":1,"./libs/object/Rect":30}],16:[function(require,module,exports){
var Conf, Contents, DelayMgr, Func, GlUtils, Main, Mouse, Param, Profiler, ResizeMgr, UpdateMgr, Utils,
  bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

UpdateMgr = require('./libs/mgr/UpdateMgr');

ResizeMgr = require('./libs/mgr/ResizeMgr');

DelayMgr = require('./libs/mgr/DelayMgr');

Utils = require('./libs/Utils');

GlUtils = require('./libs/GlUtils');

Profiler = require('./Profiler');

Func = require('./Func');

Mouse = require('./Mouse');

Contents = require('./Contents');

Conf = require('./Conf');

Param = require('./Param');

Main = (function() {
  function Main() {
    this._update = bind(this._update, this);
    this.init = bind(this.init, this);
  }

  Main.prototype.init = function() {
    window.MY = {};
    MY.u = new Utils();
    MY.conf = new Conf();
    MY.update = new UpdateMgr();
    MY.update.add(this._update);
    MY.resize = new ResizeMgr();
    MY.delay = new DelayMgr();
    MY.mouse = new Mouse();
    MY.f = new Func();
    MY.profiler = new Profiler();
    MY.param = new Param();
    MY.gu = new GlUtils();
    MY.c = new Contents();
    return MY.c.init();
  };

  Main.prototype._update = function() {
    return window.MY.delay.update();
  };

  return Main;

})();

$(window).ready((function(_this) {
  return function() {
    var app;
    app = new Main();
    app.init();
    return window.MY.main = app;
  };
})(this));


},{"./Conf":10,"./Contents":11,"./Func":13,"./Mouse":17,"./Param":18,"./Profiler":20,"./libs/GlUtils":22,"./libs/Utils":23,"./libs/mgr/DelayMgr":27,"./libs/mgr/ResizeMgr":28,"./libs/mgr/UpdateMgr":29}],17:[function(require,module,exports){
var Mouse,
  bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

Mouse = (function() {
  function Mouse() {
    this.dist = bind(this.dist, this);
    this._eMouseMove = bind(this._eMouseMove, this);
    this._init = bind(this._init, this);
    this.x = 0;
    this.y = 0;
    this.oldX = 0;
    this.oldY = 0;
    this._init();
  }

  Mouse.prototype._init = function() {
    return $(window).on("mousemove", this._eMouseMove);
  };

  Mouse.prototype._eMouseMove = function(e) {
    this.oldX = this.x;
    this.oldY = this.y;
    this.x = e.clientX;
    return this.y = e.clientY;
  };

  Mouse.prototype.dist = function(tx, ty) {
    var dx, dy;
    dx = tx - this.x;
    dy = ty - this.y;
    return Math.sqrt(dx * dx + dy * dy);
  };

  return Mouse;

})();

module.exports = Mouse;


},{}],18:[function(require,module,exports){
var Param,
  bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

Param = (function() {
  function Param() {
    this.addCallBack = bind(this.addCallBack, this);
    this._callBack = bind(this._callBack, this);
    this._setGuiListen = bind(this._setGuiListen, this);
    this._setGuiBool = bind(this._setGuiBool, this);
    this._setGuiNum2 = bind(this._setGuiNum2, this);
    this._setGuiNum = bind(this._setGuiNum, this);
    this._init = bind(this._init, this);
    this._gui;
    this.speed0 = 50;
    this.speed1 = 75;
    this.speed2 = 100;
    this.offset0 = 10;
    this.offset1 = 5;
    this.offset2 = 15;
    this.r0 = 16;
    this.g0 = 9;
    this.b0 = 12;
    this.r1 = 18;
    this.g1 = 22;
    this.b1 = 33;
    this.r2 = 12;
    this.g2 = 21;
    this.b2 = 60;
    this.alpha = 100;
    this.lineAlpha = 10;
    this.speed = 250;
    this.dotRange = 12;
    this.dotSize = 100;
    this.dotNum = 300;
    this.line = true;
    this.mountain = false;
    this.dot = true;
    this.lineMove = true;
    this.distortionR = 0;
    this.distortionG = 0;
    this.distortionB = 0;
    this.callBack = {};
    this._init();
  }

  Param.prototype._init = function() {
    if (MY.u.isSmt()) {
      this.dotSize = 150;
      this.dotNum = 100;
    }
    if (MY.conf.FLG.PARAM && !MY.u.isSmt()) {
      this._gui = new dat.GUI();
      this._setGuiBool("line");
      this._setGuiBool("dot");
      this._setGuiNum("dotRange", 1, 20, 1);
      return this._setGuiNum("dotSize", 1, 400, 1);
    }
  };

  Param.prototype._setGuiNum = function(name, min, max, step) {
    return this._gui.add(this, name, min, max).step(step).listen().onFinishChange((function(_this) {
      return function(e) {
        _this[name] = e;
        return _this._callBack(name);
      };
    })(this));
  };

  Param.prototype._setGuiNum2 = function(name, min, max, step) {
    return this._gui.add(this, name, min, max).step(step).onChange((function(_this) {
      return function(e) {
        _this[name] = e;
        return _this._callBack(name);
      };
    })(this));
  };

  Param.prototype._setGuiBool = function(name) {
    return this._gui.add(this, name).onFinishChange((function(_this) {
      return function(e) {
        _this[name] = e;
        return _this._callBack(name);
      };
    })(this));
  };

  Param.prototype._setGuiListen = function(name) {
    return this._gui.add(this, name).listen().onFinishChange((function(_this) {
      return function(e) {
        _this[name] = e;
        return _this._callBack(name);
      };
    })(this));
  };

  Param.prototype._callBack = function(name) {
    var i, j, len, ref, results, val;
    if (this.callBack[name] != null) {
      ref = this.callBack[name];
      results = [];
      for (i = j = 0, len = ref.length; j < len; i = ++j) {
        val = ref[i];
        if (val != null) {
          results.push(val());
        } else {
          results.push(void 0);
        }
      }
      return results;
    }
  };

  Param.prototype.addCallBack = function(name, func) {
    if (this.callBack[name] == null) {
      this.callBack[name] = [];
    }
    return this.callBack[name].push(func);
  };

  return Param;

})();

module.exports = Param;


},{}],19:[function(require,module,exports){
var PartialDraw,
  bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

PartialDraw = (function() {
  function PartialDraw(gl) {
    this.draw = bind(this.draw, this);
    this.attachTexture = bind(this.attachTexture, this);
    this.init = bind(this.init, this);
    this._gl = gl;
    this._model;
    this._modelMtx;
    this._mvpMtx;
    this._prg;
    this._vbo = {};
    this._ibo;
    this._texture = [];
  }

  PartialDraw.prototype.init = function() {
    this._modelMtx = MY.gu.createMatrix();
    this._mvpMtx = MY.gu.createMatrix();
    this._prg = MY.gu.createProgram(this._gl, MY.gu.createShader(this._gl, 'vPartialDraw'), MY.gu.createShader(this._gl, 'fPartialDraw'));
    this._model = MY.gu.planeModelData();
    this._vbo.position = MY.gu.createVBO(this._gl, this._prg, "position", 3, this._model.p);
    this._vbo.texCoord = MY.gu.createVBO(this._gl, this._prg, "texCoord", 2, this._model.t);
    return this._ibo = MY.gu.createIBO(this._gl, this._model.i);
  };

  PartialDraw.prototype.attachTexture = function(tex0, tex1, tex2, noiseTex) {
    this._texture[0] = tex0;
    this._texture[1] = tex1;
    this._texture[2] = tex2;
    return this._texture[3] = noiseTex;
  };

  PartialDraw.prototype.draw = function(cameraMtx) {
    var i, j, len, m, ref, time, val;
    if (this._texture[3] == null) {
      return;
    }
    time = MY.update.cnt;
    MY.gu.attachProgram(this._gl, this._prg);
    m = MY.gu.m();
    m.identity(this._modelMtx);
    m.multiply(cameraMtx, this._modelMtx, this._mvpMtx);
    MY.gu.attachUniform(this._gl, this._prg, "alpha", "float", MY.param.alpha * 0.01);
    MY.gu.attachUniform(this._gl, this._prg, "mvpMatrix", "mat4", this._mvpMtx);
    MY.gu.attachUniform(this._gl, this._prg, "speed", "floatarray", [time * MY.param.speed0 * 0.001, time * MY.param.speed1 * 0.001, time * MY.param.speed2 * 0.001]);
    MY.gu.attachUniform(this._gl, this._prg, "offset", "floatarray", [MY.param.offset0, MY.param.offset1, MY.param.offset2]);
    ref = this._texture;
    for (i = j = 0, len = ref.length; j < len; i = ++j) {
      val = ref[i];
      this._gl.activeTexture(this._gl["TEXTURE" + String(i)]);
      this._gl.bindTexture(this._gl.TEXTURE_2D, val);
      MY.gu.attachUniform(this._gl, this._prg, "texture" + String(i), "int", i);
    }
    this._gl.bindBuffer(this._gl.ELEMENT_ARRAY_BUFFER, this._ibo);
    MY.gu.attachVBO(this._gl, this._vbo.position);
    MY.gu.attachVBO(this._gl, this._vbo.texCoord);
    return this._gl.drawElements(this._gl.TRIANGLES, this._model.i.length, this._gl.UNSIGNED_SHORT, 0);
  };

  return PartialDraw;

})();

module.exports = PartialDraw;


},{}],20:[function(require,module,exports){
var Profiler,
  bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

Profiler = (function() {
  function Profiler() {
    this._update = bind(this._update, this);
    this._init = bind(this._init, this);
    this._stats;
    this._init();
  }

  Profiler.prototype._init = function() {
    if (MY.conf.FLG.STATS) {
      this._stats = new Stats();
      this._stats.domElement.style.position = "fixed";
      this._stats.domElement.style.left = "0px";
      this._stats.domElement.style.bottom = "0px";
      document.body.appendChild(this._stats.domElement);
      return MY.update.add(this._update);
    }
  };

  Profiler.prototype._update = function() {
    if (this._stats != null) {
      return this._stats.update();
    }
  };

  return Profiler;

})();

module.exports = Profiler;


},{}],21:[function(require,module,exports){
var Texture,
  bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

Texture = (function() {
  function Texture(gl, src, id, param) {
    this._eLoad = bind(this._eLoad, this);
    this._init = bind(this._init, this);
    this._gl = gl;
    this.id = id;
    this.texId = this._gl["TEXTURE" + String(this.id)];
    this._src = src;
    this._img;
    this.t = null;
    this._param = param || {};
    this._init();
  }

  Texture.prototype._init = function() {
    this._img = new Image();
    this._img.onload = this._eLoad;
    return this._img.src = this._src;
  };

  Texture.prototype._eLoad = function() {
    var key, ref, val;
    this.t = this._gl.createTexture();
    this._gl.bindTexture(this._gl.TEXTURE_2D, this.t);
    this._gl.texImage2D(this._gl.TEXTURE_2D, 0, this._gl.RGBA, this._gl.RGBA, this._gl.UNSIGNED_BYTE, this._img);
    ref = this._param;
    for (key in ref) {
      val = ref[key];
      this._gl.texParameteri(this._gl.TEXTURE_2D, this._gl[key], this._gl[val]);
    }
    this._gl.generateMipmap(this._gl.TEXTURE_2D);
    return this._gl.bindTexture(this._gl.TEXTURE_2D, null);
  };

  return Texture;

})();

module.exports = Texture;


},{}],22:[function(require,module,exports){
var GlUtils,
  bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

GlUtils = (function() {
  function GlUtils() {
    this.planeModelData = bind(this.planeModelData, this);
    this.disposeShader = bind(this.disposeShader, this);
    this.disposeProgram = bind(this.disposeProgram, this);
    this.getMaxTexSize = bind(this.getMaxTexSize, this);
    this.createFramebufferCubeMap = bind(this.createFramebufferCubeMap, this);
    this.createFramebuffer = bind(this.createFramebuffer, this);
    this.attachUniform = bind(this.attachUniform, this);
    this.createIBO = bind(this.createIBO, this);
    this.attachVBO = bind(this.attachVBO, this);
    this.createVBO = bind(this.createVBO, this);
    this.createProgram = bind(this.createProgram, this);
    this.createShader = bind(this.createShader, this);
    this.attachProgram = bind(this.attachProgram, this);
    this.getGlContext = bind(this.getGlContext, this);
    this.orthoMatrix = bind(this.orthoMatrix, this);
    this.createMatrix = bind(this.createMatrix, this);
    this.m = bind(this.m, this);
    this._m = new matIV();
  }

  GlUtils.prototype.m = function() {
    return this._m;
  };

  GlUtils.prototype.createMatrix = function() {
    return this._m.identity(this._m.create());
  };

  GlUtils.prototype.orthoMatrix = function() {
    var p, tmp, v;
    v = this.createMatrix();
    p = this.createMatrix();
    tmp = this.createMatrix();
    this._m.lookAt([0.0, 0.0, 0.5], [0.0, 0.0, 0.0], [0, 1, 0], v);
    this._m.ortho(-1.0, 1.0, 1.0, -1.0, 0.1, 1, p);
    this._m.multiply(p, v, tmp);
    return tmp;
  };

  GlUtils.prototype.getGlContext = function(canvasId, param) {
    var c;
    c = document.getElementById(canvasId);
    return c.getContext('webgl', param) || c.getContext('experimental-webgl', param);
  };

  GlUtils.prototype.attachProgram = function(gl, usePrgObj) {
    gl.useProgram(usePrgObj);
    return usePrgObj;
  };

  GlUtils.prototype.createShader = function(gl, id) {
    var scriptElement, shader;
    scriptElement = document.getElementById(id);
    shader = gl.createShader(scriptElement.type === "x-shader/x-vertex" ? gl.VERTEX_SHADER : gl.FRAGMENT_SHADER);
    gl.shaderSource(shader, scriptElement.text);
    gl.compileShader(shader);
    if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      return shader;
    } else {
      console.log(gl.getShaderInfoLog(shader));
      return null;
    }
  };

  GlUtils.prototype.createProgram = function(gl, vsObj, fsObj) {
    var program;
    program = gl.createProgram();
    gl.attachShader(program, vsObj);
    gl.attachShader(program, fsObj);
    gl.linkProgram(program);
    if (gl.getProgramParameter(program, gl.LINK_STATUS)) {
      return program;
    } else {
      console.log(gl.getProgramInfoLog(program));
      return null;
    }
  };

  GlUtils.prototype.createVBO = function(gl, prg, name, attStride, data) {
    var vbo;
    vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    return {
      obj: vbo,
      attLocation: gl.getAttribLocation(prg, name),
      attStride: attStride
    };
  };

  GlUtils.prototype.attachVBO = function(gl, vbo) {
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo.obj);
    gl.enableVertexAttribArray(vbo.attLocation);
    gl.vertexAttribPointer(vbo.attLocation, vbo.attStride, gl.FLOAT, false, 0, 0);
    return gl.bindBuffer(gl.ARRAY_BUFFER, null);
  };

  GlUtils.prototype.createIBO = function(gl, data) {
    var ibo;
    ibo = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Int16Array(data), gl.STATIC_DRAW);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
    return ibo;
  };

  GlUtils.prototype.attachUniform = function(gl, prg, name, type, data) {
    var uniLocation;
    uniLocation = gl.getUniformLocation(prg, name);
    switch (type) {
      case "mat4":
        return gl.uniformMatrix4fv(uniLocation, false, data);
      case "vec2":
        return gl.uniform2fv(uniLocation, data);
      case "vec3":
        return gl.uniform3fv(uniLocation, data);
      case "vec4":
        return gl.uniform4fv(uniLocation, data);
      case "int":
        return gl.uniform1i(uniLocation, data);
      case "float":
        return gl.uniform1f(uniLocation, data);
      case "floatarray":
        return gl.uniform1fv(uniLocation, data);
    }
  };

  GlUtils.prototype.createFramebuffer = function(gl, width, height) {
    var depthRenderBuffer, fTexture, frameBuffer;
    frameBuffer = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, frameBuffer);
    depthRenderBuffer = gl.createRenderbuffer();
    gl.bindRenderbuffer(gl.RENDERBUFFER, depthRenderBuffer);
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, width, height);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, depthRenderBuffer);
    fTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, fTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, fTexture, 0);
    gl.bindTexture(gl.TEXTURE_2D, null);
    gl.bindRenderbuffer(gl.RENDERBUFFER, null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return {
      f: frameBuffer,
      d: depthRenderBuffer,
      t: fTexture
    };
  };

  GlUtils.prototype.createFramebufferCubeMap = function(gl, width, height, target) {
    var depthRenderBuffer, fTexture, frameBuffer, i;
    frameBuffer = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, frameBuffer);
    depthRenderBuffer = gl.createRenderbuffer();
    gl.bindRenderbuffer(gl.RENDERBUFFER, depthRenderBuffer);
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, width, height);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, depthRenderBuffer);
    fTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, fTexture);
    i = 0;
    while (i < target.length) {
      gl.texImage2D(target[i], 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      i++;
    }
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, null);
    gl.bindRenderbuffer(gl.RENDERBUFFER, null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return {
      f: frameBuffer,
      d: depthRenderBuffer,
      t: fTexture
    };
  };

  GlUtils.prototype.getMaxTexSize = function(w, h) {
    var i, test;
    test = Math.max(w, h);
    i = 2;
    while (1) {
      if (i >= test) {
        return i;
      } else {
        i *= 2;
      }
    }
  };

  GlUtils.prototype.disposeProgram = function(gl, prg, vsObj, fsObj) {
    gl.useProgram(prg);
    gl.detachShader(prg, vsObj);
    gl.detachShader(prg, fsObj);
    return gl.deleteProgram(prg);
  };

  GlUtils.prototype.disposeShader = function(gl, shaderObj) {
    return gl.deleteShader(shaderObj);
  };

  GlUtils.prototype.planeModelData = function(w, h) {
    var p;
    if ((w == null) || (h == null)) {
      p = [-1.0, 1.0, 0.0, 1.0, 1.0, 0.0, -1.0, -1.0, 0.0, 1.0, -1.0, 0.0];
    } else {
      p = [-w * 0.5, h * 0.5, 0.0, w * 0.5, h * 0.5, 0.0, -w * 0.5, -h * 0.5, 0.0, w * 0.5, -h * 0.5, 0.0];
    }
    return {
      p: p,
      c: [1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0],
      t: [0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 1.0, 1.0],
      i: [0, 2, 1, 2, 3, 1]
    };
  };

  return GlUtils;

})();

module.exports = GlUtils;


},{}],23:[function(require,module,exports){
var Utils,
  bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

Utils = (function() {
  function Utils() {
    this.afterDay = bind(this.afterDay, this);
    this.price = bind(this.price, this);
    this.getHexColor = bind(this.getHexColor, this);
    this.scrollTop = bind(this.scrollTop, this);
    this.windowHeight = bind(this.windowHeight, this);
    this.numStr = bind(this.numStr, this);
    this._A = Math.PI / 180;
  }

  Utils.prototype.random = function(min, max) {
    if (min < 0) {
      min--;
    }
    return ~~(Math.random() * ((max + 1) - min) + min);
  };

  Utils.prototype.random2 = function(min1, max1, min2, max2) {
    if (this.hit(2)) {
      return this.random(min1, max1);
    } else {
      return this.random(min2, max2);
    }
  };

  Utils.prototype.hit = function(range) {
    return this.random(0, range - 1) === 0;
  };

  Utils.prototype.range = function(val) {
    return this.random(-val, val);
  };

  Utils.prototype.arrRand = function(arr) {
    return arr[this.random(0, arr.length - 1)];
  };

  Utils.prototype.map = function(num, resMin, resMax, baseMin, baseMax) {
    var p;
    if (num < baseMin) {
      return resMin;
    }
    if (num > baseMax) {
      return resMax;
    }
    p = (resMax - resMin) / (baseMax - baseMin);
    return ((num - baseMin) * p) + resMin;
  };

  Utils.prototype.radian = function(degree) {
    return degree * this._A;
  };

  Utils.prototype.degree = function(radian) {
    return radian / this._A;
  };

  Utils.prototype.decimal = function(num, n) {
    var i, pos;
    num = String(num);
    pos = num.indexOf(".");
    if (n === 0) {
      return num.split(".")[0];
    }
    if (pos === -1) {
      num += ".";
      i = 0;
      while (i < n) {
        num += "0";
        i++;
      }
      return num;
    }
    num = num.substr(0, pos) + num.substr(pos, n + 1);
    return num;
  };

  Utils.prototype.floor = function(num, min, max) {
    return Math.min(max, Math.max(num, min));
  };

  Utils.prototype.strReverse = function(str) {
    var i, len, res;
    res = "";
    len = str.length;
    i = 1;
    while (i <= len) {
      res += str.substr(-i, 1);
      i++;
    }
    return res;
  };

  Utils.prototype.shuffle = function(arr) {
    var i, j, k, results;
    i = arr.length;
    results = [];
    while (--i) {
      j = Math.floor(Math.random() * (i + 1));
      if (i === j) {
        continue;
      }
      k = arr[i];
      arr[i] = arr[j];
      results.push(arr[j] = k);
    }
    return results;
  };

  Utils.prototype.sliceNull = function(arr) {
    var i, l, len1, newArr, val;
    newArr = [];
    for (i = l = 0, len1 = arr.length; l < len1; i = ++l) {
      val = arr[i];
      if (val !== null) {
        newArr.push(val);
      }
    }
    return newArr;
  };

  Utils.prototype.replaceAll = function(val, org, dest) {
    return val.split(org).join(dest);
  };

  Utils.prototype.sort = function(arr, para, desc) {
    if (desc === void 0) {
      desc = false;
    }
    if (desc) {
      return arr.sort(function(a, b) {
        return b[para] - a[para];
      });
    } else {
      return arr.sort(function(a, b) {
        return a[para] - b[para];
      });
    }
  };

  Utils.prototype.unique = function() {
    return new Date().getTime();
  };

  Utils.prototype.numStr = function(num, keta) {
    var i, len, str;
    str = String(num);
    if (str.length >= keta) {
      return str;
    }
    len = keta - str.length;
    i = 0;
    while (i < len) {
      str = "0" + str;
      i++;
    }
    return str;
  };

  Utils.prototype.buttonMode = function(flg) {
    if (flg) {
      return $("body").css("cursor", "pointer");
    } else {
      return $("body").css("cursor", "default");
    }
  };

  Utils.prototype.getQuery = function(key) {
    var qs, regex;
    key = key.replace(/[€[]/, "€€€[").replace(/[€]]/, "€€€]");
    regex = new RegExp("[€€?&]" + key + "=([^&#]*)");
    qs = regex.exec(window.location.href);
    if (qs === null) {
      return "";
    } else {
      return qs[1];
    }
  };

  Utils.prototype.hash = function() {
    return location.hash.replace("#", "");
  };

  Utils.prototype.isSmt = function() {
    return navigator.userAgent.indexOf('iPad') > 0 || navigator.userAgent.indexOf('iPhone') > 0 || navigator.userAgent.indexOf('iPod') > 0 || navigator.userAgent.indexOf('Android') > 0;
  };

  Utils.prototype.isAndroid = function() {
    var u;
    u = navigator.userAgent;
    return u.indexOf('BlackBerry') > 0 || u.indexOf('Android') > 0 || u.indexOf('Windows Phone') > 0;
  };

  Utils.prototype.isIos = function() {
    return navigator.userAgent.indexOf('iPad') > 0 || navigator.userAgent.indexOf('iPhone') > 0 || navigator.userAgent.indexOf('iPod') > 0;
  };

  Utils.prototype.isPs3 = function() {
    var u;
    u = navigator.userAgent;
    return u.indexOf('PLAYSTATION 3') > 0;
  };

  Utils.prototype.isVita = function() {
    var u;
    u = navigator.userAgent;
    return u.indexOf('PlayStation Vita') > 0;
  };

  Utils.prototype.isIe8Under = function() {
    var msie;
    msie = navigator.appVersion.toLowerCase();
    msie = msie.indexOf('msie') > -1 ? parseInt(msie.replace(/.*msie[ ]/, '').match(/^[0-9]+/)) : 0;
    return msie <= 8 && msie !== 0;
  };

  Utils.prototype.isIe9Under = function() {
    var msie;
    msie = navigator.appVersion.toLowerCase();
    msie = msie.indexOf('msie') > -1 ? parseInt(msie.replace(/.*msie[ ]/, '').match(/^[0-9]+/)) : 0;
    return msie <= 9 && msie !== 0;
  };

  Utils.prototype.isIe = function() {
    var ua;
    ua = window.navigator.userAgent.toLowerCase();
    return ua.indexOf('msie') !== -1 || ua.indexOf('trident/7') !== -1;
  };

  Utils.prototype.isIpad = function() {
    return navigator.userAgent.indexOf('iPad') > 0;
  };

  Utils.prototype.isTablet = function() {
    return this.isIpad() || (this.isAndroid() && navigator.userAgent.indexOf('Mobile') === -1);
  };

  Utils.prototype.isWin = function() {
    return navigator.platform.indexOf("Win") !== -1;
  };

  Utils.prototype.isChrome = function() {
    return navigator.userAgent.indexOf('Chrome') > 0;
  };

  Utils.prototype.isFF = function() {
    return window.navigator.userAgent.toLowerCase().indexOf('firefox') !== -1;
  };

  Utils.prototype.isIOSUiView = function() {
    var a;
    a = window.navigator.userAgent.toLowerCase();
    return (this.isIos() && a.indexOf('safari') === -1) || (this.isIos() && a.indexOf('crios') > 0) || (this.isIos() && a.indexOf('gsa') > 0);
  };

  Utils.prototype.getCookie = function(key) {
    var a, arr, i, l, len1, val;
    if (document.cookie === void 0 || document.cookie === null) {
      return null;
    }
    arr = document.cookie.split("; ");
    for (i = l = 0, len1 = arr.length; l < len1; i = ++l) {
      val = arr[i];
      a = val.split("=");
      if (a[0] === key) {
        return a[1];
      }
    }
    return null;
  };

  Utils.prototype.setCookie = function(key, val) {
    return document.cookie = key + "=" + val;
  };

  Utils.prototype.windowHeight = function() {
    return $(document).height();
  };

  Utils.prototype.scrollTop = function() {
    return Math.max($(window).scrollTop(), $(document).scrollTop());
  };

  Utils.prototype.getHexColor = function(r, g, b) {
    var str;
    str = (r << 16 | g << 8 | b).toString(16);
    return "#" + new Array(7 - str.length).join("0") + str;
  };

  Utils.prototype.price = function(num) {
    return String(num).replace(/(\d)(?=(\d\d\d)+(?!\d))/g, '$1,');
  };

  Utils.prototype.afterDay = function(date, num) {
    return new Date(date.getTime() + Number(num) * 24 * 60 * 60 * 1000);
  };

  return Utils;

})();

module.exports = Utils;


},{}],24:[function(require,module,exports){
var Display,
  bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

Display = (function() {
  function Display(option) {
    this.text = bind(this.text, this);
    this.elm = bind(this.elm, this);
    this.id = bind(this.id, this);
    this.dispose = bind(this.dispose, this);
    this._isUpdateCss = bind(this._isUpdateCss, this);
    this.css = bind(this.css, this);
    this.visible = bind(this.visible, this);
    this.mask = bind(this.mask, this);
    this.opacity = bind(this.opacity, this);
    this.bgColor = bind(this.bgColor, this);
    this.right = bind(this.right, this);
    this.bottom = bind(this.bottom, this);
    this.y = bind(this.y, this);
    this.x = bind(this.x, this);
    this.xy = bind(this.xy, this);
    this.height = bind(this.height, this);
    this.width = bind(this.width, this);
    this.size = bind(this.size, this);
    this.render = bind(this.render, this);
    this.add = bind(this.add, this);
    this.init = bind(this.init, this);
    this._option = option || {};
    this._id = this._option.id || "";
    this._elm;
    this._css = {
      position: this._option.position || "absolute",
      top: 0,
      left: 0,
      width: this._option.width || -1,
      height: this._option.height || -1
    };
    this._oldCss = {};
  }

  Display.prototype.init = function() {
    if (window.MY_DISPLAY_ID == null) {
      window.MY_DISPLAY_ID = 0;
    }
    if (this._id === "") {
      this._id = "display" + String(window.MY_DISPLAY_ID++);
    }
    if ($("#" + this._id).length > 0) {
      this._elm = $("#" + this._id);
    } else {
      $("body").append("<div id='" + this._id + "'></div>");
      this._elm = $("#" + this._id);
    }
    if (this._css.width === -1) {
      this._css.width = this._elm.width();
    }
    if (this._css.height === -1) {
      this._css.height = this._elm.height();
    }
    return this.render();
  };

  Display.prototype.add = function(display) {
    return display.elm().appendTo("#" + this.id());
  };

  Display.prototype.render = function() {
    var key, ref, results, value;
    if (this._isUpdateCss()) {
      this._elm.css(this._css);
    }
    ref = this._css;
    results = [];
    for (key in ref) {
      value = ref[key];
      results.push(this._oldCss[key] = value);
    }
    return results;
  };

  Display.prototype.size = function(width, height) {
    this._css.width = width;
    return this._css.height = height;
  };

  Display.prototype.width = function(width) {
    if (width != null) {
      return this._css.width = width;
    } else {
      return this._css.width;
    }
  };

  Display.prototype.height = function(height) {
    if (height != null) {
      return this._css.height = height;
    } else {
      return this._css.height;
    }
  };

  Display.prototype.xy = function(x, y) {
    this._css.top = y;
    return this._css.left = x;
  };

  Display.prototype.x = function(x) {
    if (x != null) {
      return this._css.left = x;
    } else {
      return this._css.left;
    }
  };

  Display.prototype.y = function(y) {
    if (y != null) {
      return this._css.top = y;
    } else {
      return this._css.top;
    }
  };

  Display.prototype.bottom = function() {
    return this.y() + this.height();
  };

  Display.prototype.right = function() {
    return this.x() + this.width();
  };

  Display.prototype.bgColor = function(color) {
    if (color != null) {
      return this._css.backgroundColor = color;
    } else {
      return this._css.backgroundColor;
    }
  };

  Display.prototype.opacity = function(val) {
    if (val != null) {
      return this._css.opacity = val;
    } else {
      return this._css.opacity;
    }
  };

  Display.prototype.mask = function(val) {
    return this._css.overflow = val ? "hidden" : "visible";
  };

  Display.prototype.visible = function(bool) {
    if (bool) {
      return this._css.display = "block";
    } else {
      return this._css.display = "none";
    }
  };

  Display.prototype.css = function() {
    return this._css;
  };

  Display.prototype._isUpdateCss = function() {
    var key, ref, value;
    ref = this._css;
    for (key in ref) {
      value = ref[key];
      if (value !== this._oldCss[key]) {
        return true;
      }
    }
    return false;
  };

  Display.prototype.dispose = function() {
    var i, len;
    if ((this._elm != null) && this._elm.length > 0) {
      i = 0;
      len = this._elm.queue().length;
      while (i < len) {
        this._elm.stop();
        i++;
      }
    }
    if (this._elm != null) {
      this._elm.off();
      if ((this._option.isRemove == null) || this._option.isRemove) {
        this._elm.remove();
      } else {
        this._elm.removeAttr('style');
      }
      this._elm = null;
    }
    this._css = null;
    this._option = null;
    return this._oldCss = null;
  };

  Display.prototype.id = function() {
    return this._id;
  };

  Display.prototype.elm = function() {
    return this._elm;
  };

  Display.prototype.text = function(val) {
    this._elm.css("height", "auto");
    this._elm.html(val);
    this.height(this._elm.height());
    return this.render();
  };

  return Display;

})();

module.exports = Display;


},{}],25:[function(require,module,exports){
var Display, DisplayTransform,
  bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
  extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  hasProp = {}.hasOwnProperty;

Display = require('./Display');

DisplayTransform = (function(superClass) {
  extend(DisplayTransform, superClass);

  function DisplayTransform(option) {
    this._isUpdateTransform = bind(this._isUpdateTransform, this);
    this.perspective = bind(this.perspective, this);
    this.pivot = bind(this.pivot, this);
    this.render = bind(this.render, this);
    this.rotate = bind(this.rotate, this);
    this.scale = bind(this.scale, this);
    this.translate = bind(this.translate, this);
    this.dispose = bind(this.dispose, this);
    this.init = bind(this.init, this);
    DisplayTransform.__super__.constructor.call(this, option);
    this._transform = {
      dx: 0,
      dy: 0,
      dz: 0,
      scaleX: 1,
      scaleY: 1,
      scaleZ: 1,
      rotX: 0,
      rotY: 0,
      rotZ: 0
    };
    this._oldTransform = {};
  }

  DisplayTransform.prototype.init = function() {
    DisplayTransform.__super__.init.call(this);
    return this.perspective();
  };

  DisplayTransform.prototype.dispose = function() {
    this._oldTransform = null;
    this._transform = null;
    return DisplayTransform.__super__.dispose.call(this);
  };

  DisplayTransform.prototype.translate = function(x, y, z) {
    if ((x == null) && (y == null) && (z == null)) {
      return this._transform;
    } else {
      x = x || 0;
      y = y || 0;
      z = z || 0;
      this._transform.dx = x;
      this._transform.dy = y;
      return this._transform.dz = z;
    }
  };

  DisplayTransform.prototype.scale = function(x, y, z) {
    if ((x == null) && (y == null) && (z == null)) {
      return this._transform;
    } else {
      x = x || 1;
      y = y || 1;
      z = z || 1;
      this._transform.scaleX = x;
      this._transform.scaleY = y;
      return this._transform.scaleZ = z;
    }
  };

  DisplayTransform.prototype.rotate = function(x, y, z) {
    if ((x == null) && (y == null) && (z == null)) {
      return this._transform;
    } else {
      x = x || 0;
      y = y || 0;
      z = z || 0;
      this._transform.rotX = x;
      this._transform.rotY = y;
      return this._transform.rotZ = z;
    }
  };

  DisplayTransform.prototype.render = function() {
    var key, ref, results, value;
    DisplayTransform.__super__.render.call(this);
    if (this._isUpdateTransform()) {
      this._elm.css(this._getVendorCss("transform", this._translate3d(this._transform.dx, this._transform.dy, this._transform.dz) + " " + this._rotateX(this._transform.rotX) + " " + this._rotateY(this._transform.rotY) + " " + this._rotateZ(this._transform.rotZ) + " " + this._scale3d(this._transform.scaleX, this._transform.scaleY, this._transform.scaleZ)));
    }
    ref = this._transform;
    results = [];
    for (key in ref) {
      value = ref[key];
      results.push(this._oldTransform[key] = value);
    }
    return results;
  };

  DisplayTransform.prototype.pivot = function(val) {
    val = val || "50% 50%";
    return this.elm().css(this._getVendorCss("transform-origin", val));
  };

  DisplayTransform.prototype.perspective = function(val) {
    val = val || 1500;
    return this.elm().css(this._getVendorCss("transform-style", "preserve-3d")).css(this._getVendorCss("perspective", val));
  };

  DisplayTransform.prototype._isUpdateTransform = function() {
    var key, ref, value;
    ref = this._transform;
    for (key in ref) {
      value = ref[key];
      if (value !== this._oldTransform[key]) {
        return true;
      }
    }
    return false;
  };

  DisplayTransform.prototype._getVendorCss = function(prop, val) {
    var res;
    res = {};
    res["-webkit-" + prop] = val;
    res["-o-" + prop] = val;
    res["-khtml-" + prop] = val;
    res["-ms-" + prop] = val;
    res[prop] = val;
    return res;
  };

  DisplayTransform.prototype._translate3d = function(x, y, z) {
    y = y || 0;
    z = z || 0;
    return 'translate3d(' + x + 'px,' + y + 'px,' + z + 'px)';
  };

  DisplayTransform.prototype._rotateX = function(val) {
    if (val === void 0) {
      val = 0;
    }
    return 'rotate3d(1,0,0,' + val + 'deg)';
  };

  DisplayTransform.prototype._rotateY = function(val) {
    if (val === void 0) {
      val = 0;
    }
    return 'rotate3d(0,1,0,' + val + 'deg)';
  };

  DisplayTransform.prototype._rotateZ = function(val) {
    if (val === void 0) {
      val = 0;
    }
    return 'rotate3d(0,0,1,' + val + 'deg)';
  };

  DisplayTransform.prototype._scale3d = function(x, y, z) {
    if (x === void 0) {
      x = 1;
    }
    if (y === void 0) {
      y = 1;
    }
    if (z === void 0) {
      z = 1;
    }
    return 'scale3d(' + x + ',' + y + ',' + z + ')';
  };

  return DisplayTransform;

})(Display);

module.exports = DisplayTransform;


},{"./Display":24}],26:[function(require,module,exports){
var BaseMgr, Utils,
  bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

Utils = require('../Utils');

BaseMgr = (function() {
  function BaseMgr() {
    this._init = bind(this._init, this);
    this._u = new Utils();
  }

  BaseMgr.prototype._init = function() {};

  return BaseMgr;

})();

module.exports = BaseMgr;


},{"../Utils":23}],27:[function(require,module,exports){
var BaseMgr, DelayMgr,
  bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
  extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  hasProp = {}.hasOwnProperty;

BaseMgr = require('./BaseMgr');

DelayMgr = (function(superClass) {
  extend(DelayMgr, superClass);

  function DelayMgr() {
    this.update = bind(this.update, this);
    this._init = bind(this._init, this);
    DelayMgr.__super__.constructor.call(this);
    this._registFunc = [];
    this._init();
  }

  DelayMgr.prototype._init = function() {
    return DelayMgr.__super__._init.call(this);
  };

  DelayMgr.prototype.dispose = function() {
    return this._registFunc = null;
  };

  DelayMgr.prototype.reset = function() {
    return this._registFunc = [];
  };

  DelayMgr.prototype.add = function(func, delay) {
    return this._registFunc.push({
      f: func,
      d: Number(delay),
      d2: Number(delay),
      flg: true
    });
  };

  DelayMgr.prototype.remove = function(func) {
    var arr, i, j, len, ref, val;
    arr = [];
    ref = this._registFunc;
    for (i = j = 0, len = ref.length; j < len; i = ++j) {
      val = ref[i];
      if (val.f !== func) {
        arr.push(val);
      }
    }
    return this._registFunc = arr;
  };

  DelayMgr.prototype.update = function() {
    var i, j, len, ref, results, val;
    ref = this._registFunc;
    results = [];
    for (i = j = 0, len = ref.length; j < len; i = ++j) {
      val = ref[i];
      if ((val != null) && val.flg && --val.d <= 0) {
        val.f();
        results.push(val.flg = false);
      } else {
        results.push(void 0);
      }
    }
    return results;
  };

  DelayMgr.prototype._sliceNull = function(arr) {
    var i, j, len, newArr, val;
    newArr = [];
    for (i = j = 0, len = arr.length; j < len; i = ++j) {
      val = arr[i];
      if (val !== null) {
        newArr.push(val);
      }
    }
    return newArr;
  };

  return DelayMgr;

})(BaseMgr);

module.exports = DelayMgr;


},{"./BaseMgr":26}],28:[function(require,module,exports){
var BaseMgr, ResizeMgr,
  bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
  extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  hasProp = {}.hasOwnProperty;

BaseMgr = require('./BaseMgr');

ResizeMgr = (function(superClass) {
  extend(ResizeMgr, superClass);

  function ResizeMgr() {
    this.sh = bind(this.sh, this);
    this.sw = bind(this.sw, this);
    this._setStageSize = bind(this._setStageSize, this);
    this._call = bind(this._call, this);
    this._eResize = bind(this._eResize, this);
    this.refresh = bind(this.refresh, this);
    this._init = bind(this._init, this);
    ResizeMgr.__super__.constructor.call(this);
    this._resizeList = [];
    this.ws = {
      w: 0,
      h: 0,
      oldW: -1,
      oldH: -1
    };
    this._t;
    this._init();
  }

  ResizeMgr.prototype._init = function() {
    ResizeMgr.__super__._init.call(this);
    $(window).bind("resize", this._eResize);
    return this._setStageSize();
  };

  ResizeMgr.prototype.add = function(func, isCall) {
    this._resizeList.push(func);
    if ((isCall != null) && isCall) {
      return func(this.ws.w, this.ws.h);
    }
  };

  ResizeMgr.prototype.remove = function(func) {
    var arr, i, j, len, ref, val;
    arr = [];
    ref = this._resizeList;
    for (i = j = 0, len = ref.length; j < len; i = ++j) {
      val = ref[i];
      if (val !== func) {
        arr.push(val);
      }
    }
    return this._resizeList = arr;
  };

  ResizeMgr.prototype.refresh = function() {
    return this._eResize();
  };

  ResizeMgr.prototype._eResize = function(e) {
    var i, j, len, ref, val;
    this._setStageSize();
    if (this._t != null) {
      ref = this._t;
      for (i = j = 0, len = ref.length; j < len; i = ++j) {
        val = ref[i];
        clearInterval(val);
      }
      this._t = null;
    }
    this._t = [];
    return this._t[0] = setTimeout(this._call, 200);
  };

  ResizeMgr.prototype._call = function() {
    var i, j, len, ref, results, val;
    ref = this._resizeList;
    results = [];
    for (i = j = 0, len = ref.length; j < len; i = ++j) {
      val = ref[i];
      results.push(val(this.ws.w, this.ws.h));
    }
    return results;
  };

  ResizeMgr.prototype._setStageSize = function() {
    var h, w;
    if (this._u.isSmt()) {
      w = window.innerWidth;
      h = window.innerHeight;
    } else {
      if (this._u.isIe8Under()) {
        w = $(window).width();
        h = $(window).height();
      } else {
        w = window.innerWidth;
        h = window.innerHeight;
      }
    }
    this.ws.oldW = this.ws.w;
    this.ws.oldH = this.ws.h;
    this.ws.w = w;
    return this.ws.h = h;
  };

  ResizeMgr.prototype.sw = function() {
    return this.ws.w;
  };

  ResizeMgr.prototype.sh = function() {
    return this.ws.h;
  };

  return ResizeMgr;

})(BaseMgr);

module.exports = ResizeMgr;


},{"./BaseMgr":26}],29:[function(require,module,exports){
var BaseMgr, UpdateMgr,
  bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
  extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  hasProp = {}.hasOwnProperty;

BaseMgr = require('./BaseMgr');

UpdateMgr = (function(superClass) {
  extend(UpdateMgr, superClass);

  function UpdateMgr(isRAF) {
    this._update = bind(this._update, this);
    this._init = bind(this._init, this);
    UpdateMgr.__super__.constructor.call(this);
    this.cnt = 0;
    this._isRAF = isRAF || true;
    this._updateList = [];
    this._init();
  }

  UpdateMgr.prototype._init = function() {
    var requestAnimationFrame;
    UpdateMgr.__super__._init.call(this);
    requestAnimationFrame = window.requestAnimationFrame || window.mozRequestAnimationFrame || window.webkitRequestAnimationFrame || window.msRequestAnimationFrame;
    window.requestAnimationFrame = requestAnimationFrame;
    if (this._isRAF && (window.requestAnimationFrame != null)) {
      return window.requestAnimationFrame(this._update);
    } else {
      return setInterval(this._update, 1000 / 60);
    }
  };

  UpdateMgr.prototype.add = function(func) {
    return this._updateList.push(func);
  };

  UpdateMgr.prototype.remove = function(func) {
    var arr, i, j, len, ref, val;
    arr = [];
    ref = this._updateList;
    for (i = j = 0, len = ref.length; j < len; i = ++j) {
      val = ref[i];
      if (val !== func) {
        arr.push(val);
      }
    }
    return this._updateList = arr;
  };

  UpdateMgr.prototype._update = function() {
    var i, j, len, ref, t, val;
    this.cnt++;
    ref = this._updateList;
    for (i = j = 0, len = ref.length; j < len; i = ++j) {
      val = ref[i];
      if (val != null) {
        val();
      }
    }
    if (this._isRAF && (window.requestAnimationFrame != null)) {
      return t = window.requestAnimationFrame(this._update);
    }
  };

  return UpdateMgr;

})(BaseMgr);

module.exports = UpdateMgr;


},{"./BaseMgr":26}],30:[function(require,module,exports){
var Rect,
  bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

Rect = (function() {
  function Rect(x, y, w, h) {
    this.center = bind(this.center, this);
    this.bottom = bind(this.bottom, this);
    this.right = bind(this.right, this);
    this.x = x || 0;
    this.y = y || 0;
    this.w = w || 0;
    this.h = h || 0;
  }

  Rect.prototype.right = function() {
    return this.x + this.w;
  };

  Rect.prototype.bottom = function() {
    return this.y + this.h;
  };

  Rect.prototype.center = function() {
    return {
      x: ~~(this.x + this.w * 0.5),
      y: ~~(this.y + this.h * 0.5)
    };
  };

  return Rect;

})();

module.exports = Rect;


},{}]},{},[16]);
