/**
 * FrostUI-SelectMenu v1.0
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
    class SelectMenu {

        /**
         * New SelectMenu constructor.
         * @param {HTMLElement} node The input node.
         * @param {object} [settings] The options to create the SelectMenu with.
         * @param {string} [settings.placeholder] The placeholder text.
         * @param {object} [settings.lang] Language to use.
         * @param {object|array} [settings.data] The selection data.
         * @param {function} [settings.getResults] The query callback.
         * @param {function} [settings.isMatch] The match test callback.
         * @param {function} [settings.renderResult] The render result callback
         * @param {function} [settings.renderSelection] The render selection callback.
         * @param {function} [settings.sanitize] The sanitization callback.
         * @param {function} [settings.sortResults] The sort results callback.
         * @param {number} [settings.maxSelections] The maximum number of selected options.
         * @param {number} [settings.minSearch] The minimum length to start searching.
         * @param {Boolean} [settings.allowClear] Whether to allow clearing the selected value.
         * @param {Boolean} [settings.closeOnSelect] Whether to close the menu after selecting an item.
         * @param {Boolean} [settings.fullWidth] Whether the menu should be the full width of the toggle.
         * @param {number} [settings.duration=100] The duration of the animation.
         * @param {string} [settings.placement=bottom] The placement of the SelectMenu relative to the toggle.
         * @param {string} [settings.position=start] The position of the SelectMenu relative to the toggle.
         * @param {Boolean} [settings.fixed=false] Whether the SelectMenu position is fixed.
         * @param {number} [settings.spacing=2] The spacing between the SelectMenu and the toggle.
         * @param {number} [settings.minContact=false] The minimum amount of contact the SelectMenu must make with the toggle.
         * @returns {SelectMenu} A new SelectMenu object.
         */
        constructor(node, settings) {
            this._node = node;

            this._settings = Core.extend(
                {},
                this.constructor.defaults,
                dom.getDataset(this._node),
                settings
            );

            this._placeholderText = this._settings.placeholder;
            this._maxSelections = this._settings.maxSelections;
            this._multiple = dom.getProperty(this._node, 'multiple');
            this._disabled = dom.getProperty(this._node, 'disabled');

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

            dom.setData(this._node, 'selectmenu', this);
        }

        /**
         * Destroy the SelectMenu.
         */
        destroy() {
            if (this._popper) {
                this._popper.destroy();
            }

            dom.removeEvent(this._node, 'focus.frost.selectmenu');
            dom.removeClass(this._node, 'visually-hidden');
            dom.remove(this._menuNode);
            dom.remove(this._toggle);
            dom.removeData(this._node, 'selectmenu');
        }

        /**
         * Hide the SelectMenu.
         */
        hide() {
            if (
                this._animating ||
                !dom.isConnected(this._menuNode) ||
                !dom.triggerOne(this._node, 'hide.frost.selectmenu')
            ) {
                return;
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
                dom.triggerEvent(this._node, 'hidden.frost.selectmenu');
            }).catch(_ => { }).finally(_ => {
                this._animating = false;
            });
        }

        /**
         * Show the SelectMenu.
         */
        show() {
            if (
                this._disabled ||
                this._animating ||
                dom.isConnected(this._menuNode) ||
                !dom.triggerOne(this._node, 'show.frost.selectmenu')
            ) {
                return;
            }

            this._getData({});

            if (this._multiple && !dom.hasChildren(this._itemsList)) {
                return;
            }

            this._animating = true;
            dom.append(document.body, this._menuNode);
            this.update();

            dom.fadeIn(this._menuNode, {
                duration: this._settings.duration
            }).then(_ => {
                dom.setAttribute(this._toggle, 'aria-expanded', true);
                dom.triggerEvent(this._node, 'shown.frost.selectmenu');
            }).catch(_ => { }).finally(_ => {
                this._animating = false;
            });
        }

        /**
         * Toggle the SelectMenu.
         */
        toggle() {
            dom.isConnected(this._menuNode) ?
                this.hide() :
                this.show();
        }

        /**
         * Update the SelectMenu position.
         */
        update() {
            this._popper.update();
        }

        /**
         * Auto-hide all visible select menus (non-inline).
         * @param {HTMLElement} [target] The target node.
         */
        static autoHide(target) {
            const targetSelector = dom.getDataset(target, 'target');
            const menus = dom.find('.selectmenu-menu');

            for (const menu of menus) {
                if (target && dom.hasDescendent(menu, target)) {
                    continue;
                }

                const selector = dom.getDataset(menu, 'target');

                if (selector === targetSelector) {
                    continue;
                }

                const input = dom.findOne(selector);
                const datetimepicker = this.init(input);
                datetimepicker.hide();
            }
        }

        /**
         * Initialize a SelectMenu.
         * @param {HTMLElement} node The input node.
         * @param {object} [settings] The options to create the SelectMenu with.
         * @param {string} [settings.placeholder] The placeholder text.
         * @param {object} [settings.lang] Language to use.
         * @param {object|array} [settings.data] The selection data.
         * @param {function} [settings.getResults] The query callback.
         * @param {function} [settings.isMatch] The match test callback.
         * @param {function} [settings.renderResult] The render result callback
         * @param {function} [settings.renderSelection] The render selection callback.
         * @param {function} [settings.sanitize] The sanitization callback.
         * @param {function} [settings.sortResults] The sort results callback.
         * @param {number} [settings.maxSelections] The maximum number of selected options.
         * @param {number} [settings.minSearch] The minimum length to start searching.
         * @param {Boolean} [settings.allowClear] Whether to allow clearing the selected value.
         * @param {Boolean} [settings.closeOnSelect] Whether to close the menu after selecting an item.
         * @param {Boolean} [settings.fullWidth] Whether the menu should be the full width of the toggle.
         * @param {number} [settings.duration=100] The duration of the animation.
         * @param {string} [settings.placement=bottom] The placement of the SelectMenu relative to the toggle.
         * @param {string} [settings.position=start] The position of the SelectMenu relative to the toggle.
         * @param {Boolean} [settings.fixed=false] Whether the SelectMenu position is fixed.
         * @param {number} [settings.spacing=2] The spacing between the SelectMenu and the toggle.
         * @param {number} [settings.minContact=false] The minimum amount of contact the SelectMenu must make with the toggle.
         * @returns {SelectMenu} A new SelectMenu object.
         */
        static init(node, settings) {
            return dom.hasData(node, 'selectmenu') ?
                dom.getData(node, 'selectmenu') :
                new this(node, settings);
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
            dom.addEvent(this._node, 'focus.frost.selectmenu', _ => {
                if (this._disabled) {
                    return;
                }

                if (this._multiple) {
                    dom.focus(this._searchInput);
                } else {
                    dom.focus(this._toggle);
                }
            });

            dom.addEvent(this._menuNode, 'mousedown.frost.selectmenu', e => {
                // prevent search input from triggering blur event
                e.preventDefault();
            });

            dom.addEventDelegate(this._itemsList, 'mouseup.frost.selectmenu', '[data-action="select"]', e => {
                e.preventDefault();

                const value = dom.getDataset(e.currentTarget, 'value');
                this._selectValue(value);
            });

            dom.addEventDelegate(this._itemsList, 'mouseover.frost.selectmenu', '.selectmenu-action:not(.disabled)', e => {
                const focusedNode = dom.findOne('.selectmenu-focus', this._itemsList);
                dom.removeClass(focusedNode, 'selectmenu-focus');
                dom.addClass(e.currentTarget, 'selectmenu-focus');
            });

            dom.addEvent(this._searchInput, 'keydown.frost.selectmenu', e => {
                if (!['ArrowDown', 'ArrowUp', 'Backspace', 'Enter', 'Escape'].includes(e.key)) {
                    return;
                }

                if (e.key === 'Backspace') {
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
                        dom.triggerEvent(this._searchInput, 'input.frost.selectmenu');
                    }

                    return;
                }

                if (this._multiple && !dom.isConnected(this._menuNode) && ['ArrowDown', 'ArrowUp', 'Enter'].includes(e.key)) {
                    return this.show();
                }

                if (e.key === 'Escape') {
                    // close the menu
                    dom.blur(this._searchInput);

                    if (this._multiple) {
                        dom.focus(this._searchInput);
                    } else {
                        dom.focus(this._toggle);
                    }

                    return;
                }

                const focusedNode = dom.findOne('.selectmenu-focus', this._itemsList);

                if (e.key === 'Enter') {
                    // select the focused item
                    if (focusedNode) {
                        const value = dom.getDataset(focusedNode, 'value');
                        this._selectValue(value);
                    }

                    return;
                }

                // focus the previous/next item

                let focusNode;
                if (!focusedNode) {
                    focusNode = dom.findOne('.selectmenu-action:not(.disabled)', this._itemsList);
                } else {
                    switch (e.key) {
                        case 'ArrowDown':
                            focusNode = dom.nextAll(focusedNode, '.selectmenu-action:not(.disabled)').shift();
                            break;
                        case 'ArrowUp':
                            focusNode = dom.prevAll(focusedNode, '.selectmenu-action:not(.disabled)').pop();
                            break;
                    }
                }

                if (focusNode) {
                    dom.removeClass(focusedNode, 'selectmenu-focus');
                    dom.addClass(focusNode, 'selectmenu-focus');
                }
            });

            dom.addEvent(this._searchInput, 'input.frost.selectmenu', _ => {
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

                dom.empty(this._itemsList);
                this._getData({ term });
            });

            if (this._settings.getResults) {
                // infinite scrolling event
                dom.addEvent(this._itemsList, 'scroll.frost.selectmenu', _ => {
                    if (this._request || !this._showMore) {
                        return;
                    }

                    const height = dom.height(this._itemsList);
                    const scrollHeight = dom.height(this._itemsList, DOM.SCROLL_BOX);
                    const scrollTop = dom.getScrollY(this._itemsList);

                    if (scrollTop >= scrollHeight - height - 50) {
                        const term = dom.getValue(this._searchInput);
                        const offset = this._data.length;

                        this._getData({ term, offset });
                    }
                });
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
            dom.addEvent(this._searchInput, 'focus.frost.selectmenu', _ => {
                dom.hide(this._placeholder);
                dom.detach(this._placeholder);
                dom.addClass(this._toggle, 'focus');
            });

            dom.addEvent(this._searchInput, 'blur.frost.selectmenu', _ => {
                if (dom.hasDataset(this._toggle, 'preFocus')) {
                    // prevent losing focus when toggle element is focused
                    return;
                }

                dom.removeClass(this._toggle, 'focus');
                this.hide();
            });

            dom.addEvent(this._toggle, 'mousedown.frost.selectmenu', _ => {
                if (dom.hasClass(this._toggle, 'focus')) {
                    // maintain focus when toggle element is already focused
                    dom.setDataset(this._toggle, 'preFocus', true);
                } else {
                    dom.hide(this._placeholder);
                    dom.addClass(this._toggle, 'focus');
                }

                this.show();

                dom.addEventOnce(window, 'mouseup.frost.selectmenu', _ => {
                    if (dom.hasDataset(this._toggle, 'preFocus')) {
                        dom.removeDataset(this._toggle, 'preFocus');
                    }

                    dom.focus(this._searchInput);
                });
            });

            dom.addEventDelegate(this._toggle, 'click.frost.selectmenu', '[data-action="clear"]', e => {
                e.preventDefault();

                // remove selection
                const element = dom.parent(e.currentTarget);
                const index = dom.index(element);
                this._value.splice(index, 1)
                this._setValue(this._value);
                dom.focus(this._searchInput);
            });
        },

        /**
         * Attach events for a single SelectMenu.
         */
        _eventsSingle() {
            dom.addEvent(this._searchInput, 'blur.frost.selectmenu', _ => {
                this.hide();
            });

            dom.addEvent(this._toggle, 'mousedown.frost.selectmenu', _ => {
                if (dom.isConnected(this._menuNode)) {
                    this.hide();
                } else {
                    this.show();

                    dom.addEventOnce(window, 'mouseup.frost.selectmenu', _ => {
                        // focus search input when mouse is released
                        dom.focus(this._searchInput);
                    });
                }
            });

            dom.addEvent(this._toggle, 'keydown.frost.selectmenu', e => {
                if (!/^.$/u.test(e.key)) {
                    return;
                }

                this.show();
                dom.focus(this._searchInput);
            });

            if (this._settings.allowClear) {
                dom.addEventDelegate(this._toggle, 'click.frost.selectmenu', '[data-action="clear"]', _ => {
                    // remove selection
                    this._setValue(null);
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
            if (this._disabled) {
                dom.addClass(this._toggle, 'disabled');
                if (this._multiple) {
                    dom.setAttribute(this._searchInput, 'tabindex', '-1');
                } else {
                    dom.setAttribute(this._toggle, 'tabindex', '-1');
                }
            } else {
                dom.removeClass(this._toggle, 'disabled');
                if (this._multiple) {
                    dom.removeAttribute(this._searchInput, 'tabindex');
                } else {
                    dom.removeAttribute(this._toggle, 'tabindex');
                }
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
            if (this._value && this._value.length) {
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

            this._setValue(value);

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
         */
        _setValue(value) {
            this._value = value;
            this._refresh();
        },

        /**
         * Update the search input width.
         */
        _updateSearchWidth() {
            const span = dom.create('span', {
                text: dom.getValue(this._searchInput),
                class: 'd-inline-block',
                style: {
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
            dom.addClass(this._node, 'visually-hidden');
            dom.setAttribute(this._node, 'tabindex', '-1');

            dom.after(this._node, this._toggle);
        },

        /**
         * Render the clear button.
         */
        _renderClear() {
            this._clear = dom.create('button', {
                html: '<small class="icon-cancel"></small>',
                class: 'close float-end me-5 lh-base',
                dataset: {
                    action: 'clear'
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
                class: 'selectmenu-group'
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
                class: 'selectmenu-item text-secondary'
            });
            dom.append(this._itemsList, element);
            this.update();
            return element;
        },

        /**
         * Render an item.
         * @param {object} group The item to render.
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
                class: 'selectmenu-item selectmenu-action',
                dataset: {
                    action: 'select',
                    value: item.value
                }
            });

            if (active) {
                dom.addClass(element, 'active');
            }

            if (item.disabled) {
                dom.addClass(element, 'disabled');
            }

            return element;
        },

        /**
         * Render the menu.
         */
        _renderMenu() {
            this._menuNode = dom.create('div', {
                class: 'selectmenu-menu',
                dataset: {
                    target: '#' + dom.getAttribute(this._node, 'id')
                }
            });

            if (!this._multiple) {
                // add search input for single select menus

                const searchItem = dom.create('div', {
                    class: 'p-1'
                });
                dom.append(this._menuNode, searchItem);

                const searchContainer = dom.create('div', {
                    class: 'form-input'
                });
                dom.append(searchItem, searchContainer);

                this._searchInput = dom.create('input', {
                    class: 'input-filled'
                });
                dom.append(searchContainer, this._searchInput);

                const ripple = dom.create('div', {
                    class: 'ripple-line'
                });
                dom.append(searchContainer, ripple);
            }

            this._itemsList = dom.create('div', {
                class: 'selectmenu-items'
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
                class: 'btn-group'
            });

            const close = dom.create('div', {
                html: '<small class="icon-cancel"></small>',
                class: 'btn btn-sm btn-outline-secondary',
                dataset: {
                    action: 'clear'
                }
            });
            dom.append(group, close);

            const content = this._settings.renderSelection(item);
            const tag = dom.create('div', {
                html: this._settings.sanitize(content),
                class: 'btn btn-sm btn-secondary'
            });
            dom.append(group, tag);

            return group;
        },

        /**
         * Render the placeholder.
         */
        _renderPlaceholder() {
            this._placeholder = dom.create('span', {
                html: this._settings.sanitize(this._placeholderText),
                class: 'selectmenu-placeholder'
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

            let focusNode = dom.findOne('.selectmenu-action.active', this._itemsList);

            if (!focusNode) {
                focusNode = dom.findOne('.selectmenu-action:not(.disabled)', this._itemsList);
            }

            if (focusNode) {
                dom.addClass(focusNode, 'selectmenu-focus');
            }
        },

        /**
         * Render the single toggle element.
         */
        _renderToggleSingle() {
            this._toggle = dom.create('button', {
                class: [
                    dom.getAttribute(this._node, 'class') || '',
                    'selectmenu-toggle position-relative text-start'
                ],
                dataset: {
                    target: '#' + dom.getAttribute(this._node, 'id')
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
                    'selectmenu-multi d-flex flex-wrap position-relative text-start'
                ],
                dataset: {
                    target: '#' + dom.getAttribute(this._node, 'id')
                }
            });

            this._searchInput = dom.create('input', {
                class: 'selectmenu-multi-input'
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
        data: null,
        getResults: null,
        isMatch: (item, term) => item.text.toLowerCase().indexOf(term.toLowerCase()) > -1,
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
        fullWidth: true,
        duration: 100,
        placement: 'bottom',
        position: 'start',
        fixed: false,
        spacing: 3,
        minContact: false
    };

    // SelectMenu QuerySet method
    if (QuerySet) {
        QuerySet.prototype.selectmenu = function(a, ...args) {
            let settings, method;

            if (Core.isObject(a)) {
                settings = a;
            } else if (Core.isString(a)) {
                method = a;
            }

            for (const node of this) {
                if (!Core.isElement(node)) {
                    continue;
                }

                const selectMenu = SelectMenu.init(node, settings);

                if (method) {
                    selectMenu[method](...args);
                }
            }

            return this;
        };
    }

    UI.SelectMenu = SelectMenu;

});