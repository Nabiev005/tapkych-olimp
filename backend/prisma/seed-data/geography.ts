// Regions of Kyrgyzstan (7 oblasts + Bishkek and Osh cities) and sample schools.

export interface RegionSeed {
  slug: string;
  nameKy: string;
  nameRu: string;
}

export const REGIONS: RegionSeed[] = [
  { slug: 'bishkek', nameKy: 'Бишкек шаары', nameRu: 'город Бишкек' },
  { slug: 'osh-city', nameKy: 'Ош шаары', nameRu: 'город Ош' },
  { slug: 'chui', nameKy: 'Чүй облусу', nameRu: 'Чуйская область' },
  { slug: 'issyk-kul', nameKy: 'Ысык-Көл облусу', nameRu: 'Иссык-Кульская область' },
  { slug: 'naryn', nameKy: 'Нарын облусу', nameRu: 'Нарынская область' },
  { slug: 'talas', nameKy: 'Талас облусу', nameRu: 'Таласская область' },
  { slug: 'jalal-abad', nameKy: 'Жалал-Абад облусу', nameRu: 'Джалал-Абадская область' },
  { slug: 'osh', nameKy: 'Ош облусу', nameRu: 'Ошская область' },
  { slug: 'batken', nameKy: 'Баткен облусу', nameRu: 'Баткенская область' },
];

export interface SchoolSeed {
  id: string;
  regionSlug: string;
  nameKy: string;
  nameRu: string;
  district?: string;
}

// Sample schools for demo purposes only (generic numbered names).
export const SCHOOLS: SchoolSeed[] = [
  {
    id: 'school-bishkek-12',
    regionSlug: 'bishkek',
    nameKy: '№12 гимназия',
    nameRu: 'Гимназия №12',
  },
  {
    id: 'school-bishkek-41',
    regionSlug: 'bishkek',
    nameKy: '№41 орто мектеп',
    nameRu: 'Средняя школа №41',
  },
  {
    id: 'school-bishkek-70',
    regionSlug: 'bishkek',
    nameKy: '№70 физика-математика лицейи',
    nameRu: 'Физико-математический лицей №70',
  },
  {
    id: 'school-osh-city-5',
    regionSlug: 'osh-city',
    nameKy: '№5 орто мектеп',
    nameRu: 'Средняя школа №5',
  },
  {
    id: 'school-osh-city-17',
    regionSlug: 'osh-city',
    nameKy: '№17 гимназия',
    nameRu: 'Гимназия №17',
  },
  { id: 'school-chui-3', regionSlug: 'chui', nameKy: '№3 орто мектеп', nameRu: 'Средняя школа №3' },
  { id: 'school-chui-8', regionSlug: 'chui', nameKy: '№8 лицей', nameRu: 'Лицей №8' },
  {
    id: 'school-issyk-kul-2',
    regionSlug: 'issyk-kul',
    nameKy: '№2 орто мектеп',
    nameRu: 'Средняя школа №2',
  },
  {
    id: 'school-issyk-kul-9',
    regionSlug: 'issyk-kul',
    nameKy: '№9 гимназия',
    nameRu: 'Гимназия №9',
  },
  {
    id: 'school-naryn-1',
    regionSlug: 'naryn',
    nameKy: '№1 орто мектеп',
    nameRu: 'Средняя школа №1',
  },
  { id: 'school-naryn-4', regionSlug: 'naryn', nameKy: '№4 лицей', nameRu: 'Лицей №4' },
  {
    id: 'school-talas-6',
    regionSlug: 'talas',
    nameKy: '№6 орто мектеп',
    nameRu: 'Средняя школа №6',
  },
  { id: 'school-talas-11', regionSlug: 'talas', nameKy: '№11 гимназия', nameRu: 'Гимназия №11' },
  {
    id: 'school-jalal-abad-7',
    regionSlug: 'jalal-abad',
    nameKy: '№7 орто мектеп',
    nameRu: 'Средняя школа №7',
  },
  {
    id: 'school-jalal-abad-15',
    regionSlug: 'jalal-abad',
    nameKy: '№15 лицей',
    nameRu: 'Лицей №15',
  },
  { id: 'school-osh-3', regionSlug: 'osh', nameKy: '№3 орто мектеп', nameRu: 'Средняя школа №3' },
  { id: 'school-osh-21', regionSlug: 'osh', nameKy: '№21 гимназия', nameRu: 'Гимназия №21' },
  {
    id: 'school-batken-2',
    regionSlug: 'batken',
    nameKy: '№2 орто мектеп',
    nameRu: 'Средняя школа №2',
  },
  { id: 'school-batken-10', regionSlug: 'batken', nameKy: '№10 лицей', nameRu: 'Лицей №10' },
];
