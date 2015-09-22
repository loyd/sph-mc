import 'setimmediate';
import now from 'performance-now';
import raf from 'raf';


if (!performance)
  window.performance = {now};

if (!performance.now)
  performance.now = now;

if (!requestAnimationFrame)
  window.requestAnimationFrame = raf;
