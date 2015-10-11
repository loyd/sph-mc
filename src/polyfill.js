//#TODO: What about core-js (babel/polyfill)?
import 'setimmediate';
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
