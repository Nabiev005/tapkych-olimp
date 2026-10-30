// Subjects and topics. `icon` is a lucide-react icon name.

export interface TopicSeed {
  slug: string;
  nameKy: string;
  nameRu: string;
}

export interface SubjectSeed {
  slug: 'math' | 'physics' | 'informatics';
  nameKy: string;
  nameRu: string;
  icon: string;
  topics: TopicSeed[];
}

export const SUBJECTS: SubjectSeed[] = [
  {
    slug: 'math',
    nameKy: 'Математика',
    nameRu: 'Математика',
    icon: 'Sigma',
    topics: [
      { slug: 'algebra', nameKy: 'Алгебра', nameRu: 'Алгебра' },
      { slug: 'geometry', nameKy: 'Геометрия', nameRu: 'Геометрия' },
      { slug: 'number-theory', nameKy: 'Сандар теориясы', nameRu: 'Теория чисел' },
      { slug: 'combinatorics', nameKy: 'Комбинаторика', nameRu: 'Комбинаторика' },
      { slug: 'inequalities', nameKy: 'Теңсиздиктер', nameRu: 'Неравенства' },
    ],
  },
  {
    slug: 'physics',
    nameKy: 'Физика',
    nameRu: 'Физика',
    icon: 'Atom',
    topics: [
      { slug: 'kinematics', nameKy: 'Кинематика', nameRu: 'Кинематика' },
      { slug: 'dynamics', nameKy: 'Динамика', nameRu: 'Динамика' },
      { slug: 'energy', nameKy: 'Жумуш жана энергия', nameRu: 'Работа и энергия' },
      { slug: 'electricity', nameKy: 'Электр', nameRu: 'Электричество' },
      { slug: 'thermal', nameKy: 'Жылуулук кубулуштары', nameRu: 'Тепловые явления' },
    ],
  },
  {
    slug: 'informatics',
    nameKy: 'Информатика',
    nameRu: 'Информатика',
    icon: 'Cpu',
    topics: [
      { slug: 'algorithms', nameKy: 'Алгоритмдер', nameRu: 'Алгоритмы' },
      { slug: 'number-systems', nameKy: 'Эсептөө системалары', nameRu: 'Системы счисления' },
      { slug: 'logic', nameKy: 'Логика', nameRu: 'Логика' },
      { slug: 'graphs', nameKy: 'Графтар', nameRu: 'Графы' },
    ],
  },
];

export interface AchievementSeed {
  code: string;
  nameKy: string;
  nameRu: string;
  descriptionKy: string;
  descriptionRu: string;
  icon: string;
  threshold: number;
}

export const ACHIEVEMENTS: AchievementSeed[] = [
  {
    code: 'first-solve',
    nameKy: 'Биринчи маселе',
    nameRu: 'Первая задача',
    descriptionKy: 'Биринчи маселени туура чечтиңиз.',
    descriptionRu: 'Вы правильно решили первую задачу.',
    icon: 'Sparkles',
    threshold: 1,
  },
  {
    code: 'solved-10',
    nameKy: 'Он маселе',
    nameRu: 'Десять задач',
    descriptionKy: '10 маселени туура чечтиңиз.',
    descriptionRu: 'Вы правильно решили 10 задач.',
    icon: 'BookOpenCheck',
    threshold: 10,
  },
  {
    code: 'solved-50',
    nameKy: 'Элүү маселе',
    nameRu: 'Пятьдесят задач',
    descriptionKy: '50 маселени туура чечтиңиз.',
    descriptionRu: 'Вы правильно решили 50 задач.',
    icon: 'Medal',
    threshold: 50,
  },
  {
    code: 'solved-100',
    nameKy: '100 маселе',
    nameRu: '100 задач',
    descriptionKy: '100 маселени туура чечтиңиз.',
    descriptionRu: 'Вы правильно решили 100 задач.',
    icon: 'Trophy',
    threshold: 100,
  },
  {
    code: 'solved-250',
    nameKy: '250 маселе',
    nameRu: '250 задач',
    descriptionKy: '250 маселени туура чечтиңиз — чыныгы олимпиадачы!',
    descriptionRu: 'Вы правильно решили 250 задач — настоящий олимпиадник!',
    icon: 'Crown',
    threshold: 250,
  },
  {
    code: 'streak-3',
    nameKy: '3 күн катары менен',
    nameRu: '3 дня подряд',
    descriptionKy: 'Үч күн катары менен күн сайын маселе чечтиңиз.',
    descriptionRu: 'Вы решали задачи три дня подряд.',
    icon: 'Flame',
    threshold: 3,
  },
  {
    code: 'streak-7',
    nameKy: '7 күн катары менен',
    nameRu: '7 дней подряд',
    descriptionKy: 'Жети күн катары менен күн сайын маселе чечтиңиз.',
    descriptionRu: 'Вы решали задачи каждый день семь дней подряд.',
    icon: 'Flame',
    threshold: 7,
  },
  {
    code: 'streak-30',
    nameKy: '30 күн катары менен',
    nameRu: '30 дней подряд',
    descriptionKy: 'Бир ай бою күн сайын маселе чечтиңиз.',
    descriptionRu: 'Вы решали задачи каждый день целый месяц.',
    icon: 'Zap',
    threshold: 30,
  },
  {
    code: 'math-10',
    nameKy: 'Математик',
    nameRu: 'Математик',
    descriptionKy: 'Математикадан 10 маселе чечтиңиз.',
    descriptionRu: 'Вы решили 10 задач по математике.',
    icon: 'Sigma',
    threshold: 10,
  },
  {
    code: 'physics-10',
    nameKy: 'Физик',
    nameRu: 'Физик',
    descriptionKy: 'Физикадан 10 маселе чечтиңиз.',
    descriptionRu: 'Вы решили 10 задач по физике.',
    icon: 'Atom',
    threshold: 10,
  },
  {
    code: 'informatics-10',
    nameKy: 'Программист',
    nameRu: 'Программист',
    descriptionKy: 'Информатикадан 10 маселе чечтиңиз.',
    descriptionRu: 'Вы решили 10 задач по информатике.',
    icon: 'Cpu',
    threshold: 10,
  },
  {
    code: 'hard-1',
    nameKy: 'Биринчи чоку',
    nameRu: 'Первая вершина',
    descriptionKy: 'Кыйындыгы 4 же 5 жылдыздуу маселени чечтиңиз.',
    descriptionRu: 'Вы решили задачу сложностью 4 или 5 звёзд.',
    icon: 'Mountain',
    threshold: 1,
  },
  {
    code: 'hard-10',
    nameKy: 'Чокулардын ээси',
    nameRu: 'Покоритель вершин',
    descriptionKy: 'Кыйындыгы 4–5 жылдыздуу 10 маселени чечтиңиз.',
    descriptionRu: 'Вы решили 10 задач сложностью 4–5 звёзд.',
    icon: 'MountainSnow',
    threshold: 10,
  },
  {
    code: 'contest-1',
    nameKy: 'Биринчи жарыш',
    nameRu: 'Первая олимпиада',
    descriptionKy: 'Биринчи онлайн жарышка катыштыңыз.',
    descriptionRu: 'Вы впервые участвовали в онлайн-олимпиаде.',
    icon: 'Timer',
    threshold: 1,
  },
  {
    code: 'contest-5',
    nameKy: 'Жарыштын ардагери',
    nameRu: 'Ветеран олимпиад',
    descriptionKy: '5 онлайн жарышка катыштыңыз.',
    descriptionRu: 'Вы участвовали в 5 онлайн-олимпиадах.',
    icon: 'Award',
    threshold: 5,
  },
];
