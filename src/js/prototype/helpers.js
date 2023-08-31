import $ from '@fr0st/query';

/**
 * Clone data for an item.
 * @param {object} item The item to clone.
 * @return {object} The cloned data.
 */
export function _cloneItem(item) {
    if (!item) {
        return item;
    }

    const { element: _, ...data } = item;

    return $._extend({}, data);
};

/**
 * Retrieve data for a value.
 * @param {string|number} value The value to retrieve data for.
 * @return {object} The data.
 */
export function _findValue(value) {
    if (value in this._lookup) {
        return this._lookup[value];
    }

    return null;
};

/**
 * Set a new value, loading the data if it has not already been loaded.
 * @param {string|number|array} value The value to load.
 */
export function _loadValue(value) {
    if (!value || !this._getResults) {
        this._setValue(value);
        return;
    }

    if (!this._multiple) {
        if (this._findValue(value)) {
            this._setValue(value);
            return;
        }

        this._getResults({ value })
            .then((_) => this._setValue(value));

        return;
    }

    const loadValues = value.filter((val) => !this._findValue(val));

    if (!loadValues.length) {
        this._setValue(value);
        return;
    }

    this._getResults({ value: loadValues })
        .then((_) => this._setValue(value));
};

/**
 * Refresh the selected value(s).
 */
export function _refresh() {
    if (this._multiple) {
        this._refreshMulti();
    } else {
        this._refreshSingle();
    }
};

/**
 * Refresh the toggle disabled class.
 */
export function _refreshDisabled() {
    const element = this._multiple ?
        this._searchInput :
        this._toggle;
    const disabled = $.is(this._node, ':disabled');

    if (disabled) {
        $.addClass(this._toggle, this.constructor.classes.disabled);
        $.setAttribute(element, { tabindex: -1 });
    } else {
        $.removeClass(this._toggle, this.constructor.classes.disabled);
        $.removeAttribute(element, 'tabindex');
    }

    $.setAttribute(this._toggle, { 'aria-disabled': disabled });
};

/**
 * Refresh the selected value(s) for a multiple SelectMenu.
 */
export function _refreshMulti() {
    if (!this._value) {
        this._value = [];
    }

    // check values have been loaded and are not disabled
    this._value = this._value.filter((value) => {
        const item = this._findValue(value);
        return item && !item.disabled;
    });

    this._value = $._unique(this._value);

    // check max selections
    if (this._maxSelections && this._value.length > this._maxSelections) {
        this._value = this._value.slice(0, this._maxSelections);
    }

    // prevent events from being removed
    $.detach(this._searchInput);

    $.empty(this._node);
    $.empty(this._toggle);

    this._refreshDisabled();
    this._refreshPlaceholder();

    // add values
    for (const value of this._value) {
        const item = this._findValue(value);
        $.append(this._node, item.element);

        const group = this._renderMultiSelection(item);
        $.append(this._toggle, group);
    }

    $.append(this._toggle, this._searchInput);
};

/**
 * Refresh the placeholder.
 */
export function _refreshPlaceholder() {
    const hasValue = this._multiple ?
        this._value.length > 0 :
        !!this._value;

    if (hasValue) {
        $.hide(this._placeholder);
    } else {
        $.show(this._placeholder);
        $.prepend(this._toggle, this._placeholder);
    }
};

/**
 * Refresh the selected value for a single SelectMenu.
 */
export function _refreshSingle() {
    // check value has been loaded and is not disabled
    const item = this._findValue(this._value);

    if (!item || item.disabled) {
        this._value = null;
    }

    $.empty(this._node);
    $.empty(this._toggle);

    this._refreshDisabled();
    this._refreshPlaceholder();

    if (!this._value) {
        return;
    }

    // add value

    $.append(this._node, item.element);

    const data = this._cloneItem(item);

    const element = $.create('div', {
        class: this.constructor.classes.selectionSingle,
    });

    $.append(this._toggle, element);

    if (this._options.allowClear) {
        $.append(this._toggle, this._clear);
    }

    const content = this._options.renderSelection.bind(this)(data, element);

    if ($._isString(content)) {
        $.setHTML(element, this._options.sanitize(content));
    } else if ($._isElement(content) && !$.isSame(tag, content)) {
        $.append(element, content);
    }
};

/**
 * Select a value (from DOM event).
 * @param {string|number} value The value to select.
 */
export function _selectValue(value) {
    // check item has been loaded
    const item = this._findValue(value);

    if (!item) {
        return;
    }

    const data = this._cloneItem(item);

    value = this._options.getValue(data);

    // toggle selected values for multiple select
    if (this._multiple) {
        const index = this._value.findIndex((otherValue) => otherValue == value);
        if (index >= 0) {
            value = this._value.slice();
            value.splice(index, 1);
        } else {
            value = this._value.concat([value]);
        }
    }

    this._setValue(value, { triggerEvent: true });

    this._refreshPlaceholder();
    $.setValue(this._searchInput, '');

    if (this._options.closeOnSelect) {
        this.hide();
    } else {
        this._getData({});
    }

    if (this._multiple) {
        $.focus(this._searchInput);
    } else {
        $.focus(this._toggle);
    }
};

/**
 * Select the selected value(s).
 * @param {string|number|array} value The value to select.
 * @param {object} [options] Options for setting the value(s).
 * @param {Boolean} [options.triggerEvent] Whether to trigger the change event.
 */
export function _setValue(value, { triggerEvent = false } = {}) {
    let valueChanged;
    if (this._multiple) {
        valueChanged =
            !this._value ||
            value.length !== this._value.length ||
            value.some((val, index) => val !== this._value[index]);
    } else {
        valueChanged = value !== this._value;
    }

    if (!valueChanged) {
        return;
    }

    this._value = value;
    this._refresh();

    if (triggerEvent) {
        $.triggerEvent(this._node, 'change.ui.selectmenu');
    }
};

/**
 * Update the search input width.
 */
export function _updateSearchWidth() {
    const span = $.create('span', {
        text: $.getValue(this._searchInput),
        style: {
            display: 'inline-block',
            fontSize: $.css(this._searchInput, 'fontSize'),
            whiteSpace: 'pre-wrap',
        },
    });
    $.append(document.body, span);

    const width = $.width(span);
    $.setStyle(this._searchInput, { width: width + 2 });
    $.remove(span);
};
