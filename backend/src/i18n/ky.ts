// Kyrgyz (default) backend messages. ru.ts must have exactly the same shape.

export const ky = {
  errors: {
    INTERNAL: 'Сервердин ички катасы. Бир аздан кийин кайра аракет кылыңыз.',
    NOT_FOUND: 'Сурап жаткан маалымат табылган жок.',
    ROUTE_NOT_FOUND: 'Мындай API дареги жок.',
    VALIDATION_ERROR: 'Киргизилген маалыматта ката бар.',
    INVALID_JSON: 'Сурамдын форматы туура эмес (JSON).',
    UNAUTHORIZED: 'Бул аракет үчүн системага кириңиз.',
    FORBIDDEN: 'Бул аракетке укугуңуз жок.',
    TOO_MANY_REQUESTS: 'Өтө көп сурам жөнөтүлдү. Бир аздан кийин кайра аракет кылыңыз.',
    CORS_NOT_ALLOWED: 'Бул домендон сурам жөнөтүүгө уруксат жок.',
    TOKEN_EXPIRED: 'Сессиянын мөөнөтү бүттү. Кайра кириңиз.',
    EMAIL_TAKEN: 'Бул email менен катталган колдонуучу бар.',
    INVALID_CREDENTIALS: 'Email же пароль туура эмес.',
    ACCOUNT_BLOCKED: 'Аккаунтуңуз бөгөттөлгөн. Администраторго кайрылыңыз.',
    INVALID_REFRESH_TOKEN: 'Сессия жараксыз. Кайра кириңиз.',
    INVALID_RESET_TOKEN: 'Шилтеме жараксыз же мөөнөтү бүткөн. Жаңы шилтеме сураңыз.',
    SCHOOL_NOT_IN_REGION: 'Тандалган мектеп бул облуска таандык эмес.',
  },
  validation: {
    required: 'Бул талаа милдеттүү.',
    invalidType: 'Маанинин түрү туура эмес.',
    invalidEmail: 'Email дареги туура эмес.',
    invalidFormat: 'Маанинин форматы туура эмес.',
    invalidOption: 'Тандалган маани туура эмес.',
    stringTooShort: 'Кеминде {{min}} белги болушу керек.',
    stringTooLong: '{{max}} белгиден ашпашы керек.',
    numberTooSmall: 'Маани {{min}} же андан чоң болушу керек.',
    numberTooBig: 'Маани {{max}} же андан кичине болушу керек.',
    arrayTooShort: 'Кеминде {{min}} элемент тандаңыз.',
    arrayTooBig: '{{max}} элементтен ашпашы керек.',
    unknownKeys: 'Белгисиз талаалар жөнөтүлдү.',
    gradeRequired: 'Классыңызды тандаңыз.',
    schoolRequired: 'Мектебиңизди тандаңыз же атын жазыңыз.',
  },
  email: {
    resetSubject: 'Тапкыч Олимп — паролду калыбына келтирүү',
    resetBody:
      'Саламатсызбы, {{name}}!\n\nПаролуңузду жаңыртуу үчүн шилтемени ачыңыз (1 саат жарактуу):\n{{link}}\n\nЭгер бул сурамды сиз жөнөтпөсөңүз, бул катты көңүлгө албаңыз.',
  },
} as const;
