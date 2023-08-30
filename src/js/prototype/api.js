import $ from '@fr0st/query';

/**
 * Get data for the selected value(s).
 * @return {array|object} The selected item(s).
 */
export function data() {
    if (!this._multiple) {
        return this._cloneItem(this._findValue(this._value));
    }

    return this._value.map((value) => this._cloneItem(this._findValue(value)));
};

/**
 * Get the maximum selections.
 * @return {number} The maximum selections.
 */
export function getMaxSelections() {
    return this._maxSelections;
};

/**
 * Get the placeholder text.
 * @return {string} The placeholder text.
 */
export function getPlaceholder() {
    return this._placeholderText;
};

/**
 * Get the selected value(s).
 * @return {string|number|array} The selected value(s).
 */
export function getValue() {
    return this._value;
};

/**
 * Set the maximum selections.
 * @param {number} maxSelections The maximum selections.
 */
export function setMaxSelections(maxSelections) {
    this._maxSelections = maxSelections;

    this.hide();
    this._refresh();
};

/**
 * Set the placeholder text.
 * @param {string} placeholder The placeholder text.
 */
export function setPlaceholder(placeholder) {
    this._placeholderText = placeholder;

    $.remove(this._placeholder);
    this._renderPlaceholder();
    this._refresh();
};

/**
 * Set the selected value(s).
 * @param {string|number|array} value The value to set.
 */
export function setValue(value) {
    this._loadValue(value);
};
