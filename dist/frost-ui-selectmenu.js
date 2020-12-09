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

    class SelectMenu {

        constructor(node, settings) {
            this._node = node;

            this._settings = Core.extend(
                {},
                this.constructor.defaults,
                dom.getDataset(this._node),
                settings
            );

            this._multiple = dom.getProperty(this._node, 'multiple');
            this._disabled = dom.getProperty(this._node, 'disabled')

            this._getData = null;
            this._getResults = null;

            let data;
            if (Core.isFunction(this._settings.getResults)) {
                this._getResults = options => {
                    if (!options.offset) {
                        this._data = [];
                    }

                    const request = this._settings.getResults(options);
                    this._request = Promise.resolve(request);

                    this._request.then(response => {
                        const newData = this.constructor._parseData(response.results);
                        this._data.push(...newData);
                        this._showMore = response.showMore;

                        Object.assign(
                            this._lookupData,
                            this.constructor._parseDataLookup(this._data)
                        );

                        return response;
                    });

                    return this._request;
                };

                this._getData = ({ offset = 0, term = null }) => {
                    if (this._request && this._request.cancel) {
                        this._request.cancel();
                        this._request = null;
                    }

                    if (!offset) {
                        dom.empty(this._itemsList);
                    }

                    if (this._settings.minSearch && (!term || term.length < this._settings.minSearch)) {
                        this._popper.update();
                        return;
                    }

                    if (this._multiple && this._settings.maxSelections && this._value.length >= this._settings.maxSelections) {
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
                        this._popper.update();

                        if (this._request === request) {
                            this._request = null;
                        }
                    });
                };
            } else if (Core.isPlainObject(this._settings.data)) {
                data = this.constructor._getDataFromObject(this._settings.data);
            } else if (Core.isArray(this._settings.data)) {
                data = this._settings.data;
            } else {
                data = this.constructor._getDataFromDOM(this._node);
            }

            this._data = [];
            this._lookupData = {};

            if (data) {
                this._data = this.constructor._parseData(data);
                this._lookupData = this.constructor._parseDataLookup(data);

                this._getData = ({ term = null }) => {
                    if (this._settings.minSearch && (!term || term.length < this._settings.minSearch)) {
                        this._popper.update();
                        return;
                    }

                    if (this._multiple && this._settings.maxSelections && this._value.length >= this._settings.maxSelections) {
                        return this._renderInfo(this._settings.lang.maxSelections);
                    }

                    let results = this._data;

                    if (term) {
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
                    this._popper.update();
                };
            }

            const value = dom.getValue(this._node);
            this._render();
            this.setValue(value);
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

            // remove menu
            // remove button
            // remove events
            dom.removeData(this._node, 'selectmenu');
        }

        /**
         * Hide the SelectMenu.
         */
        hide() {
            if (
                this._settings.inline ||
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
                this._settings.inline ||
                this._animating ||
                dom.isConnected(this._menuNode) ||
                dom.is(this._node, ':disabled') ||
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

            this._popper.update();

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

        static init(node, settings, autoInit = false) {
            return dom.hasData(node, 'selectmenu') ?
                dom.getData(node, 'selectmenu') :
                new this(node, settings, autoInit);
        }

    }


    Object.assign(SelectMenu.prototype, {

        _events() {
            dom.addEventDelegate(this._itemsList, 'click.frost.selectmenu', '[data-action="select"]', e => {
                e.preventDefault();

                let value = dom.getDataset(e.currentTarget, 'value');

                const item = this._findValue(value);

                value = item.value;

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
            });

            dom.addEventDelegate(this._itemsList, 'mouseover.frost.selectmenu', '.selectmenu-action:not(.disabled)', e => {
                const focusedNode = dom.findOne('.selectmenu-focus', this._itemsList);
                dom.removeClass(focusedNode, 'selectmenu-focus');
                dom.addClass(e.currentTarget, 'selectmenu-focus');
            });

            dom.addEvent(this._searchInput, 'keydown.frost.selectmenu', e => {
                if (e.key === 'Backspace' && this._multiple && !dom.getValue(this._searchInput)) {
                    const lastValue = this._value.pop();

                    if (!lastValue) {
                        return;
                    }

                    e.preventDefault();

                    this._refreshMulti();
                    const lastItem = this._findValue(lastValue);
                    dom.setValue(this._searchInput, lastItem.text);
                    this._updateSearchWidth();
                    dom.focus(this._searchInput);
                    dom.triggerEvent(this._searchInput, 'input.frost.selectmenu');
                    return;
                }

                if (e.key === 'Escape') {
                    dom.blur(this._searchInput);

                    if (this._multiple) {
                        dom.focus(this._searchInput);
                    } else {
                        dom.focus(this._toggle);
                    }

                    return;
                }

                if (!['ArrowDown', 'ArrowUp', 'Enter'].includes(e.key)) {
                    return;
                }

                e.preventDefault();

                if (this._multiple && !dom.isConnected(this._menuNode)) {
                    return this.show();
                }

                const focusedNode = dom.findOne('.selectmenu-focus', this._itemsList);

                if (e.key === 'Enter') {
                    return dom.click(focusedNode);
                }

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

                if (!focusNode) {
                    return;
                }

                dom.removeClass(focusedNode, 'selectmenu-focus');
                dom.addClass(focusNode, 'selectmenu-focus');
            });

            dom.addEvent(this._searchInput, 'input.frost.selectmenu', _ => {
                if (this._multiple) {
                    this._updateSearchWidth();
                }

                const term = dom.getValue(this._searchInput);

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

        _eventsMulti() {
            dom.addEvent(this._node, 'focus.frost.selectmenu', _ => {
                dom.focus(this._searchInput);
            });

            dom.addEvent(this._searchInput, 'focus.frost.selectmenu', _ => {
                dom.hide(this._placeholder);
                dom.detach(this._placeholder);
                dom.addClass(this._toggle, 'focus');
            });

            dom.addEvent(this._searchInput, 'blur.frost.selectmenu', _ => {
                if (dom.getDataset(this._toggle, 'preFocus')) {
                    return;
                }

                this._refreshPlaceholder();
                dom.setValue(this._searchInput, '');
                dom.removeClass(this._toggle, 'focus');
                this.hide();
            });

            dom.addEvent(this._toggle, 'mousedown.frost.selectmenu', _ => {
                if (dom.hasClass(this._toggle, 'focus')) {
                    dom.setDataset(this._toggle, 'preFocus', true);
                } else {
                    dom.hide(this._placeholder);
                    dom.addClass(this._toggle, 'focus');
                }
                this.show();
                dom.addEventOnce(window, 'mouseup.frost.selectmenu', _ => {
                    dom.removeDataset(this._toggle, 'preFocus');
                    dom.focus(this._searchInput);
                });
            });

            // remove selection
            dom.addEventDelegate(this._toggle, 'click.frost.selectmenu', '[data-action="clear"]', e => {
                e.preventDefault();

                const element = dom.parent(e.currentTarget);
                const index = dom.index(element);
                this._value.splice(index, 1)
                this.setValue(this._value);
                dom.focus(this._searchInput);
            });
        },

        _eventsSingle() {
            dom.addEvent(this._node, 'focus.frost.selectmenu', _ => {
                dom.focus(this._toggle);
            });

            dom.addEvent(this._searchInput, 'blur.frost.selectmenu', _ => {
                this.hide();
            });

            dom.addEvent(this._toggle, 'mousedown.frost.selectmenu', _ => {
                if (dom.isConnected(this._menuNode)) {
                    this.hide();
                } else {
                    this.show();
                    dom.addEventOnce(window, 'mouseup.frost.selectmenu', _ => {
                        dom.focus(this._searchInput);
                    });
                }
            });

            dom.addEvent(this._toggle, 'keydown.frost.selectmenu', _ => {
                this.show();
                dom.focus(this._searchInput);
            });

            // remove selection
            if (this._settings.allowClear) {
                dom.addEventDelegate(this._toggle, 'click.frost.selectmenu', '[data-action="clear"]', e => {
                    this.setValue(null);
                });
            }
        }

    });


    Object.assign(SelectMenu.prototype, {

        _findValue(value) {
            if (value in this._lookupData) {
                return this._lookupData[value];
            }

            return null;
        },

        _refresh() {
            dom.empty(this._node);
            dom.detach(this._placeholder);

            if (this._settings.allowClear) {
                dom.detach(this._clear);
            }

            if (this._disabled) {
                dom.addClass(this._toggle, 'disabled');
            } else {
                dom.removeClass(this._toggle, 'disabled');
            }

            const item = this._findValue(this._value);

            if (!item) {
                dom.empty(this._toggle);
                dom.show(this._placeholder);
                dom.append(this._toggle, this._placeholder);
                return;
            }

            dom.append(this._node, item.element);

            const content = this._settings.renderSelection(item);
            dom.setHTML(this._toggle, this._settings.sanitize(content));

            if (this._settings.allowClear) {
                dom.append(this._toggle, this._clear);
            }
        },

        _refreshMulti() {
            if (!this._value) {
                this._value = [];
            }

            if (this._settings.maxSelections && this._value.length > this._settings.maxSelections) {
                this._value = this._value.slice(0, this._settings.maxSelections);
            }

            dom.detach(this._searchInput);
            dom.detach(this._placeholder);

            dom.empty(this._node);
            dom.empty(this._toggle);

            if (this._disabled) {
                dom.addClass(this._toggle, 'disabled');
            } else {
                dom.removeClass(this._toggle, 'disabled');
            }

            if (!this._value.length) {
                this._refreshPlaceholder();
            } else {
                for (const value of this._value) {
                    const item = this._findValue(value);

                    if (!item) {
                        continue;
                    }

                    dom.append(this._node, item.element);

                    const group = this._renderMultiSelection(item);
                    dom.append(this._toggle, group);
                }
            }

            dom.append(this._toggle, this._searchInput);
        },

        _refreshPlaceholder() {
            if (!this._multiple) {
                return;
            }

            if (!this._value.length) {
                dom.show(this._placeholder);
                dom.prepend(this._toggle, this._placeholder);
            } else {
                dom.hide(this._placeholder);
            }
        },

        _setValue(value) {
            this._value = value;

            if (this._multiple) {
                this._refreshMulti();
            } else {
                this._refresh();
            }
        },

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


    Object.assign(SelectMenu.prototype, {

        _render() {
            if (this._multiple) {
                this._renderSelectMulti();
            } else {
                if (this._settings.allowClear) {
                    this._renderClear();
                }

                this._renderSelect();
            }

            this._renderPlaceholder();
            this._renderMenu();

            dom.addClass(this._node, 'visually-hidden');
            dom.after(this._node, this._toggle);
        },

        _renderClear() {
            this._clear = dom.create('button', {
                html: '<small class="icon-cancel"></small>',
                class: 'close float-end me-5 lh-base',
                dataset: {
                    action: 'clear'
                }
            });
        },

        _renderInfo(text) {
            const element = dom.create('button', {
                html: this._settings.sanitize(text),
                class: 'selectmenu-item text-secondary'
            });
            dom.append(this._itemsList, element);
            this._popper.update();
            return element;
        },

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

            return element;
        },

        _renderGroup(group) {
            return dom.create('div', {
                html: this._settings.sanitize(
                    this._settings.renderResult(group)
                ),
                class: 'selectmenu-group'
            });
        },

        _renderMenu() {
            this._menuNode = dom.create('div', {
                class: 'selectmenu-menu',
                dataset: {
                    target: '#' + dom.getAttribute(this._node, 'id')
                }
            });

            if (!this._multiple) {
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

                if (this._settings.maxSearch) {
                    dom.setAttribute(this._searchInput, 'maxlength', this._settings.maxSearch);
                }
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

        _renderPlaceholder() {
            this._placeholder = dom.create('span', {
                html: this._settings.sanitize(this._settings.placeholder),
                class: 'selectmenu-placeholder'
            });
        },

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

        _renderSelectMulti() {
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

            if (this._settings.maxSearch) {
                dom.setAttribute(this._searchInput, 'maxlength', this._settings.maxSearch);
            }
        },

        _renderSelect() {
            this._toggle = dom.create('button', {
                class: [
                    dom.getAttribute(this._node, 'class') || '',
                    'selectmenu-toggle position-relative text-start'
                ],
                dataset: {
                    target: '#' + dom.getAttribute(this._node, 'id')
                }
            });
        }

    });


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
        }

    });


    Object.assign(SelectMenu, {

        _buildOption(item) {
            return dom.create('option', {
                text: item.text,
                value: item.value
            });
        },

        _getDataFromDOM(element) {
            const children = dom.children(element);

            const results = [];

            for (const child of children) {
                const text = dom.getText(child);
                const data = dom.getDataset(child);

                if (dom.is(child, 'option')) {
                    results.push({
                        text,
                        value: dom.getValue(child),
                        ...data
                    })
                } else {
                    results.push({
                        text,
                        children: this._getDataFromDOM(child),
                        ...data
                    });
                }
            }

            return results;
        },

        _getDataFromObject(data) {
            return Object.entries(data)
                .map(([value, text]) => ({ value, text }));
        },

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
        data: null,
        placeholder: '&nbsp;',
        lang: {
            loading: 'Loading..',
            maxSelections: 'Selection limit reached.',
            noResults: 'No results'
        },
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
        maxSearch: 0,
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