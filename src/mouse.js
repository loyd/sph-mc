import {EventEmitter} from 'events';


export default class Mouse extends EventEmitter {
  constructor(observable) {
    super();

    this.down = false;
    this.cursor = {x: 0, y: 0};

    observable.addEventListener('mousedown', e => this.onMouseDown(e));
    window.addEventListener('mousemove', e => this.onMouseMove(e));
    window.addEventListener('mouseup', e => this.onMouseUp(e));
    observable.addEventListener('wheel', e => this.onMouseWheel(e));

    let bodyStyle = getComputedStyle(observable);
    this.lineHeight = parseInt(bodyStyle.fontSize, 10);
    this.pageHeight = parseInt(bodyStyle.height, 10);
  }

  onMouseDown(e) {
    this.down = true;
    document.body.classList.add('mouse');
    this.cursor.x = e.clientX;
    this.cursor.y = e.clientY;
    e.preventDefault();

    this.emit('down');
  }

  onMouseMove(e) {
    if (!this.down)
      return;

    let [dx, dy] = [e.clientX - this.cursor.x, e.clientY - this.cursor.y];

    this.cursor.x = e.clientX;
    this.cursor.y = e.clientY;

    this.emit('move', dx, dy);
  }

  onMouseUp(e) {
    this.down = false;
    document.body.classList.remove('mouse');
    this.emit('up');
  }

  onMouseWheel(e) {
    let deltaY = e.deltaMode === 0 ? e.deltaY
               : e.deltaMode === 1 ? this.lineHeight * e.deltaY
                                   : this.pageHeight * e.deltaY;
    this.emit('wheel', deltaY);
  }
}
