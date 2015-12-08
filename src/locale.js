import assert from 'assert';


const useRuLang = (window.navigator.language || window.navigator.userLanguage) === 'ru';

const map = {
  'Restart': 'Перезапуск',
  'Pause': 'Приостановить',
  'Resume': 'Продолжить',
  'Environment': 'Среда',
  'Gravity': 'Гравитация',
  'Time step': 'Временной шаг',
  'Fluid physics': 'Хар-ки жидкости',
  'Temperature': 'Температура',
  'Density': 'Плотность',
  'Viscosity': 'Вязкость',
  'Gas stiffness': 'Жёсткость',
  'Surface tension': 'Пов. натяжение',
  'Restitution': 'Восстановление',
  'SPH': 'ГСЧ',
  'Particle count': 'Кол-во частиц',
  'Mass of particle': 'Масса частицы',
  'Support radius': 'Радиус ядра',
  'Mode': 'Режим',
  'wireframe': 'каркас',
  'mockup': 'модель',
  'dual': 'двойной',
  'MC': 'ШК',
  'Spread': 'Сглаживание',
  'Voxel count': 'Кол-во вокселей',
  'Isosurface level': 'Уровень изопов.',
  'Optics': 'Оптика',
  'Ambient': 'Фоновое осв.',
  'Diffuse': 'Рассеянное осв.',
  'Specular': 'Зеркальное осв.',
  'Lustreless': 'Матовость',
  'Color': 'Цвет',
  'Opacity': 'Непрозрачность'
};

export default function(string) {
  assert.equal(string.length, 1);
  assert(string[0] in map);

  return useRuLang ? map[string[0]] : string[0];
}
