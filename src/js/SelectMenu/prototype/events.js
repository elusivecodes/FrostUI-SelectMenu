Object.assign(SelectMenu.prototype, {

    _updateSearchWidth() {
        const span = dom.create('span', {
            text: dom.getValue(this._searchInput),
            class: 'd-inline-block',
            style: {
                fontSize: dom.css(this._searchInput, 'fontSize')
            }
        });
        dom.append(document.body, span);

        const width = dom.width(span);
        dom.setStyle(this._searchInput, 'width', width + 2);
        dom.remove(span);
    },

    _events() {
        dom.addEvent(this._searchInput, 'input', _ => {
            this._updateSearchWidth();

            dom.empty(this._itemsList);
            this._getData(response => {
                this._renderResults(response.results);
            }, {
                term: dom.getValue(this._searchInput)
            });
        });

        dom.addEvent(this._toggle, 'keydown', e => {
            if (!dom.isConnected(this._searchInput)) {
                dom.setValue(this._searchInput, '');
                dom.append(this._toggle, this._searchInput);
                this._updateSearchWidth();
            }
            dom.focus(this._searchInput);
        });

        dom.addEventDelegate(this._itemsList, 'click', '[data-action]', e => {
            e.preventDefault();

            let value = dom.getDataset(e.currentTarget, 'value');

            if (this._multiple) {
                value = this._value.concat([value]);
            }

            this.setValue(value);

            if (this._settings.closeOnSelect) {
                this.hide();
            }
        });

        dom.addEvent(this._toggle, 'focus', _ => {
            dom.focus(this._searchInput);
        });

        dom.addEventDelegate(this._toggle, 'click', '[data-action]', e => {
            e.preventDefault();

            const element = dom.parent(e.currentTarget);
            const index = dom.index(element);
            this._value.splice(index, 1)
            this.setValue(this._value);
        });
    }

});
