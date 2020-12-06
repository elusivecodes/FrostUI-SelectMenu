Object.assign(SelectMenu.prototype, {

    _findValue(value) {
        for (const item of this._data) {
            if (item.value == value) {
                return item;
            }

            if (!item.children) {
                continue;
            }

            for (const child of item.children) {
                if (child.value == value) {
                    return child;
                }
            }
        }

        return null;
    },

    _refresh() {
        dom.empty(this._node);

        const item = this._findValue(this._value);

        if (!item) {
            return this._renderPlaceholder();
        }

        dom.append(this._node, item.element);

        const content = this._settings.renderSelection(item);
        dom.setHTML(this._toggle, this._settings.sanitize(content));
    },

    _refreshMulti() {
        dom.empty(this._node);
        dom.empty(this._toggle);

        if (!this._value.length) {
            return this._renderPlaceholder();
        }

        for (const value of this._value) {
            const item = this._findValue(value);

            if (!item) {
                continue;
            }

            dom.append(this._node, item.element);

            const group = this._renderMultiSelection(item);
            dom.append(this._toggle, group);
        }
    },

    _setValue(value) {
        this._value = value;

        if (this._multiple) {
            this._refreshMulti();
        } else {
            this._refresh();
        }
    }

});
