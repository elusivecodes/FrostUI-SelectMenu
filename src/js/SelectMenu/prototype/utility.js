Object.assign(SelectMenu.prototype, {

    data() {
        if (this._multiple) {
            return this._value.map(value => {
                const { option, ...data } = this._findValue(value);

                return data;
            });
        }

        const { option, ...data } = this._findValue(this._value);

        return data;
    },

    getValue() {
        return this._value;
    },

    setValue(value) {
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
    }

});
