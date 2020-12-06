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

            let data;
            if (!this._settings.data) {
                data = this.constructor._getDataFromDOM(this._node);
            } else if (Core.isPlainObject(this._settings.data)) {
                data = this.constructor._getDataFromObject(this._settings.data);
            } else if (Core.isArray(this._settings.data)) {
                data = this._settings.data;
            } else if (Core.isFunction(this._settings.data)) {
                this._getData = (callback, options) => {
                    // show loading
                    this._settings.data(options, response => {
                        // hide loading
                        this.constructor._parseData(response.results);

                        callback(response);
                    });
                };
            }

            if (data) {
                this._data = this.constructor._parseData(data);

                this._getData = (callback, { term = null }) => {
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

                    callback({ results });
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

            dom.fadeOut(this._menuNode, {
                duration: this._settings.duration
            }).then(_ => {
                dom.empty(this._itemsList);
                dom.detach(this._menuNode);
                dom.detach(this._searchInput);
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

            this._animating = true;
            dom.append(document.body, this._menuNode);
            this._popper.update();

            this._getData(response => {
                this._renderResults(response.results);
            }, {});

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


    // SelectMenu events
    dom.addEvent(document, 'click.frost.selectmenu', e => {
        SelectMenu.autoHide(e.target);
    });

    dom.addEventDelegate(document, 'click.frost.selectmenu', '[data-toggle="selectmenu"]', e => {
        const target = UI.getTarget(e.currentTarget);
        SelectMenu.init(target).show();
    });

    dom.addEvent(document, 'keyup.frost.selectmenu', e => {
        switch (e.key) {
            case 'Tab':
                SelectMenu.autoHide(e.target);
                break;
            case 'Escape':
                SelectMenu.autoHide();
                break;
        }
    });


    Object.assign(SelectMenu.prototype, {

        _updateSearchWidth() {
            const span = dom.create('span', {
                text: dom.getValue(this._searchInput),
                class: 'd-inline-block',
                style: {
                    fontSize: dom.css(this._searchInput, 'fontSize')
                }
            });
            dom.append(document.body, span);

            const width = dom.width(span);
            dom.setStyle(this._searchInput, 'width', width + 2);
            dom.remove(span);
        },

        _events() {
            dom.addEvent(this._searchInput, 'input', _ => {
                this._updateSearchWidth();

                dom.empty(this._itemsList);
                this._getData(response => {
                    this._renderResults(response.results);
                }, {
                    term: dom.getValue(this._searchInput)
                });
            });

            dom.addEvent(this._toggle, 'keydown', e => {
                if (!dom.isConnected(this._searchInput)) {
                    dom.setValue(this._searchInput, '');
                    dom.append(this._toggle, this._searchInput);
                    this._updateSearchWidth();
                }
                dom.focus(this._searchInput);
            });

            dom.addEventDelegate(this._itemsList, 'click', '[data-action]', e => {
                e.preventDefault();

                let value = dom.getDataset(e.currentTarget, 'value');

                if (this._multiple) {
                    value = this._value.concat([value]);
                }

                this.setValue(value);

                if (this._settings.closeOnSelect) {
                    this.hide();
                }
            });

            dom.addEvent(this._toggle, 'focus', _ => {
                dom.focus(this._searchInput);
            });

            dom.addEventDelegate(this._toggle, 'click', '[data-action]', e => {
                e.preventDefault();

                const element = dom.parent(e.currentTarget);
                const index = dom.index(element);
                this._value.splice(index, 1)
                this.setValue(this._value);
            });
        }

    });


    Object.assign(SelectMenu.prototype, {

        _findValue(value) {
            for (const item of this._data) {
                if (item.value == value) {
                    return item;
                }

                if (!item.children) {
                    continue;
                }

                for (const child of item.children) {
                    if (child.value == value) {
                        return child;
                    }
                }
            }

            return null;
        },

        _refresh() {
            dom.empty(this._node);

            const item = this._findValue(this._value);

            if (!item) {
                return this._renderPlaceholder();
            }

            dom.append(this._node, item.element);

            const content = this._settings.renderSelection(item);
            dom.setHTML(this._toggle, this._settings.sanitize(content));
        },

        _refreshMulti() {
            dom.empty(this._node);
            dom.empty(this._toggle);

            if (!this._value.length) {
                return this._renderPlaceholder();
            }

            for (const value of this._value) {
                const item = this._findValue(value);

                if (!item) {
                    continue;
                }

                dom.append(this._node, item.element);

                const group = this._renderMultiSelection(item);
                dom.append(this._toggle, group);
            }
        },

        _setValue(value) {
            this._value = value;

            if (this._multiple) {
                this._refreshMulti();
            } else {
                this._refresh();
            }
        }

    });


    Object.assign(SelectMenu.prototype, {

        _render() {
            if (this._multiple) {
                this._renderSelectMulti();
            } else {
                this._renderSelect();
            }
            this._renderMenu();
            dom.hide(this._node);
            dom.after(this._node, this._toggle);
        },

        _renderItem(item) {
            const element = dom.create('li', {
                html: this._settings.sanitize(
                    this._settings.renderResult(item)
                ),
                class: 'selectmenu-item',
                dataset: {
                    action: 'select',
                    value: item.value
                }
            });

            if (
                (
                    this._multiple &&
                    this._value.includes(item.value)
                ) ||
                (
                    !this._multiple &&
                    item.value == this._value
                )
            ) {
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
                const searchContainer = dom.create('div', {
                    class: 'p-1'
                });
                dom.append(this._menuNode, searchContainer);

                this._searchInput = dom.create('input', {
                    class: 'input-filled'
                });
                dom.append(searchContainer, this._searchInput);
            } else {
                this._searchInput = dom.create('input', {
                    class: 'selectmenu-multi-input'
                });
            }

            this._itemsList = dom.create('ul', {
                class: 'selectmenu-items'
            });
            dom.append(this._menuNode, this._itemsList);

            this._popper = new UI.Popper(
                this._menuNode,
                {
                    reference: this._toggle,
                    placement: this._settings.placement,
                    position: this._settings.position,
                    fixed: this._settings.fixed,
                    fullWidth: this._settings.fullWidth,
                    spacing: this._settings.spacing,
                    minContact: this._settings.minContact
                }
            );
        },

        _renderMultiSelection(item) {
            const group = dom.create('div', {
                class: 'btn-group'
            });

            const content = this._settings.renderSelection(item);
            const tag = dom.create('div', {
                html: this._settings.sanitize(content),
                class: 'btn btn-sm btn-secondary'
            });
            dom.append(group, tag);

            if (this._settings.allowClear) {
                const close = dom.create('div', {
                    html: '<small class="icon-cancel"></small>',
                    class: 'btn btn-sm btn-outline-secondary',
                    dataset: {
                        action: 'clear'
                    }
                });
                dom.append(group, close);
            }

            return group;
        },

        _renderPlaceholder() {
            const placeholder = dom.create('span', {
                html: this._settings.sanitize(this._settings.placeholder),
                class: 'selectmenu-placeholder'
            });
            dom.append(this._toggle, placeholder);
        },

        _renderResults(results) {
            for (const item of results) {
                const element = item.children ?
                    this._renderGroup(item) :
                    this._renderItem(item);
                dom.append(this._itemsList, element);
            }
        },

        _renderSelectMulti() {
            this._toggle = dom.create('button', {
                class: [
                    dom.getAttribute(this._node, 'class'),
                    'selectmenu-multi d-flex flex-wrap position-relative text-left'
                ],
                dataset: {
                    toggle: 'selectmenu',
                    target: '#' + dom.getAttribute(this._node, 'id')
                }
            });

        },

        _renderSelect() {
            this._toggle = dom.create('button', {
                class: [
                    dom.getAttribute(this._node, 'class'),
                    'selectmenu-toggle position-relative text-left'
                ],
                dataset: {
                    toggle: 'selectmenu',
                    target: '#' + dom.getAttribute(this._node, 'id')
                }
            });
        }

    });


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
        }

    });


    // SelectMenu default options
    SelectMenu.defaults = {
        data: null,
        maxSearch: 0,
        maxSelect: 0,
        minSearch: 0,
        minResults: 0,
        placeholder: 'Nothing Selected',
        lang: {
            loadMore: 'Loading..',
            maxSelect: 'Selection limit reached.',
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
        allowClear: false,
        closeOnSelect: true,
        duration: 100,
        placement: 'bottom',
        position: 'start',
        fixed: false,
        fullWidth: true,
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