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
