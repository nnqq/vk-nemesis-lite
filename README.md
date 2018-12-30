# Немезида Lite ВКонтакте (Node.js)

Упрощенная реализация [Немезиды ВКонтакте](https://vk.com/blog/nemesis). Защищает фотографии вашей группы от копирования конкурентами, и в отличии от оригинальной Немезиды, отправляет вам ссылки на плагиат в формате оригинал-копия (для простого копипаста в тикет службы поддержки, при необходимости)

## Алгоритм работы

1. Скачивает все фото со стены нужной группы. Эти фото считаются «оригиналом»
2. Ищет первые 1000 (настраивается) групп конкурентов по введенному в config поисковому запросу
3. Поочередно скачивает и сравнивает фото со стены конкурента, загруженные не позже 24 часов назад (настраивается), с «оригиналом»
   * Если фотографии отличаются менее чем на 97% (настраивается), сразу отправляет личное сообщение пользователю который указан в config файле (сообщение придет «себе от себя»)
4. Когда все группы конкурентов проверены, повторяет пункты 1-2-3

На стандартных настройках (стабильных) скрипт сверяет 5-6 пар фото в секунду

Без использования прокси для скачивания изображений – быстрее не получится, ВК не отвечает при более частых запросах к pp.userapi.com. Есть опция использования пула прокси, на данный момент это экспериментальная функция и стабильная работа не гарантируется. Испольуемая библиотека Resemble.js «сравнивает» пару изображений такого размера (мобильный размер ВК, ~ 75х50 px) примерно за 1-3 мс

## Настройка и запуск

Инструкция поможет вам настроить и запустить копию проекта на локальной машине или хостинге

### Переменные окружения

```
VK_ACCESS_TOKEN
```

**Обязательно**. Ваш `access_token` **пользователя** ВКонтакте, желательно выставить все права, и используйте Standalone-приложение. [Инструкция от ВКонтакте](https://vk.com/dev/implicit_flow_user)

```
PROXY_TOKEN
```

**Не обязательно**. Токен прокси-сервиса [pubproxy.com](http://pubproxy.com/)

### Настройка Config файла

[lib/config.js](lib/config.js)

```javascript
module.exports = {
  myGroupId: 22822305, // Число. ID группы с 'оригинальными' фото
  userIdForNotifications: 1, // Число. ID пользователя кому отправляем сообщения о найденном плагиате
  searchQuery: 'интернет магазин электроники', // Строка. Поисковый запрос для поиска групп ВК 'конкурентов' (результаты как при обычном поиске групп внутри ВК)
  maxGroupsCount: 1000, // Число. Количество групп по поисковому запросу (максимум 1000)
  whiteList: [2158488, 147845620], // Массив чисел. ID групп, которые не нужно проверять на плагиат
  competitorPhotosMaxAge: 86400, // Число. Не проверять фото загруженные более Х секунд назад (в секундах, 86400 это 24 часа)
  criticalPhotosMisMatch: 97, // Число. Минимальное 'несовпадение' фото, по достижении которого считать что фото плагиат (в процентах). Из-за низкого качества фото на проверку, 97 оптимально. Если много ложных срабатываний, можно уменьшить
  groupsConcurrency: 1, // Число. Одновременно Х запросов к группам конкурентов для работы с фото (больше 1 не рекомендуется если вы не используете прокси)
  photosConcurrency: 1, // Число. Одновременно Х запросов на скачивание фото (больше 1 не рекомендуется если вы не используете прокси)

  useProxy: false, // Boolean. Использовать прокси для скачивания фото (экспериментальная функция, не стабильно)
  proxiesPoolSize: 100, // Число. Начальный размер пула прокси
  proxyReqSecLimit: 3, // Число. Лимит запросов в секунду на каждый прокси
};
```

### Запуск

```
npm install
```

```
npm start
```

## Лицензия

[MIT](LICENSE)

## Дополнительная информация

Связаться с автором - [Telegram](https://t.me/nn2qq)