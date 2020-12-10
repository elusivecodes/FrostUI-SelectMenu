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
