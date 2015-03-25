# Creating the map plagin on BEM

Today we will take a look at the example of a simple map service based on the [BEM methodology](https://en.bem.info/).

### Intro

Tasks from the project manager always sound like this:
I want to have a map. And I want to see an emerging balloon message when I click on a building. Each balloon should contain the information about the organization inside this building.

Based on the request above the developer ctreates corresponding tasks:

* Make an HTML page;
* Use [Leaflet](https://github.com/Leaflet/Leaflet) library;
* Write a reusable plugin to display company information (company card).

Since the project involves the reusable parts of the code, we will try to implement it using the BEM methodology.

What is Reusable plugin? And why do we need it in our project?

* It catches a click event on the map;
* It sends a request to [2GIS geocoder](http://api.2gis.ru/doc/geo/search/), that will return information about the company according to the coordinates;
* It shows the balloon with the information.

Let's call our project `firmCardStory`.

### Project Initialization.

Initialize project from a [predefined repository](https://bem.info/tutorials/project-stub/) and set all required dependencies:

```sh
git clone https://github.com/bem/project-stub.git firmCardStory
cd firmCardStory
npm install
```

Complete the build process of the project using [ENB](http://enb-make.info/):

```sh
$ enb make
```

To check the results, browse to [desktop.bundles/index/index.html](http://localhost:8080/desktop.bundles/index/index.html).
You will see the page that was built:
![The build's result ](https://img-fotki.yandex.ru/get/6705/221798411.0/0_b9e18_bcebeab1_XL.jpg)

It is very convenient to use `enb server` during
the development phase of a project. The `enb server` will rebuild the necessary parts of the project every time you reload the page in the browser. To run the `enb server`, you should execute the following command from the project directory:

```sh
$ ./node_modules/enb/bin/enb server
```

Then we can browse to the address: [http://localhost:8080/desktop.bundles/index](http://localhost:8080/desktop.bundles/index).

### The template of the page

Let's create the new page structure by changing the [BENJSON](https://bem.info/technology/bemjson/current/bemjson/) declaration of the `desktop.bundles/index/index.bemjson.js` file:

```js
({
    block : 'page',
    title : 'Map of Novosibirsk',
    head : [
        { elem : 'css', url : 'http://cdn.leafletjs.com/leaflet-0.7.3/leaflet.css' },
        { elem : 'css', url : 'index.min.css' },
        { elem : 'js', url : 'http://cdn.leafletjs.com/leaflet-0.7.3/leaflet.js' },
        { elem : 'js', url : 'index.min.js' }
    ],
    content : [
        { block : 'map' }
    ]
});
```

In this file we declared the following:

* The [page](https://en.bem.info/libs/bem-core/v2/desktop/page/) block of the [bem-core](https://en.bem.info/libs/bem-core/) library is being used to build the page.
* The title of the page is "Map of Novosibirsk".
* The CSS and JS files that will be linked to the page.
* The `map` block forms the page content.

To implement the requested functionality we should create the following blocks:

* [firmcard](#firmcard)
* [geoclicker](#geoclicker)
* [map](#map)

<a name="firmcard"></a>
### The `firmcard` block

The `firmcard` block will take the input data about the company in JSON format and return well-formed HTML-code to the company card.

Create this block at the `desktop.blocks` level using the `JavaScript` technology:

```sh
$ mkdir ./desktop.blocks/firmcard
$ touch ./desktop.blocks/firmcard/firmcard.js
```

Then paste the following code in the `desktop.blocks/firmcard/firmcard.js` file:

```js
modules.define('firmcard', ['i-bem__dom', 'jquery'], function(provide, BEMDOM, $) {
    provide(BEMDOM.decl(this.name, {}, {
        /**
         * @param {Object} data Firm info
         * @return {String}
         */
        getFormattedText: function (data) {
            return [
                '<b>Information:</b><br />',
                'Address: ' + data.name,
                'Type: ' + data.attributes.purpose
            ].join('<br>');
        }
    }));
});
```

We use the [YModules](https://en.bem.info/tools/bem/modules/) module system and [i-bem.js](https://en.bem.info/tutorials/bem-js-tutorial/) framework to create the company card.

In a real-world application the "Company Card" would have more functionality. For example, it could have a more sophisticated layout, could calculate and display
working hours left until the end of the day, show expanded details based on mouse clicks, etc.

In this case, from a simple helper block, that returns only some simply-formatted text,
the idea can grow into an independent block with numerous elements and modifiers which are implemented
in different technologies (such as CSS, JS, BEMHTML). This block receives a DOM-element and some raw data in JSON format, and then expands into this DOM-element and starts to function.

<a name="geoclicker"></a>
### The `geoclicker` Block

In addition to the company card block we will need a plugin for Leaflet. The plugin will catch the click event on the map and show the company card balloon.

Let's create it:

```sh
$ mkdir ./desktop.blocks/geoclicker
$ touch ./desktop.blocks/geoclicker/geoclicker.js
```

Place the following content into the block `desktop.blocks/geoclicker/geoclicker.js` file:

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

As we can see, the block is quite simple, and consists of only 3 methods:

* `addTo` is a handler for adding the [Leaflet.js](https://github.com/Leaflet/Leaflet) map plugin, that subscribes to the click events on the map objects;
* `getGeoObject` is a method for receiving data from the 2GIS geocoder;
* `showPopup` is a method that shows the balloon with the company card.

<a name="map"></a>
### The 'map' Block

To show the map on a page, you need to initialize it. The `map` block is responsible for initializing the map with our plugin that we wrote above. Let's create this block:

```sh
$ mkdir ./desktop.blocks/map
$ touch ./desktop.blocks/map/map.js
$ touch ./desktop.blocks/map/map.css
$ touch ./desktop.blocks/map/map.bemhtml
```

Paste the following code into the `desktop.blocks/b-map/b-map.js` file:

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

Then, add some style rules to the block in the `filedesktop.blocks/map/map.css` file:

```css
.map {
    height: 600px;
}
```

Lastly, create a template in the `desktop.blocks/map/map.bemhtml` file:

```js
block('map')(
    js()(true)
)
```

### Dependencies

Currently, we have the following chain of [dependencies](https://en.bem.info/tools/bem/bem-tools/depsjs/) linking to the blocks:

![Dependencies](https://img-fotki.yandex.ru/get/4512/246231603.0/0_14ad53_4baec27f_orig)

The dependencies are described with the help of `deps.js`.

We already have a dependency file for the `page` block. Let's make similar files for the other blocks:

```sh
$ touch ./desktop.blocks/map/map.deps.js
$ touch ./desktop.blocks/geoclicker/geoclicker.deps.js
```

Paste the following content into the corresponding files:

`desktop.blocks/geoclicker/geoclicker.deps.js`:

```js
({
    mustDeps: [
        'firmcard'
    ]
})
```

`desktop.blocks/map/map.deps.js`:

```js
({
    shouldDeps: [
        'geoclicker'
    ]
})
```

### The Build

Build the project:

```sh
$ enb make
```

Open [http://localhost:8080/desktop.bundles/index/index.html](http://localhost:8080/desktop.bundles/index/index.html) in a browser, to see the result of our application work:

![The result of the build](https://img-fotki.yandex.ru/get/9557/221798411.0/0_b9e17_ec9d4b59_XXL.png)

The application is ready. Now every click on any building on the map causes the balloon with some brief information about the building (The `Company Card`).

The BEM methodology gives us an additional bonus: now to add some information to the company card, you need to change the only one block in your project.

Fork [this](https://github.com/AndreyGeonya/firmCardStory) project on GitHub.
