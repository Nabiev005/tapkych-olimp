import type { Messages } from './index.js';

export const ru: Messages = {
  errors: {
    INTERNAL: 'Внутренняя ошибка сервера. Попробуйте ещё раз чуть позже.',
    NOT_FOUND: 'Запрошенные данные не найдены.',
    ROUTE_NOT_FOUND: 'Такого адреса API не существует.',
    VALIDATION_ERROR: 'Во введённых данных есть ошибки.',
    INVALID_JSON: 'Неверный формат запроса (JSON).',
    UNAUTHORIZED: 'Войдите в систему, чтобы выполнить это действие.',
    FORBIDDEN: 'У вас нет прав на это действие.',
    TOO_MANY_REQUESTS: 'Слишком много запросов. Попробуйте ещё раз чуть позже.',
    CORS_NOT_ALLOWED: 'Запросы с этого домена не разрешены.',
  },
  validation: {
    required: 'Это поле обязательно.',
    invalidType: 'Неверный тип значения.',
    invalidEmail: 'Неверный адрес email.',
    invalidFormat: 'Неверный формат значения.',
    invalidOption: 'Выбрано недопустимое значение.',
    stringTooShort: 'Должно быть не менее {{min}} символов.',
    stringTooLong: 'Должно быть не более {{max}} символов.',
    numberTooSmall: 'Значение должно быть не меньше {{min}}.',
    numberTooBig: 'Значение должно быть не больше {{max}}.',
    arrayTooShort: 'Выберите не менее {{min}} элементов.',
    arrayTooBig: 'Должно быть не более {{max}} элементов.',
    unknownKeys: 'Переданы неизвестные поля.',
  },
};
