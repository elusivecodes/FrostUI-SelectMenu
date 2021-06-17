/**
 * FrostUI-SelectMenu v1.0.1
 * https://github.com/elusivecodes/FrostUI-SelectMenu
 */
(function(global, factory) {
    'use strict';

    if (typeof module === 'object' && typeof module.exports === 'object') {
        module.exports = factory;
    } else {
        factory(global);
    }

})(window, function(window) {
    'use strict';

    if (!window) {
        throw new Error('FrostUI-SelectMenu requires a Window.');
    }

    if (!('UI' in window)) {
        throw new Error('FrostUI-SelectMenu requires FrostUI.');
    }

    const Core = window.Core;
    const dom = window.dom;
    const QuerySet = window.QuerySet;
    const UI = window.UI;
    const document = window.document;

    /**
     * SelectMenu Class
     * @class
     */
    class SelectMenu extends UI.BaseComponent {

        /**
         * New SelectMenu constructor.
         * @param {HTMLElement} node The input node.
         * @param {object} [settings] The options to create the SelectMenu with.
         * @returns {SelectMenu} A new SelectMenu object.
         */
        constructor(node, settings) {
            super(node, settings);

            if (!dom.is(this._node, 'select')) {
                throw new Error('SelectMenu must be created on a select element');
            }

            this._placeholderText = this._settings.placeholder;
            this._maxSelections = this._settings.maxSelections;
            this._multiple = dom.getProperty(this._node, 'multiple');

            this._data = [];
            this._lookup = {};

            this._getData = null;
            this._getResults = null;

            let data;
            if (Core.isFunction(this._settings.getResults)) {
                this._getResultsCallbackInit();
                this._getResultsInit();
            } else if (Core.isPlainObject(this._settings.data)) {
                data = this.constructor._getDataFromObject(this._settings.data);
            } else if (Core.isArray(this._settings.data)) {
                data = this._settings.data;
            } else {
                data = this.constructor._getDataFromDOM(this._node);
            }

            if (data) {
                this._data = this.constructor._parseData(data);
                this._lookup = this.constructor._parseDataLookup(data);
                this._getDataInit();
            }

            const value = dom.getValue(this._node);
            this._render();
            this._loadValue(value);
            this._events();
        }

        /**
         * Disable the SelectMenu.
         * @returns {SelectMenu} The SelectMenu.
         */
        disable() {
            dom.setAttribute(this._node, 'disabled', true);
            this._refreshDisabled();

            return this;
        }

        /**
         * Dispose the SelectMenu.
         */
        dispose() {
            if (this._popper) {
                this._popper.dispose();
                this._popper = null;
            }

            dom.removeAttribute(this._node, 'tabindex');
            dom.removeEvent(this._node, 'focus.ui.selectmenu');
            dom.removeClass(this._node, this.constructor.classes.hide);
            dom.remove(this._menuNode);
            dom.remove(this._toggle);

            this._toggle = null;
            this._clear = null;
            this._searchInput = null;
            this._placeholder = null;
            this._menuNode = null;
            this._itemsList = null;
            this._data = null;
            this._lookup = null;
            this._value = null;
            this._request = null;

            super.dispose();
        }

        /**
         * Enable the SelectMenu.
         * @returns {SelectMenu} The SelectMenu.
         */
        enable() {
            dom.removeAttribute(this._node, 'disabled');
            this._refreshDisabled();

            return this;
        }

        /**
         * Hide the SelectMenu.
         * @returns {SelectMenu} The SelectMenu.
         */
        hide() {
            if (
                this._animating ||
                !dom.isConnected(this._menuNode) ||
                !dom.triggerOne(this._node, 'hide.ui.selectmenu')
            ) {
                return this;
            }

            this._animating = true;
            this._refreshPlaceholder();
            dom.setValue(this._searchInput, '');

            dom.fadeOut(this._menuNode, {
                duration: this._settings.duration
            }).then(_ => {
                dom.empty(this._itemsList);
                dom.detach(this._menuNode);
                dom.setAttribute(this._toggle, 'aria-expanded', false);
                dom.triggerEvent(this._node, 'hidden.ui.selectmenu');
            }).catch(_ => { }).finally(_ => {
                this._animating = false;
            });

            return this;
        }

        /**
         * Show the SelectMenu.
         * @returns {SelectMenu} The SelectMenu.
         */
        show() {
            if (
                dom.is(this._node, ':disabled') ||
                dom.hasAttribute(this._node, 'readonly') ||
                this._animating ||
                dom.isConnected(this._menuNode) ||
                !dom.triggerOne(this._node, 'show.ui.selectmenu')
            ) {
                return this;
            }

            this._getData({});

            if (this._multiple && !dom.hasChildren(this._itemsList)) {
                return this;
            }

            this._animating = true;

            if (this._settings.appendTo) {
                dom.append(document.body, this._menuNode);
            } else {
                dom.after(this._node, this._menuNode);
            }

            this.update();

            dom.fadeIn(this._menuNode, {
                duration: this._settings.duration
            }).then(_ => {
                dom.setAttribute(this._toggle, 'aria-expanded', true);
                dom.triggerEvent(this._node, 'shown.ui.selectmenu');
            }).catch(_ => { }).finally(_ => {
                this._animating = false;
            });

            return this;
        }

        /**
         * Toggle the SelectMenu.
         * @returns {SelectMenu} The SelectMenu.
         */
        toggle() {
            return dom.isConnected(this._menuNode) ?
                this.hide() :
                this.show();
        }

        /**
         * Update the SelectMenu position.
         * @returns {SelectMenu} The SelectMenu.
         */
        update() {
            this._popper.update();

            return this;
        }

    }


    /**
     * SelectMenu Events
     */

    Object.assign(SelectMenu.prototype, {

        /**
         * Attach events for the SelectMenu.
         */
        _events() {
            dom.addEvent(this._node, 'focus.ui.selectmenu', _ => {
                if (this._multiple) {
                    dom.focus(this._searchInput);
                } else {
                    dom.focus(this._toggle);
                }
            });

            dom.addEvent(this._menuNode, 'mousedown.ui.selectmenu', e => {
                if (dom.isSame(this._searchInput, e.target)) {
                    return;
                }

                // prevent search input from triggering blur event
                e.preventDefault();
            });

            dom.addEventDelegate(this._menuNode, 'contextmenu.ui.selectmenu', '[data-ui-action="select"]', e => {
                // prevent menu node from showing right click menu
                e.preventDefault();
            });

            dom.addEventDelegate(this._itemsList, 'mouseup.ui.selectmenu', '[data-ui-action="select"]', e => {
                e.preventDefault();

                const value = dom.getDataset(e.currentTarget, 'uiValue');
                this._selectValue(value);
            });

            dom.addEventDelegate(this._itemsList, 'mouseover.ui.selectmenu', '[data-ui-action="select"]', DOM.debounce(e => {
                const focusedNode = dom.find('[data-ui-focus]', this._itemsList);
                dom.removeClass(focusedNode, this.constructor.classes.focus);
                dom.removeDataset(focusedNode, 'uiFocus');
                dom.addClass(e.currentTarget, this.constructor.classes.focus);
                dom.setDataset(e.currentTarget, 'uiFocus', true);
            }));

            dom.addEvent(this._searchInput, 'keydown.ui.selectmenu', e => {
                if (!['ArrowDown', 'ArrowUp', 'Backspace', 'Enter', 'Escape'].includes(e.code)) {
                    return;
                }

                if (e.code === 'Backspace') {
                    if (this._multiple && this._value.length && !dom.getValue(this._searchInput)) {
                        e.preventDefault();

                        // remove the last selected item and populate the search input with it's value
                        const lastValue = this._value.pop();
                        const lastItem = this._findValue(lastValue);

                        this._refreshMulti();
                        dom.setValue(this._searchInput, lastItem.text);
                        dom.focus(this._searchInput);
                        this._updateSearchWidth();

                        // trigger input
                        dom.triggerEvent(this._searchInput, 'input.ui.selectmenu');
                    }

                    return;
                }

                if (this._multiple && !dom.isConnected(this._menuNode) && ['ArrowDown', 'ArrowUp', 'Enter'].includes(e.code)) {
                    return this.show();
                }

                if (e.code === 'Escape') {
                    // close the menu
                    dom.blur(this._searchInput);

                    if (this._multiple) {
                        dom.focus(this._searchInput);
                    } else {
                        dom.focus(this._toggle);
                    }

                    return;
                }

                const focusedNode = dom.findOne('[data-ui-focus]', this._itemsList);

                if (e.code === 'Enter') {
                    // select the focused item
                    if (focusedNode) {
                        const value = dom.getDataset(focusedNode, 'uiValue');
                        this._selectValue(value);
                    }

                    return;
                }

                // focus the previous/next item

                let focusNode;
                if (!focusedNode) {
                    focusNode = dom.findOne('[data-ui-action="select"]', this._itemsList);
                } else {
                    switch (e.code) {
                        case 'ArrowDown':
                            focusNode = dom.nextAll(focusedNode, '[data-ui-action="select"]').shift();
                            break;
                        case 'ArrowUp':
                            focusNode = dom.prevAll(focusedNode, '[data-ui-action="select"]').pop();
                            break;
                    }
                }

                if (focusNode) {
                    dom.removeClass(focusedNode, this.constructor.classes.focus);
                    dom.removeDataset(focusedNode, 'uiFocus');
                    dom.addClass(focusNode, this.constructor.classes.focus);
                    dom.setDataset(focusNode, 'uiFocus', true);
                }
            });

            // debounced input event
            const getDataDebounced = Core.debounce(term => {
                dom.empty(this._itemsList);
                this._getData({ term });
            }, this._settings.debounceInput);

            dom.addEvent(this._searchInput, 'input.ui.selectmenu', DOM.debounce(_ => {
                if (this._multiple) {
                    this._updateSearchWidth();
                }

                const term = dom.getValue(this._searchInput);

                // check for minimum search length
                if (term.length < this._settings.minSearch) {
                    return;
                }

                if (this._multiple) {
                    this.show();
                }

                getDataDebounced(term);
            }));

            if (this._settings.getResults) {
                // infinite scrolling event
                dom.addEvent(this._itemsList, 'scroll.ui.selectmenu', Core.throttle(_ => {
                    if (this._request || !this._showMore) {
                        return;
                    }

                    const height = dom.height(this._itemsList);
                    const scrollHeight = dom.height(this._itemsList, DOM.SCROLL_BOX);
                    const scrollTop = dom.getScrollY(this._itemsList);

                    if (scrollTop >= scrollHeight - height - (height / 4)) {
                        const term = dom.getValue(this._searchInput);
                        const offset = this._data.length;

                        this._getData({ term, offset });
                    }
                }, 250, false));
            }

            if (this._multiple) {
                this._eventsMulti()
            } else {
                this._eventsSingle();
            }
        },

        /**
         * Attach events for a multiple SelectMenu.
         */
        _eventsMulti() {
            dom.addEvent(this._searchInput, 'focus.ui.selectmenu', _ => {
                dom.hide(this._placeholder);
                dom.detach(this._placeholder);
                dom.addClass(this._toggle, 'focus');
            });

            let keepFocus = false;
            dom.addEvent(this._searchInput, 'blur.ui.selectmenu', _ => {
                if (keepFocus) {
                    // prevent losing focus when toggle element is focused
                    return;
                }

                dom.removeClass(this._toggle, 'focus');
                if (dom.isConnected(this._menuNode)) {
                    this.hide();
                } else {
                    this._refreshPlaceholder();
                }
            });

            dom.addEvent(this._toggle, 'mousedown.ui.selectmenu', e => {
                if (dom.hasClass(this._toggle, 'focus')) {
                    // maintain focus when toggle element is already focused
                    keepFocus = true;
                } else {
                    dom.hide(this._placeholder);
                    dom.addClass(this._toggle, 'focus');
                }

                if (!e.button) {
                    this.show();
                }

                dom.focus(this._searchInput);
                dom.addEventOnce(window, 'mouseup.ui.selectmenu', _ => {
                    keepFocus = false;
                    dom.focus(this._searchInput);
                });
            });

            dom.addEventDelegate(this._toggle, 'mouseup.ui.selectmenu', '[data-ui-action="clear"]', e => {
                if (e.button) {
                    return;
                }

                // remove selection
                const element = dom.parent(e.currentTarget);
                const index = dom.index(element);
                this._value.splice(index, 1)
                this._setValue(this._value, true);
                dom.focus(this._searchInput);
            });
        },

        /**
         * Attach events for a single SelectMenu.
         */
        _eventsSingle() {
            dom.addEvent(this._searchInput, 'blur.ui.selectmenu', _ => {
                this.hide();
            });

            dom.addEvent(this._toggle, 'mousedown.ui.selectmenu', e => {
                if (e.button) {
                    return;
                }

                if (dom.isConnected(this._menuNode)) {
                    this.hide();
                } else {
                    this.show();

                    dom.addEventOnce(window, 'mouseup.ui.selectmenu', _ => {
                        // focus search input when mouse is released
                        dom.focus(this._searchInput);
                    });
                }
            });

            dom.addEvent(this._toggle, 'keydown.ui.selectmenu', e => {
                if (!/^.$/u.test(e.key)) {
                    return;
                }

                this.show();
                dom.focus(this._searchInput);
            });

            if (this._settings.allowClear) {
                dom.addEventDelegate(this._toggle, 'mouseup.ui.selectmenu', '[data-ui-action="clear"]', e => {
                    if (e.button) {
                        return;
                    }

                    // remove selection
                    this._setValue(null, true);
                });
            }
        }

    });


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


    /**
     * SelectMenu Init
     */

    Object.assign(SelectMenu.prototype, {

        /**
         * Initialize preloaded get data.
         */
        _getDataInit() {
            this._getData = ({ term = null }) => {
                // check for minimum search length
                if (this._settings.minSearch && (!term || term.length < this._settings.minSearch)) {
                    return this.update();
                }

                // check for max selections
                if (this._multiple && this._maxSelections && this._value.length >= this._maxSelections) {
                    return this._renderInfo(this._settings.lang.maxSelections);
                }

                let results = this._data;

                if (term) {
                    // filter results
                    results = this._settings.sortResults(
                        results.reduce(
                            (acc, result) => {
                                if (result.children) {
                                    acc.push(...result.children)
                                } else {
                                    acc.push(result);
                                }
                                return acc;
                            },
                            []
                        ),
                        term
                    ).filter(item => this._settings.isMatch(item, term));
                }

                this._renderResults(results);
                this.update();
            };
        },

        /**
         * Initialize get data from callback.
         */
        _getResultsInit() {
            this._getData = ({ offset = 0, term = null }) => {

                // cancel last request
                if (this._request && this._request.cancel) {
                    this._request.cancel();
                    this._request = null;
                }

                if (!offset) {
                    dom.empty(this._itemsList);
                }

                // check for minimum search length
                if (this._settings.minSearch && (!term || term.length < this._settings.minSearch)) {
                    return this.update();
                }

                // check for max selections
                if (this._multiple && this._maxSelections && this._value.length >= this._maxSelections) {
                    return this._renderInfo(this._settings.lang.maxSelections);
                }

                const loading = this._renderInfo(this._settings.lang.loading);
                const request = this._getResults({ offset, term });

                request.then(response => {
                    this._renderResults(response.results);
                }).catch(_ => {
                    // error
                }).finally(_ => {
                    dom.remove(loading);
                    this.update();

                    if (this._request === request) {
                        this._request = null;
                    }
                });
            };
        },

        /**
         * Initialize get data callback.
         */
        _getResultsCallbackInit() {
            this._getResults = options => {
                // reset data for starting offset
                if (!options.offset) {
                    this._data = [];
                }

                const request = this._settings.getResults(options);
                this._request = Promise.resolve(request);

                this._request.then(response => {
                    const newData = this.constructor._parseData(response.results);
                    this._data.push(...newData);
                    this._showMore = response.showMore;

                    // update lookup
                    Object.assign(
                        this._lookup,
                        this.constructor._parseDataLookup(this._data)
                    );

                    return response;
                });

                return this._request;
            };
        }

    });


    /**
     * SelectMenu Render
     */

    Object.assign(SelectMenu.prototype, {

        /**
         * Render the toggle element.
         */
        _render() {
            if (this._multiple) {
                this._renderToggleMulti();
            } else {
                if (this._settings.allowClear) {
                    this._renderClear();
                }

                this._renderToggleSingle();
            }

            this._renderPlaceholder();
            this._renderMenu();

            // hide the input node
            dom.addClass(this._node, this.constructor.classes.hide);
            dom.setAttribute(this._node, 'tabindex', '-1');

            dom.after(this._node, this._toggle);
        },

        /**
         * Render the clear button.
         */
        _renderClear() {
            this._clear = dom.create('button', {
                class: this.constructor.classes.clear,
                attributes: {
                    type: 'button'
                },
                dataset: {
                    uiAction: 'clear'
                }
            });
        },

        /**
         * Render a group item.
         * @param {object} group The group item to render.
         * @returns {HTMLElement} The group element.
         */
        _renderGroup(group) {
            return dom.create('div', {
                html: this._settings.sanitize(
                    this._settings.renderResult(group)
                ),
                class: this.constructor.classes.group
            });
        },

        /**
         * Render an information item.
         * @param {string} text The text to render.
         * @returns {HTMLElement} The information element.
         */
        _renderInfo(text) {
            const element = dom.create('button', {
                html: this._settings.sanitize(text),
                class: this.constructor.classes.info,
                attributes: {
                    type: 'button'
                }
            });
            dom.append(this._itemsList, element);
            this.update();
            return element;
        },

        /**
         * Render an item.
         * @param {object} item The item to render.
         * @returns {HTMLElement} The item element.
         */
        _renderItem(item) {
            const active =
                (
                    this._multiple &&
                    this._value.includes(item.value)
                ) || (
                    !this._multiple &&
                    item.value == this._value
                );

            const { option, ...data } = item;

            const element = dom.create('div', {
                html: this._settings.sanitize(
                    this._settings.renderResult(data, active)
                ),
                class: this.constructor.classes.item
            });

            if (active) {
                dom.addClass(element, this.constructor.classes.active);
                dom.setDataset(element, 'uiActive', true);
            }

            if (item.disabled) {
                dom.addClass(element, this.constructor.classes.disabledItem);
            } else {
                dom.addClass(element, this.constructor.classes.action)
                dom.setDataset(element, {
                    uiAction: 'select',
                    uiValue: item.value
                });
            }

            return element;
        },

        /**
         * Render the menu.
         */
        _renderMenu() {
            this._menuNode = dom.create('div', {
                class: this.constructor.classes.menu
            });

            if (!this._multiple) {
                // add search input for single select menus

                const searchOuter = dom.create('div', {
                    class: this.constructor.classes.searchOuter
                });
                dom.append(this._menuNode, searchOuter);

                const searchContainer = dom.create('div', {
                    class: this.constructor.classes.searchContainer
                });
                dom.append(searchOuter, searchContainer);

                this._searchInput = dom.create('input', {
                    class: this._settings.searchInputStyle === 'filled' ?
                        this.constructor.classes.searchInputFilled :
                        this.constructor.classes.searchInputOutline
                });
                dom.append(searchContainer, this._searchInput);

                if (this._settings.searchInputStyle === 'filled') {
                    const ripple = dom.create('div', {
                        class: this.constructor.classes.searchInputRipple
                    });
                    dom.append(searchContainer, ripple);
                }
            }

            this._itemsList = dom.create('div', {
                class: this.constructor.classes.items
            });
            dom.append(this._menuNode, this._itemsList);

            const popperOptions = {
                reference: this._toggle,
                placement: this._settings.placement,
                position: this._settings.position,
                fixed: this._settings.fixed,
                spacing: this._settings.spacing,
                minContact: this._settings.minContact
            };

            if (this._settings.fullWidth) {
                popperOptions.afterUpdate = (node, reference) => {
                    const width = dom.width(reference, DOM.BORDER_BOX);
                    dom.setStyle(node, 'width', width);
                };
                popperOptions.beforeUpdate = node => {
                    dom.setStyle(node, 'width', '');
                };
            }

            this._popper = new UI.Popper(this._menuNode, popperOptions);
        },

        /**
         * Render a multiple selection item.
         * @param {object} item The item to render.
         * @returns {HTMLElement} The selection element.
         */
        _renderMultiSelection(item) {
            const group = dom.create('div', {
                class: this.constructor.classes.multiGroup
            });

            const close = dom.create('div', {
                html: `<span class="${this.constructor.classes.multiClearIcon}"></span>`,
                class: this.constructor.classes.multiClear,
                dataset: {
                    uiAction: 'clear'
                }
            });
            dom.append(group, close);

            const content = this._settings.renderSelection(item);
            const tag = dom.create('div', {
                html: this._settings.sanitize(content),
                class: this.constructor.classes.multiItem
            });
            dom.append(group, tag);

            return group;
        },

        /**
         * Render the placeholder.
         */
        _renderPlaceholder() {
            this._placeholder = dom.create('span', {
                html: this._placeholderText ?
                    this._settings.sanitize(this._placeholderText) :
                    '&nbsp;',
                class: this.constructor.classes.placeholder
            });
        },

        /**
         * Render results.
         * @param {array} results The results to render.
         */
        _renderResults(results) {
            if (!results.length) {
                return this._renderInfo(this._settings.lang.noResults);
            }

            for (const item of results) {
                const element = item.children ?
                    this._renderGroup(item) :
                    this._renderItem(item);
                dom.append(this._itemsList, element);
            }

            let focusNode = dom.findOne('[data-ui-active]', this._itemsList);

            if (!focusNode) {
                focusNode = dom.findOne('[data-ui-action="select"]', this._itemsList);
            }

            if (focusNode) {
                dom.addClass(focusNode, this.constructor.classes.focus);
                dom.setDataset(focusNode, 'uiFocus', true);
            }
        },

        /**
         * Render the single toggle element.
         */
        _renderToggleSingle() {
            this._toggle = dom.create('button', {
                class: [
                    dom.getAttribute(this._node, 'class') || '',
                    this.constructor.classes.toggle
                ],
                attributes: {
                    type: 'button'
                }
            });
        },

        /**
         * Render the multiple toggle element.
         */
        _renderToggleMulti() {
            this._toggle = dom.create('div', {
                class: [
                    dom.getAttribute(this._node, 'class') || '',
                    this.constructor.classes.multiToggle
                ]
            });

            this._searchInput = dom.create('input', {
                class: this.constructor.classes.multiSearchInput
            });
        }

    });


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
         * @param {string|number|array} value The value to set.
         * @returns {SelectMenu} The SelectMenu.
         */
        setValue(value) {
            if (!dom.is(this._node, ':disabled')) {
                this._loadValue(value);
            }

            return this;
        }

    });


    /**
     * SelectMenu (Static) Helpers
     */

    Object.assign(SelectMenu, {

        /**
         * Build an option element for an item.
         * @param {object} item The item to use.
         * @returns {HTMLElement} The option element.
         */
        _buildOption(item) {
            return dom.create('option', {
                text: item.text,
                value: item.value,
                properties: {
                    selected: true
                }
            });
        },

        /**
         * Build a data array from a DOM element.
         * @param {HTMLElement} element The element to parse.
         * @returns {array} The parsed data.
         */
        _getDataFromDOM(element) {
            return dom.children(element).map(child => {
                const data = dom.getDataset(child);

                if (dom.is(child, 'option')) {
                    return {
                        text: dom.getText(child),
                        value: dom.getValue(child),
                        ...data
                    };
                }

                return {
                    text: dom.getAttribute(child, 'label'),
                    children: this._getDataFromDOM(child),
                    ...data
                };
            });
        },

        /**
         * Build a data array from an object.
         * @param {object} data The data to parse.
         * @returns {array} The parsed data.
         */
        _getDataFromObject(data) {
            return Object.entries(data)
                .map(([value, text]) => ({ value, text }));
        },

        /**
         * Add option elements to data.
         * @param {array} data The data to parse.
         * @returns {array} The parsed data.
         */
        _parseData(data) {
            for (const item of data) {
                if (item.children) {
                    this._parseData(item.children);
                } else {
                    item.element = this._buildOption(item);
                }
            }

            return data;
        },

        /**
         * Populate lookup with data.
         * @param {array} data The data to parse.
         * @param {object} [lookup] The lookup.
         * @returns {object} The populated lookup.
         */
        _parseDataLookup(data, lookup = {}) {
            for (const item of data) {
                if (data.children) {
                    this._parseDataLookup(data.children, lookup);
                } else {
                    lookup[item.value] = Core.extend({}, item);
                }
            }

            return lookup;
        }

    });


    // SelectMenu default options
    SelectMenu.defaults = {
        placeholder: '',
        lang: {
            loading: 'Loading..',
            maxSelections: 'Selection limit reached.',
            noResults: 'No results'
        },
        searchInputStyle: 'filled',
        data: null,
        getResults: null,
        isMatch: (item, term) => {
            const normalized = item.text.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
            const escapedTerm = Core.escapeRegExp(term);
            const regExp = new RegExp(escapedTerm, 'i');

            return regExp.test(item.text) || regExp.test(normalized);
        },
        renderResult: item => item.text,
        renderSelection: item => item.text,
        sanitize: input => dom.sanitize(input),
        sortResults: (results, term) => results.sort((a, b) => {
            const aLower = a.text.toLowerCase();
            const bLower = b.text.toLowerCase();

            if (term) {
                const diff = aLower.indexOf(term) - bLower.indexOf(term);

                if (diff) {
                    return diff;
                }
            }

            return aLower.localeCompare(bLower);
        }),
        maxSelections: 0,
        minSearch: 0,
        allowClear: false,
        closeOnSelect: true,
        debounceInput: 250,
        duration: 100,
        appendTo: null,
        fullWidth: false,
        placement: 'bottom',
        position: 'start',
        fixed: false,
        spacing: 0,
        minContact: false
    };

    // Default classes
    SelectMenu.classes = {
        action: 'selectmenu-action',
        active: 'selectmenu-active',
        clear: 'btn-close float-end mx-2 lh-base',
        disabled: 'disabled',
        disabledItem: 'selectmenu-disabled',
        focus: 'selectmenu-focus',
        group: 'selectmenu-group',
        hide: 'visually-hidden',
        info: 'selectmenu-item text-secondary',
        item: 'selectmenu-item',
        items: 'selectmenu-items',
        menu: 'selectmenu-menu shadow-sm',
        multiClear: 'btn btn-sm btn-outline-secondary',
        multiClearIcon: 'btn-close pe-none',
        multiGroup: 'btn-group',
        multiItem: 'btn btn-sm btn-secondary',
        multiSearchInput: 'selectmenu-multi-input',
        multiToggle: 'selectmenu-multi d-flex flex-wrap position-relative text-start',
        placeholder: 'selectmenu-placeholder',
        readonly: 'readonly',
        searchContainer: 'form-input',
        searchInputFilled: 'input-filled',
        searchInputOutline: 'input-outline',
        searchInputRipple: 'ripple-line',
        searchOuter: 'p-1',
        toggle: 'selectmenu-toggle position-relative text-start'
    };

    UI.initComponent('selectmenu', SelectMenu);

    UI.SelectMenu = SelectMenu;

});