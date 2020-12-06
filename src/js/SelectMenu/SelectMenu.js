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
