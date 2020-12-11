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

        this._placeholderText = this._settings.placeholder;
        this._maxSelections = this._settings.maxSelections;
        this._multiple = dom.getProperty(this._node, 'multiple');
        this._disabled = dom.getProperty(this._node, 'disabled');
        this._readonly = dom.hasAttribute(this._node, 'readonly');

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
     * Destroy the SelectMenu.
     */
    destroy() {
        if (this._popper) {
            this._popper.destroy();
        }

        dom.removeAttribute(this._node, 'tabindex');
        dom.removeEvent(this._node, 'focus.frost.selectmenu');
        dom.removeClass(this._node, 'visually-hidden');
        dom.remove(this._menuNode);
        dom.remove(this._toggle);

        super.destroy();
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
            this._readonly ||
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

}
