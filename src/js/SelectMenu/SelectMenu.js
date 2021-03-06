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

        let value;
        if (this._multiple) {
            value = [...this._node.selectedOptions].map(option => dom.getValue(option));
        } else {
            value = dom.getValue(this._node);
        }

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
        this._popperOptions = null;

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
            this._popper.dispose();
            this._popper = null;

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

        this._animating = true;

        if (this._settings.appendTo) {
            dom.append(this._settings.appendTo, this._menuNode);
        } else {
            dom.after(this._toggle, this._menuNode);
        }

        this._popper = new UI.Popper(this._menuNode, this._popperOptions);

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
        if (this._popper) {
            this._popper.update();
        }

        return this;
    }

}
