Object.assign(SelectMenu.prototype, {

    _findValue(value) {
        if (value in this._lookupData) {
            return this._lookupData[value];
        }

        return null;
    },

    _refresh() {
        dom.empty(this._node);
        dom.detach(this._placeholder);

        if (this._settings.allowClear) {
            dom.detach(this._clear);
        }

        if (this._disabled) {
            dom.addClass(this._toggle, 'disabled');
        } else {
            dom.removeClass(this._toggle, 'disabled');
        }

        const item = this._findValue(this._value);

        if (!item) {
            dom.empty(this._toggle);
            dom.show(this._placeholder);
            dom.append(this._toggle, this._placeholder);
            return;
        }

        dom.append(this._node, item.element);

        const content = this._settings.renderSelection(item);
        dom.setHTML(this._toggle, this._settings.sanitize(content));

        if (this._settings.allowClear) {
            dom.append(this._toggle, this._clear);
        }
    },

    _refreshMulti() {
        if (!this._value) {
            this._value = [];
        }

        if (this._settings.maxSelections && this._value.length > this._settings.maxSelections) {
            this._value = this._value.slice(0, this._settings.maxSelections);
        }

        dom.detach(this._searchInput);
        dom.detach(this._placeholder);

        dom.empty(this._node);
        dom.empty(this._toggle);

        if (this._disabled) {
            dom.addClass(this._toggle, 'disabled');
        } else {
            dom.removeClass(this._toggle, 'disabled');
        }

        if (!this._value.length) {
            this._refreshPlaceholder();
        } else {
            for (const value of this._value) {
                const item = this._findValue(value);

                if (!item) {
                    continue;
                }

                dom.append(this._node, item.element);

                const group = this._renderMultiSelection(item);
                dom.append(this._toggle, group);
            }
        }

        dom.append(this._toggle, this._searchInput);
    },

    _refreshPlaceholder() {
        if (!this._multiple) {
            return;
        }

        if (!this._value.length) {
            dom.show(this._placeholder);
            dom.prepend(this._toggle, this._placeholder);
        } else {
            dom.hide(this._placeholder);
        }
    },

    _setValue(value) {
        this._value = value;

        if (this._multiple) {
            this._refreshMulti();
        } else {
            this._refresh();
        }
    },

    _updateSearchWidth() {
        const span = dom.create('span', {
            text: dom.getValue(this._searchInput),
            class: 'd-inline-block',
            style: {
                fontSize: dom.css(this._searchInput, 'fontSize'),
                whiteSpace: 'pre-wrap'
            }
        });
        dom.append(document.body, span);

        const width = dom.width(span);
        dom.setStyle(this._searchInput, 'width', width + 2);
        dom.remove(span);
    }

});
