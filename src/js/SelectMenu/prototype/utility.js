Object.assign(SelectMenu.prototype, {

    data() {
        if (this._multiple) {
            return this._value.map(value => {
                const data = Core.extend({}, this._findValue(value));

                delete data.option;

                return data;
            });
        }

        const data = Core.extend({}, this._findValue(this._value));

        delete data.option;

        return data;
    },

    disable() {
        dom.setAttribute(this._node, 'disabled', true);
        this._disabled = true;

        if (this._multiple) {
            this._refreshMulti();
        } else {
            this._refresh();
        }
    },

    enable() {
        dom.removeAttribute(this._node, 'disabled');
        this._disabled = false;

        if (this._multiple) {
            this._refreshMulti();
        } else {
            this._refresh();
        }
    },

    getValue() {
        return this._value;
    },

    setValue(value) {
        if (this._disabled) {
            return;
        }

        if (!value) {
            return this._setValue(value);
        }

        if (
            !value ||
            !this._getResults ||
            (!this._multiple && this._findValue(value)) ||
            (this._multiple && value.every(val => this._findValue(val)))
        ) {
            return this._setValue(value);
        }

        this._getResults({ value }).then(_ => {
            this._setValue(value)
        });
    },

    update() {
        this._popper.update();
    }

});
