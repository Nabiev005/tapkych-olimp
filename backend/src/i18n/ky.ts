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
  },
} as const;
