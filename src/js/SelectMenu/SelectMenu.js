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
        if (Core.isFunction(this._settings.getResults)) {
            this._getData = ({ offset = 0, term = null }) => {
                if (this._request && this._request.cancel) {
                    this._request.cancel();
                    this._request = null;
                }

                if (!offset) {
                    this._data = [];
                    dom.empty(this._itemsList);
                }

                if (this._multiple && this._settings.maxSelect && this._value.length >= this._settings.maxSelect) {
                    const maxSelect = dom.create('li', {
                        html: this._settings.sanitize(
                            this._settings.lang.maxSelect
                        ),
                        class: 'selectmenu-item text-secondary'
                    });
                    dom.append(this._itemsList, maxSelect);
                    return;
                }

                const loading = dom.create('li', {
                    html: this._settings.sanitize(
                        this._settings.lang.loading
                    ),
                    class: 'selectmenu-item text-secondary'
                });
                dom.append(this._itemsList, loading);

                const request = this._settings.getResults({ offset, term });
                this._request = request;

                Promise.resolve(request).then(response => {
                    const newData = this.constructor._parseData(response.results);
                    this._data.push(...newData);
                    this._showMore = response.showMore;

                    Object.assign(
                        this._lookupData,
                        this.constructor._parseDataLookup(this._data)
                    );

                    this._renderResults(response.results);
                }).catch(_ => {
                    // error
                }).finally(_ => {
                    dom.remove(loading);

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

        this._data = {};
        this._lookupData = {};

        if (data) {
            this._data = this.constructor._parseData(data);
            this._lookupData = this.constructor._parseDataLookup(data);

            this._getData = ({ term = null }) => {
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

        this._animating = true;
        dom.append(document.body, this._menuNode);
        this._popper.update();

        this._getData({});

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
