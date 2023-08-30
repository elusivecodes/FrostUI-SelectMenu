import $ from '@fr0st/query';
import { BaseComponent, Popper } from '@fr0st/ui';

/**
 * SelectMenu Class
 * @class
 */
export default class SelectMenu extends BaseComponent {
    /**
     * New SelectMenu constructor.
     * @param {HTMLElement} node The input node.
     * @param {object} [options] The options to create the SelectMenu with.
     */
    constructor(node, options) {
        super(node, options);

        if (!$.is(this._node, 'select')) {
            throw new Error('SelectMenu must be created on a select element');
        }

        this._placeholderText = this._options.placeholder;
        this._maxSelections = this._options.maxSelections;
        this._multiple = $.getProperty(this._node, 'multiple');

        this._data = [];
        this._lookup = {};
        this._activeItems = [];

        this._getData = null;
        this._getResults = null;

        let data;
        if ($._isFunction(this._options.getResults)) {
            this._getResultsCallbackInit();
            this._getResultsInit();
        } else if ($._isPlainObject(this._options.data)) {
            data = this._getDataFromObject(this._options.data);
        } else if ($._isArray(this._options.data)) {
            data = this._options.data;
        } else {
            data = this._getDataFromDOM(this._node);
        }

        if (data) {
            this._data = this._parseData(data);
            this._lookup = this._parseDataLookup(data);
            this._getDataInit();
        }

        let value;
        if (this._multiple) {
            value = [...this._node.selectedOptions].map((option) => $.getValue(option));
        } else {
            value = $.getValue(this._node);
        }

        this._render();
        this._loadValue(value);
        this._events();
    }

    /**
     * Disable the SelectMenu.
     */
    disable() {
        $.setAttribute(this._node, { disabled: true });
        this._refreshDisabled();
    }

    /**
     * Dispose the SelectMenu.
     */
    dispose() {
        if (this._popper) {
            this._popper.dispose();
            this._popper = null;
        }

        $.removeAttribute(this._node, 'tabindex');
        $.removeEvent(this._node, 'focus.ui.selectmenu');
        $.removeClass(this._node, this.constructor.classes.hide);
        $.remove(this._menuNode);
        $.remove(this._toggle);

        this._toggle = null;
        this._clear = null;
        this._searchInput = null;
        this._placeholder = null;
        this._menuNode = null;
        this._itemsList = null;
        this._data = null;
        this._lookup = null;
        this._activeItems = null;
        this._value = null;
        this._requests = null;
        this._popperOptions = null;
        this._getData = null;
        this._getResults = null;

        super.dispose();
    }

    /**
     * Enable the SelectMenu.
     */
    enable() {
        $.removeAttribute(this._node, 'disabled');
        this._refreshDisabled();
    }

    /**
     * Hide the SelectMenu.
     */
    hide() {
        if (
            !$.isConnected(this._menuNode) ||
            $.getDataset(this._menuNode, 'uiAnimating') ||
            !$.triggerOne(this._node, 'hide.ui.selectmenu')
        ) {
            return;
        }

        $.setDataset(this._menuNode, { uiAnimating: 'out' });

        this._refreshPlaceholder();
        $.setValue(this._searchInput, '');

        $.fadeOut(this._menuNode, {
            duration: this._options.duration,
        }).then((_) => {
            this._popper.dispose();
            this._popper = null;

            this._activeItems = [];
            $.empty(this._itemsList);
            $.detach(this._menuNode);
            $.removeDataset(this._menuNode, 'uiAnimating');
            $.setAttribute(this._toggle, {
                'aria-expanded': false,
                'aria-activedescendent': '',
            });
            $.setAttribute(this._searchInput, { 'aria-activedescendent': '' });
            $.triggerEvent(this._node, 'hidden.ui.selectmenu');
        }).catch((_) => {
            if ($.getDataset(this._menuNode, 'uiAnimating') === 'out') {
                $.removeDataset(this._menuNode, 'uiAnimating');
            }
        });
    }

    /**
     * Show the SelectMenu.
     */
    show() {
        if (
            $.is(this._node, ':disabled') ||
            $.hasAttribute(this._node, 'readonly') ||
            $.isConnected(this._menuNode) ||
            $.getDataset(this._menuNode, 'uiAnimating') ||
            !$.triggerOne(this._node, 'show.ui.selectmenu')
        ) {
            return;
        }

        this._getData({});

        $.setDataset(this._menuNode, { uiAnimating: 'in' });

        if (this._options.appendTo) {
            $.append(this._options.appendTo, this._menuNode);
        } else {
            $.after(this._toggle, this._menuNode);
        }

        this._popper = new Popper(this._menuNode, this._popperOptions);

        $.fadeIn(this._menuNode, {
            duration: this._options.duration,
        }).then((_) => {
            $.removeDataset(this._menuNode, 'uiAnimating');
            $.setAttribute(this._toggle, { 'aria-expanded': true });
            $.triggerEvent(this._node, 'shown.ui.selectmenu');
        }).catch((_) => {
            if ($.getDataset(this._menuNode, 'uiAnimating') === 'in') {
                $.removeDataset(this._menuNode, 'uiAnimating');
            }
        });
    }

    /**
     * Toggle the SelectMenu.
     * @return {SelectMenu} The SelectMenu.
     */
    toggle() {
        return $.isConnected(this._menuNode) ?
            this.hide() :
            this.show();
    }

    /**
     * Update the SelectMenu position.
     * @return {SelectMenu} The SelectMenu.
     */
    update() {
        if (this._popper) {
            this._popper.update();
        }

        return this;
    }
}
