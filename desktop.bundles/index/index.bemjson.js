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
