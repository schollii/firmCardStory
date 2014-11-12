Сегодня мы рассмотрим пример реализации несложного картографического сервиса по [БЭМ-методологии](http://ru.bem.info/).

### Введение
=============

Менеджер:
Хочу чтоб карта была, я в здание кликал, у меня балун появлялся и в нём информация об организации.

Программист:
* Сделать html-страницу;
* Использовать библиотеку [Leaflet](https://github.com/Leaflet/Leaflet);
* Написать переиспользуемый плагин отображения карточки фирмы;
* Сослаться на слово "переиспользуемый" и попробовать это сделать по БЭМ-методологии.

Переиспользуемый плагин?
* Отловить клик по карте;
* Отправить запрос к [геокодеру 2GIS](http://api.2gis.ru/doc/geo/search/), который вернет данные фирмы по координатам;
* Показать балун и с нужной информацией.

Назовем наш проект firmCardStory.

### Инициализация проекта
=============

Инициализируем заготовку проекта:

```sh
git clone https://github.com/bem/project-stub.git firmCardStory
cd firmCardStory
npm install
```

Выполним сборку проекта:

```sh
$ enb make
```

Откроем в браузере файл desktop.bundles/index/index.html и посмотрим что страница собралась:
![Результат сборки](http://img-fotki.yandex.ru/get/6705/221798411.0/0_b9e18_bcebeab1_XL.jpg)

Для разработки также удобно использовать `enb server`, который будет выполнять сборку проекта по запросу от браузера, для этого нужно запустить его находясь в папке проекта:

    $ ./node_modules/enb/bin/enb server

И зайти в браузере по адресу: http://localhost:8080/desktop.bundles/index

### Макет страницы
=============

Изменим структуру страницы, заполнив файл desktop.bundles/index/index.bemjson.js следующим содержимым:

```js
({
    block: 'page',
    title: 'Карта Новосибирска',
    styles: [
        { elem: 'css', url: 'http://cdn.leafletjs.com/leaflet-0.7.3/leaflet.css' },
        { elem: 'css', url: 'index.min.css' }
    ],
    scripts: [
        { elem: 'js', url: 'http://cdn.leafletjs.com/leaflet-0.7.3/leaflet.js' },
        { elem: 'js', url: 'index.min.js' }
    ],
    content: [
        { block: 'map' }
    ]
});
```

В данном файле мы описали, что:
* Для формирования страницы используется блок [page](http://ru.bem.info/libs/bem-core/v2/desktop/page/) библиотеки [bem-core](http://ru.bem.info/libs/bem-core/);
* Заголовок страницы - Карта Новосибирска;
* На страницу будут подключены css и js файлы;
* Контент страницы будет формироваться из блока map.

Подробнее о BEMJSON можно почитать [в документации](http://ru.bem.info/technology/bemjson/2.3.0/bemjson/).

### Блок `firmcard`
=============

Нам нужен блок, в зону ответственности которого входит:
* Принять на вход данные о фирме в JSON-формате;
* Вернуть красиво сверстанный html-код карточки.

Создадим этот блок на уровне переопределения desktop.blocks в технологии js:

```sh
$ mkdir ./desktop.blocks/firmcard
$ touch ./desktop.blocks/firmcard/firmcard.js
```

Опишем файл desktop.blocks/firmcard/firmcard.js:

```js
modules.define('firmcard', ['i-bem__dom', 'jquery'], function(provide, BEMDOM, $) {
    provide(BEMDOM.decl(this.name, {}, {
        /**
         * @param {Object} data Firm info
         * @return {String}
         */
        getFormattedText: function (data) {
            return [
                '<b>Информация:</b><br />',
                'Адрес: ' + data.name,
                'Тип: ' + data.attributes.purpose
            ].join('<br>');
        }
    }));
});
```

Для описания карточки мы воспользовались модульной системой [ymodules](http://ru.bem.info/tools/bem/modules/) и библиотекой [i-bem.js](http://ru.bem.info/libs/bem-core/v2/desktop/i-bem/). Подробнее о данной библиотеке можно узнать из доклада Владимира Варанкина "[Зачем мы написали js-фреймворк?](http://video.yandex.ua/users/ya-events/view/880/#hq)".

На самом деле, в реальном приложении карточка может быть более функциональна, например она может содержать сложную верстку, просчитывать и отображать время до закрытия организации, отлавливать клики на себе и разворачиваться с детальной информацией и т.д.

В таком случае, из простого хелпера возвращающего отформатированный текст, идею карточки можно развить в самодостаточный независимый блок приложения с множеством элементов и модификаторов в разных технологиях (css, js, bemhtml), который принимает на вход DOM-элемент и JSON с "сырыми" данными, разворачивается в этом DOM-элементе и начинает функционировать.

### Блок `geoclicker`
=============

Кроме самого блока карточки организации нам потребуется плагин к LeafLet-у, который будет отлавливать клик по карте и показывать карточку в балуне.

Создадим его:

```sh
$ mkdir ./desktop.blocks/geoclicker
$ touch ./desktop.blocks/geoclicker/geoclicker.js
```

И опишем поведение блока в файле desktop.blocks/geoclicker/geoclicker.js:

```js
modules.define(
    'geoclicker',
    ['i-bem__dom', 'jquery', 'firmcard'],
    function(provide, BEMDOM, $, firmcard) {

        provide(BEMDOM.decl(this.name, {}, {
            /**
             * @type {L.Map}
             */
            _map: null,

            /**
             * @type {L.LatLng}
             */
            _lastLatLng: null,

            /**
             * @param {L.Map} map
             */
            addTo: function (map) {
                this._map = map;
                this._map.on({
                    'click': this.getGeoObject
                }, this);
            },

            /**
             * @param {L.MouseEvent} mouseEvent
             */
            getGeoObject: function (mouseEvent) {
                this._lastLatLng = mouseEvent.latlng;
                $.ajax({
                    url: 'http://catalog.api.2gis.ru/geo/search',
                    data: {
                        q: mouseEvent.latlng.lng + ',' + mouseEvent.latlng.lat,
                        key: this.API_KEY,
                        version: this.API_VERSION,
                        output: 'jsonp',
                        types: 'house,sight,station_platform'
                   },
                   dataType: 'jsonp',
                   success: this.showPopup,
                   context: this
               });
            },

            /**
             * @param {Object} data
             */
            showPopup: function (data) {
                (if (data.result === undefined) return;)

                var content = firmcard.getFormattedText(data.result[0]);
                var popup = L.popup()
                    .setLatLng(this._lastLatLng)
                    .setContent(content)
                    .openOn(this._map);
            },

            /**
             * @type {String}
             */
            API_KEY: 'rujrdp3400',

            /**
             * @type {Number}
             */
            API_VERSION: 1.3
        }));


});
```

Как видим, блок довольно простой и состоит всего из 3-х методов:
* addTo - обработчик добавления плагина на карту LeafLet, в котором происходит подписка на событие клика по карте;
* getGeoObject - метод для получения данных из геокодера 2GIS;
* showPopup - метод для отображения балуна с информацией об организации.

### Блок map
=============

Для того, чтобы карта отобразилась на странице, её нужно инициализировать. За инициализацию карты с написанным нами плагином будет отвечать блок map, создадим его:

```sh
$ mkdir ./desktop.blocks/map
$ touch ./desktop.blocks/map/map.js
$ touch ./desktop.blocks/map/map.css
$ touch ./desktop.blocks/map/map.bemhtml
```

Опишем файл desktop.blocks/map/map.js:

```js
modules.define('map', ['i-bem__dom', 'geoclicker'], function(provide, BEMDOM, geoclicker) {

    provide(BEMDOM.decl(this.name, {
        onSetMod: {
            js: {
                inited: function() {
                    var map = L.map(this.domElem.get(0)).setView([54.98, 82.89], 16);
                    // L.tileLayer('http://{s}.tile.cloudmade.com/BC9A493B41014CAABB98F0471D759707/997/256/{z}/{x}/{y}.png').addTo(map);
                    L.tileLayer('http://{s}.tiles.mapbox.com/v3/dmtry.k2n318k0/{z}/{x}/{y}.png', {
                        attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="http://mapbox.com">Mapbox</a>',
                        maxZoom: 18
                    }).addTo(map);
                    geoclicker.addTo(map);
                }
            }
        }

    }));
});
```

Опишем файл desktop.blocks/map/map.css:

```css
.map {
    height: 600px;
}
```

И desktop.blocks/map/map.bemhtml:

```js
block('map')(
    js()(true)
)
```


### Зависимости
=============

На данный момент у нас имеется такая цепочка зависимостей между блоками:
![Зависимости](http://img-fotki.yandex.ru/get/5000/221798411.0/0_b9e16_fc510a98_L.jpg)

Эти зависимости нужно где-то описать. Описание зависимостей производится с помощью файлов deps.js. Каждый блок должен сам знать, что ему нужно для полноценной работы.

Создадим файлы зависимостей для блоков:

```sh
$ touch ./desktop.blocks/map/map.deps.js
$ touch ./desktop.blocks/geoclicker/geoclicker.deps.js
```

Заполним файл desktop.blocks/geoclicker/geoclicker.deps.js:

```js
({
    mustDeps: [
        'firmcard'
    ]
})
```

Заполним файл desktop.blocks/map/map.deps.js:

```js
({
    shouldDeps: [
        'geoclicker'
    ]
})
```

### Сборка
=============

Выполним сборку проекта:

    $ enb make

Откроем файл [desktop.bundles/index/index.html](http://localhost:8080/desktop.bundles/index/index.html) в браузере и посмотрим на результат работы нашего приложения:
![Результат сборки](http://img-fotki.yandex.ru/get/9557/221798411.0/0_b9e17_ec9d4b59_XXL.png)

Приложение готово к работе. Теперь при клике в каждое здание мы получим краткую информацию о нем.

Код приложения доступен по адресу:
[https://github.com/AndreyGeonya/firmCardStory](https://github.com/AndreyGeonya/firmCardStory)
