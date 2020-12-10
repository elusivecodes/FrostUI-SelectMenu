/**
 * SelectMenu Utility
 */

Object.assign(SelectMenu.prototype, {

    /**
     * Get data for the selected value(s).
     * @returns {array|object} The selected item(s).
     */
    data() {
        if (this._multiple) {
            return this._value.map(value => this._cloneValue(value));
        }

        return this._cloneValue(this._value);
    },

    /**
     * Disable the SelectMenu.
     * @returns {SelectMenu} The SelectMenu.
     */
    disable() {
        dom.setAttribute(this._node, 'disabled', true);
        this._disabled = true;
        this._refreshDisabled();

        return this;
    },

    /**
     * Enable the SelectMenu.
     * @returns {SelectMenu} The SelectMenu.
     */
    enable() {
        dom.removeAttribute(this._node, 'disabled');
        this._disabled = false;
        this._refreshDisabled();

        return this;
    },

    /**
     * Get the maximum selections.
     * @returns {number} The maximum selections.
     */
    getMaxSelections() {
        return this._maxSelections;
    },

    /**
     * Get the placeholder text.
     * @returns {string} The placeholder text.
     */
    getPlaceholder() {
        return this._placeholderText;
    },

    /**
     * Get the selected value(s).
     * @returns {string|number|array} The selected value(s).
     */
    getValue() {
        return this._value;
    },

    /**
     * Set the maximum selections.
     * @param {number} maxSelections The maximum selections.
     * @returns {SelectMenu} The SelectMenu.
     */
    setMaxSelections(maxSelections) {
        this._maxSelections = maxSelections;

        this.hide();
        this._refresh();

        return this;
    },

    /**
     * Set the placeholder text.
     * @param {string} placeholder The placeholder text.
     * @returns {SelectMenu} The SelectMenu.
     */
    setPlaceholder(placeholder) {
        this._placeholderText = placeholder;

        dom.remove(this._placeholder);
        this._renderPlaceholder();
        this._refresh();

        return this;
    },

    /**
     * Set the selected value(s).
     * @param {string|number|array} value The selected value(s).
     * @returns {SelectMenu} The SelectMenu.
     */
    setValue(value) {
        if (!this._disabled) {
            this._loadValue(value);
        }

        return this;
    }

});
