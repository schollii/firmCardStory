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
