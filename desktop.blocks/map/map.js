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
