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
        if (this._multiple) {
            return this.setValueMulti(value);
        }

        if (this._findValue(value)) {
            return this._setValue(value);
        }

        this._getData(_ => {
            if (this._findValue(value)) {
                return this._setValue(value);
            }
        }, { value });
    },

    setValueMulti(values) {
        if (!values) {
            return this._setValue([]);
        }

        if (values.every(value => this._findValue(value))) {
            return this._setValue(values);
        }

        this._getData(_ => {
            if (values.every(value => this._findValue(value))) {
                return this._setValue(values);
            }
        }, { values });
    },

});
