# Картографический сервис на БЭМ

В этом документе мы рассмотрим пример реализации несложного картографического сервиса по [БЭМ-методологии](https://ru.bem.info/).

## Типичное начало большинства проектов

Менеджер ставит задачи:

* хочу чтоб была карта;
* хочу при клике на здание у меня появлялся балун с информацией об организации.

Программист определяет план работ:

* сделать HTML-страницу;
* использовать библиотеку [Leaflet](https://github.com/Leaflet/Leaflet);
* написать переиспользуемый плагин отображения карточки фирмы.

Так как проект предполагает повторное использование части кода, попробуем реализовать его пользуясь БЭМ-методологией.

При чем же здесь переиспользуемый плагин? И что именно мы хотим реализовать?

Нам нужно уметь:

* отлавливать клик по карте;
* отправлять запрос к [геокодеру 2GIS](http://api.2gis.ru/doc/geo/search/), который вернет данные фирмы по координатам;
* показывать балун с нужной информацией.

## Инициализация проекта

Назовем наш проект «firmCardStory».

Инициализируем [заготовку проекта](https://ru.bem.info/tutorials/project-stub/) и установим все необходимые зависимости:

```sh
git clone https://github.com/bem/project-stub.git firmCardStory
cd firmCardStory
npm install
```

Во время разработки удобно использовать `enb server`, который будет выполнять сборку проекта по запросу при перезагрузке страницы в браузере. Для этого нужно запустить его находясь в папке проекта:

```sh
$ ./node_modules/enb/bin/enb server
```

Откроем в браузере файл [desktop.bundles/index/index.html](localhost:8080/desktop.bundles/index/index.html) и посмотрим что страница собралась:

![Результат сборки](https://img-fotki.yandex.ru/get/6705/221798411.0/0_b9e18_bcebeab1_XL.jpg)

### Макет страницы

Создадим новую структуру страницы, изменив [BEMJSON](https://ru.bem.info/technology/bemjson/current/bemjson/)-файл `desktop.bundles/index/index.bemjson.js`:

```js
({
    block : 'page',
    title : 'Карта Новосибирска',
    head : [
        { elem : 'css', url : 'http://cdn.leafletjs.com/leaflet-0.7.3/leaflet.css' },
        { elem : 'css', url : '_index.css' },
        { elem : 'js', url : 'http://cdn.leafletjs.com/leaflet-0.7.3/leaflet.js' },
        { elem : 'js', url : '_index.js' }
    ],
    content : [
        { block : 'map' }
    ]
});
```

В данном файле мы описали, что:

* для формирования страницы используется блок [page](https://ru.bem.info/libs/bem-core/current/desktop/page/) библиотеки [bem-core](https://ru.bem.info/libs/bem-core/);
* заголовок страницы - «Карта Новосибирска»;
* на страницу будут подключены CSS- и JS-файлы;
* контент страницы будет формироваться из блока `map`.

Для реализации всех задач нам понадобятся следующие блоки:

* [firmcard](#firmcard)
* [geoclicker](#geoclicker)
* [map](#map)

<a name="firmcard"></a>
### Блок `firmcard`

Блок `firmcard` будет принимать на вход данные о фирме в JSON-формате и возвращать красиво сверстанный HTML-код карточки.

Создадим блок на уровне переопределения `desktop.blocks` в технологии `JavaScript`:

```sh
$ mkdir ./desktop.blocks/firmcard
$ touch ./desktop.blocks/firmcard/firmcard.js
```

Опишем файл `desktop.blocks/firmcard/firmcard.js`:

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

Для описания карточки мы воспользовались модульной системой [YModules](https://ru.bem.info/tools/bem/modules/) и фреймворком [i-bem.js](https://ru.bem.info/libs/bem-core/current/desktop/i-bem/), подробнее о котором можно узнать из доклада Владимира Варанкина [Зачем мы написали js-фреймворк?](https://video.yandex.ua/users/ya-events/view/880/#hq).

В реальном приложении карточка может быть более функциональна. Например, она может содержать сложную верстку, просчитывать и отображать время до окончания рабочего дня организации, отлавливать клики на себе или разворачиваться для показа детальной информации.

В таком случае из простого хелпера, возвращающего отформатированный текст, идею карточки можно развить в самодостаточный независимый блок приложения с множеством элементов и модификаторов, реализованных в разных технологиях (CSS, JS, [BEMHTML](https://ru.bem.info/technology/bemhtml/current/reference/). Такой блок сможет принимать на вход DOM-элемент и JSON с «сырыми» данными, разворачиваться в этом DOM-элементе и начинать работу.


<a name="geoclicker"></a>
### Блок `geoclicker`

Кроме самого блока карточки организации нам потребуется плагин к LeafLet, который будет отлавливать клик по карте и показывать карточку в балуне.

Создадим его и назовем `geoclicker`:

```sh
$ mkdir ./desktop.blocks/geoclicker
$ touch ./desktop.blocks/geoclicker/geoclicker.js
```

И опишем поведение блока в файле `desktop.blocks/geoclicker/geoclicker.js`:

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
                if (data.result === undefined) return;

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

Реализация блока довольно простая и состоит всего из 3-х методов:

* `addTo` – обработчик добавления плагина на карту LeafLet, в котором происходит подписка на событие клика по карте;
* `getGeoObject` – метод для получения данных из геокодера 2GIS;
* `showPopup` – метод для отображения балуна с информацией об организации.

<a name="map"></a>
### Блок map

Для того, чтобы карта отобразилась на странице, ее нужно инициализировать. За инициализацию карты с написанным нами плагином будет отвечать блок `map`. Создадим его:

```sh
$ mkdir ./desktop.blocks/map
$ touch ./desktop.blocks/map/map.js
$ touch ./desktop.blocks/map/map.css
$ touch ./desktop.blocks/map/map.bemhtml
```

Опишем поведение блока в файле `desktop.blocks/map/map.js`:

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

Добавим стилей в файле `desktop.blocks/map/map.css`:

```css
.map {
    height: 600px;
}
```

И напишем шаблон в `desktop.blocks/map/map.bemhtml`:

```js
block('map')(
    js()(true)
)
```

### Зависимости

На данный момент у нас имеется такая цепочка зависимостей между блоками:
![Зависимости](https://img-fotki.yandex.ru/get/4512/246231603.0/0_14ad53_4baec27f_orig)

Эти зависимости нужно где-то описать. [Описание зависимостей](https://ru.bem.info/tools/bem/bem-tools/depsjs/) производится с помощью файлов `deps.js`. Каждый блок должен хранить информацию о том, что ему нужно для полноценной работы.

Создадим файлы зависимостей для блоков:

```sh
$ touch ./desktop.blocks/map/map.deps.js
$ touch ./desktop.blocks/geoclicker/geoclicker.deps.js
```

Пропишем зависимости блока `geoclicker` в файле `desktop.blocks/geoclicker/geoclicker.deps.js`:

```js
({
    mustDeps: [
        'firmcard'
    ]
})
```

А зависимости блока `map` в файле `desktop.blocks/map/map.deps.js`:

```js
({
    shouldDeps: [
        'geoclicker'
    ]
})
```

## Сборка

Выполним сборку проекта:

    $ enb make

Откроем файл [desktop.bundles/index/index.html](http://localhost:8080/desktop.bundles/index/index.html) в браузере и посмотрим на результат работы нашего приложения:
![Результат сборки](https://img-fotki.yandex.ru/get/9557/221798411.0/0_b9e17_ec9d4b59_XXL.png)

Приложение готово к работе. Теперь при клике в каждое здание мы получим краткую информацию о нем.

С применением БЭМ-методологии у нас появился дополнительный бонус – для внесения дополнительных данных в карточку геообъекта вам понадобится изменить всего один блок.

Код приложения доступен по адресу:
[https://github.com/AndreyGeonya/firmCardStory](https://github.com/AndreyGeonya/firmCardStory)
