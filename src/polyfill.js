//#TODO: What about core-js (babel/polyfill)?
import 'setimmediate';
import dat from 'dat-gui/vendor/dat.gui';
import now from 'performance-now';
import raf from 'raf';


if (!performance)
  window.performance = {now};

if (!performance.now)
  performance.now = now;

if (!requestAnimationFrame)
  window.requestAnimationFrame = raf;

if (!Math.log2)
  Math.log2 = x => Math.log(x) / Math.LN2;

// Fix step and precision bugs in dat.gui.
let buggyAdd = dat.gui.GUI.prototype.add;
dat.gui.GUI.prototype.add = function(object, property) {
  let ctrl = buggyAdd.apply(this, arguments);

  let step = arguments[4];
  if (step != null && ctrl.__impliedStep !== step) {
    let s = step.toString();
    let precision = ~s.indexOf('.') ? s.length - s.indexOf('.') - 1 : 0;

    let box = ctrl.updateDisplay(); // Yeah, `updateDisplay()` returns `NumberControllerBox`.
    box.__step = box.__impliedStep = ctrl.__step = ctrl.__impliedStep = step;
    box.__precision = ctrl.__precision = precision;
    ctrl.updateDisplay();
  }

  return ctrl;
};

