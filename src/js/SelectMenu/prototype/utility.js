Object.assign(SelectMenu.prototype, {

    data() {
        if (this._multiple) {
            return this._value.map(value => this._findValue(value));
        }

        return this._findValue(this._value);
    },

    getValue() {
        return this._value;
    },

    setValue(value) {
        if (!this._multiple) {
            if (this._findValue(value)) {
                return this._setValue(value);
            }

            return this._getData(_ => {
                if (this._findValue(value)) {
                    return this._setValue(value);
                }
            }, { value });
        }

        if (!value) {
            return this._setValue([]);
        }

        if (value.every(val => this._findValue(val))) {
            return this._setValue(value);
        }

        this._getData(_ => {
            if (value.every(val => this._findValue(val))) {
                return this._setValue(value);
            }
        }, { value });
    }

});
