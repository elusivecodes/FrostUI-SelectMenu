/**
 * SelectMenu Helpers
 */

Object.assign(SelectMenu.prototype, {

    /**
     * Retrieve cloned data for a value.
     * @param {string|number} value The value to retrieve data for.
     * @returns {object} The cloned data.
     */
    _cloneValue(value) {
        const data = this._findValue(value);

        if (!data) {
            return data;
        }

        const clone = Core.extend({}, data);

        delete clone.element;

        return clone;
    },

    /**
     * Retrieve data for a value.
     * @param {string|number} value The value to retrieve data for.
     * @returns {object} The data.
     */
    _findValue(value) {
        if (value in this._lookup) {
            return this._lookup[value];
        }

        return null;
    },

    /**
     * Set a new value, loading the data if it has not already been loaded.
     * @param {string|number} value The value to load.
     */
    _loadValue(value) {
        if (
            !value ||
            !this._getResults ||
            (!this._multiple && this._findValue(value)) ||
            (this._multiple && value.every(val => this._findValue(val)))
        ) {
            this._setValue(value);
        } else {
            this._getResults({ value }).then(_ => this._setValue(value));
        }
    },

    /**
     * Refresh the selected value(s).
     */
    _refresh() {
        if (this._multiple) {
            this._refreshMulti();
        } else {
            this._refreshSingle();
        }
    },

    /**
     * Refresh the toggle disabled class.
     */
    _refreshDisabled() {
        const element = this._multiple ?
            this._searchInput :
            this._toggle;

        if (dom.is(this._node, ':disabled')) {
            dom.addClass(this._toggle, this.constructor.classes.disabled);
            dom.setAttribute(element, 'tabindex', '-1');
        } else {
            dom.removeClass(this._toggle, this.constructor.classes.disabled);
            dom.removeAttribute(element, 'tabindex');
        }

        if (dom.hasAttribute(this._node, 'readonly')) {
            dom.addClass(this._toggle, this.constructor.classes.readonly);
        }
    },

    /**
     * Refresh the selected value(s) for a multiple SelectMenu.
     */
    _refreshMulti() {
        if (!this._value) {
            this._value = [];
        }

        // check max selections
        if (this._maxSelections && this._value.length > this._maxSelections) {
            this._value = this._value.slice(0, this._maxSelections);
        }

        // check values have been loaded and are not disabled
        this._value = this._value.filter(value => {
            const item = this._findValue(value);
            return item && !item.disabled;
        });

        // prevent events from being removed
        dom.detach(this._searchInput);

        dom.empty(this._node);
        dom.empty(this._toggle);

        this._refreshDisabled();
        this._refreshPlaceholder();

        // add values
        if (this._value.length) {
            for (const value of this._value) {
                const item = this._findValue(value);

                dom.append(this._node, item.element);

                const group = this._renderMultiSelection(item);
                dom.append(this._toggle, group);
            }
        }

        dom.append(this._toggle, this._searchInput);
    },

    /**
     * Refresh the placeholder.
     */
    _refreshPlaceholder() {
        if (
            (this._multiple && this._value.length) ||
            (!this._multiple && this._value)
        ) {
            dom.hide(this._placeholder);
        } else {
            dom.show(this._placeholder);
            dom.prepend(this._toggle, this._placeholder);
        }
    },

    /**
     * Refresh the selected value for a single SelectMenu.
     */
    _refreshSingle() {
        // check value has been loaded and is not disabled
        const item = this._findValue(this._value);

        if (!item || item.disabled) {
            this._value = null;
        }

        dom.empty(this._node);
        dom.empty(this._toggle);

        this._refreshDisabled();
        this._refreshPlaceholder();

        if (!this._value) {
            return;
        }

        // add value

        dom.append(this._node, item.element);

        const content = this._settings.renderSelection(item);
        dom.setHTML(this._toggle, this._settings.sanitize(content));

        if (this._settings.allowClear) {
            dom.append(this._toggle, this._clear);
        }
    },

    /**
     * Select a value (from DOM event).
     * @param {string|number} value The value to select.
     */
    _selectValue(value) {
        // check item has been loaded
        const item = this._findValue(value);

        if (!item) {
            return;
        }

        // get actual value from item
        value = item.value;

        // toggle selected values for multiple select
        if (this._multiple) {
            const index = this._value.indexOf(value);
            if (index >= 0) {
                this._value.splice(index, 1)
                value = this._value;
            } else {
                value = this._value.concat([value]);
            }
        }

        this._setValue(value, true);

        if (this._settings.closeOnSelect) {
            this.hide();
        } else {
            this._getData({});
        }

        this._refreshPlaceholder();
        dom.setValue(this._searchInput, '');

        if (this._multiple) {
            dom.focus(this._searchInput);
        } else {
            dom.focus(this._toggle);
        }
    },

    /**
     * Select the selected value(s).
     * @param {string|number} value The value to select.
     * @param {Boolean} [triggerEvent] Whether to trigger the change event.
     */
    _setValue(value, triggerEvent = false) {
        this._value = value;
        this._refresh();

        if (triggerEvent) {
            dom.triggerEvent(this._node, 'change');
        }
    },

    /**
     * Update the search input width.
     */
    _updateSearchWidth() {
        const span = dom.create('span', {
            text: dom.getValue(this._searchInput),
            style: {
                display: 'inline-block',
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
