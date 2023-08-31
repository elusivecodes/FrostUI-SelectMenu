import $ from '@fr0st/query';
import { generateId } from '@fr0st/ui';

/**
 * Render the toggle element.
 */
export function _render() {
    this._renderPlaceholder();
    this._renderMenu();

    if (this._multiple) {
        this._renderToggleMulti();
    } else {
        if (this._options.allowClear) {
            this._renderClear();
        }

        this._renderToggleSingle();
    }

    if (this._options.getResults) {
        this._loader = this._renderInfo(this._options.lang.loading);
        this._error = this._renderInfo(this._options.lang.error);
    }

    this._popperOptions = {
        reference: this._toggle,
        placement: this._options.placement,
        position: this._options.position,
        fixed: this._options.fixed,
        spacing: this._options.spacing,
        minContact: this._options.minContact,
    };

    if (this._options.fullWidth) {
        this._popperOptions.beforeUpdate = (node) => {
            $.setStyle(node, { width: '' });
        };

        this._popperOptions.afterUpdate = (node, reference) => {
            const width = $.width(reference, { boxSize: $.BORDER_BOX });
            $.setStyle(node, 'width', width);
        };
    }

    if ($.hasAttribute(this._node, 'readonly')) {
        $.addClass(this._toggle, this.constructor.classes.readonly);
        $.setAttribute(this._toggle, { 'aria-readonly': true });
    }

    // hide the input node
    $.addClass(this._node, this.constructor.classes.hide);
    $.setAttribute(this._node, { tabindex: -1 });

    $.after(this._node, this._toggle);
};

/**
 * Render the clear button.
 */
export function _renderClear() {
    this._clear = $.create('span', {
        class: this.constructor.classes.clear,
        attributes: {
            'role': 'button',
            'aria-label': this._options.lang.clear,
        },
        dataset: {
            uiAction: 'clear',
        },
    });
};

/**
 * Render a group item.
 * @param {object} item The group item to render.
 * @return {HTMLElement} The group.
 */
export function _renderGroup(item) {
    const id = generateId('selectmenu-group');

    const data = this._cloneItem(item);

    const groupContainer = $.create('li', {
        attributes: {
            id,
            'role': 'group',
            'aria-label': this._options.getLabel(data),
        },
    });

    const element = $.create('div', {
        class: this.constructor.classes.group,
    });

    const content = this._options.renderResult.bind(this)(data, element);

    if ($._isString(content)) {
        $.setHTML(element, this._options.sanitize(content));
    } else if ($._isElement(content) && !$.isSame(element, content)) {
        $.append(element, content);
    }

    $.append(groupContainer, element);

    const childList = $.create('ul', {
        class: this.constructor.classes.groupContainer,
        attributes: {
            role: 'none',
        },
    });

    $.append(groupContainer, childList);

    for (const item of data.children) {
        const element = this._renderItem(item, childList);

        $.append(childList, element);
    }

    return groupContainer;
};

/**
 * Render an information item.
 * @param {string} text The text to render.
 * @return {HTMLElement} The information item.
 */
export function _renderInfo(text) {
    const element = $.create('li', {
        html: this._options.sanitize(text),
        class: this.constructor.classes.info,
    });

    return element;
};

/**
 * Render an item.
 * @param {object} item The item to render.
 * @return {HTMLElement} The item.
 */
export function _renderItem(item) {
    const id = generateId('selectmenu-item');

    const data = this._cloneItem(item);

    const value = this._options.getValue(data);
    const active = this._multiple ?
        this._value.some((otherValue) => otherValue == value) :
        value == this._value;

    const element = $.create('li', {
        class: this.constructor.classes.item,
        attributes: {
            id,
            'role': 'option',
            'aria-label': this._options.getLabel(item),
            'aria-selected': active,
        },
    });

    if (active) {
        $.addClass(element, this.constructor.classes.active);
        $.setDataset(element, { uiActive: true });
    }

    if (item.disabled) {
        $.addClass(element, this.constructor.classes.disabledItem);
        $.setAttribute(element, { 'aria-disabled': true });
    } else {
        this._activeItems.push(element);
        $.setDataset(element, {
            uiAction: 'select',
            uiValue: value,
        });
    }

    const content = this._options.renderResult.bind(this)(data, element);

    if ($._isString(content)) {
        $.setHTML(element, this._options.sanitize(content));
    } else if ($._isElement(content) && !$.isSame(element, content)) {
        $.append(element, content);
    }

    return element;
};

/**
 * Render the menu.
 */
export function _renderMenu() {
    this._menuNode = $.create('div', {
        class: this.constructor.classes.menu,
    });

    const id = generateId('selectmenu');

    if (!this._multiple) {
        // add search input for single select menus

        const searchOuter = $.create('div', {
            class: this.constructor.classes.searchOuter,
        });
        $.append(this._menuNode, searchOuter);

        const searchContainer = $.create('div', {
            class: this.constructor.classes.searchContainer,
        });
        $.append(searchOuter, searchContainer);

        this._searchInput = $.create('input', {
            class: this._options.searchInputStyle === 'filled' ?
                this.constructor.classes.searchInputFilled :
                this.constructor.classes.searchInputOutline,
            attributes: {
                'role': 'searchbox',
                'aria-autocomplete': 'list',
                'aria-controls': id,
                'aria-activedescendent': '',
                'aria-label': this._options.lang.search,
                'autocomplete': 'off',
            },
        });
        $.append(searchContainer, this._searchInput);

        if (this._options.searchInputStyle === 'filled') {
            const ripple = $.create('div', {
                class: this.constructor.classes.searchInputRipple,
            });
            $.append(searchContainer, ripple);
        }
    }

    this._itemsList = $.create('ul', {
        class: this.constructor.classes.items,
        style: { maxHeight: this._options.maxHeight },
        attributes: {
            id,
            role: 'listbox',
        },
    });

    if (this._multiple) {
        $.setAttribute(this._itemsList, { 'aria-multiselectable': true });
    }

    $.append(this._menuNode, this._itemsList);
};

/**
 * Render a multiple selection item.
 * @param {object} item The item to render.
 * @return {HTMLElement} The selection group.
 */
export function _renderMultiSelection(item) {
    const group = $.create('div', {
        class: this.constructor.classes.multiGroup,
    });

    const closeBtn = $.create('div', {
        class: this.constructor.classes.multiClear,
        attributes: {
            'role': 'button',
            'aria-label': this._options.lang.clear,
        },
        dataset: {
            uiAction: 'clear',
        },
    });

    $.append(group, closeBtn);

    const closeIcon = $.create('span', {
        class: this.constructor.classes.multiClearIcon,
    });

    $.append(closeBtn, closeIcon);

    const data = this._cloneItem(item);

    const element = $.create('div', {
        class: this.constructor.classes.multiItem,
    });

    const content = this._options.renderSelection.bind(this)(data, element);

    if ($._isString(content)) {
        $.setHTML(element, this._options.sanitize(content));
    } else if ($._isElement(content) && !$.isSame(element, content)) {
        $.append(element, content);
    }

    $.append(group, element);

    return group;
};

/**
 * Render the placeholder.
 */
export function _renderPlaceholder() {
    this._placeholder = $.create('span', {
        html: this._placeholderText ?
            this._options.sanitize(this._placeholderText) :
            '&nbsp;',
        class: this.constructor.classes.placeholder,
    });
};

/**
 * Render results.
 * @param {array} results The results to render.
 */
export function _renderResults(results) {
    if (!results.length) {
        const info = this._renderInfo(this._options.lang.noResults);
        $.append(this._itemsList, info);
        this.update();
        return;
    }

    for (const item of results) {
        const element = 'children' in item && $._isArray(item.children) ?
            this._renderGroup(item) :
            this._renderItem(item);

        $.append(this._itemsList, element);
    }

    const focusedNode = $.findOne('[data-ui-focus]', this._itemsList);

    if (focusedNode) {
        return;
    }

    let focusNode = $.findOne('[data-ui-active]', this._itemsList);

    if (!focusNode) {
        focusNode = $.findOne('[data-ui-action="select"]', this._itemsList);
    }

    if (focusNode) {
        $.addClass(focusNode, this.constructor.classes.focus);
        $.setDataset(focusNode, { uiFocus: true });

        const id = $.getAttribute(focusNode, 'id');
        $.setAttribute(this._toggle, { 'aria-activedescendent': id });
        $.setAttribute(this._searchInput, { 'aria-activedescendent': id });
    }
};

/**
 * Render the multiple toggle element.
 */
export function _renderToggleMulti() {
    const id = $.getAttribute(this._itemsList, 'id');

    this._toggle = $.create('div', {
        class: [
            $.getAttribute(this._node, 'class') || '',
            this.constructor.classes.multiToggle,
        ],
        attributes: {
            'role': 'combobox',
            'aria-haspopup': 'listbox',
            'aria-expanded': false,
            'aria-disabled': false,
            'aria-controls': id,
            'aria-activedescendent': '',
        },
    });

    this._searchInput = $.create('input', {
        class: this.constructor.classes.multiSearchInput,
        attributes: {
            'role': 'searchbox',
            'aria-autocomplete': 'list',
            'aria-label': this._options.lang.search,
            'aria-describedby': id,
            'aria-activedescendent': '',
            'autocomplete': 'off',
        },
    });
};

/**
 * Render the single toggle element.
 */
export function _renderToggleSingle() {
    const id = $.getAttribute(this._itemsList, 'id');

    this._toggle = $.create('button', {
        class: [
            $.getAttribute(this._node, 'class') || '',
            this.constructor.classes.toggle,
        ],
        attributes: {
            'type': 'button',
            'role': 'combobox',
            'aria-haspopup': 'listbox',
            'aria-expanded': false,
            'aria-disabled': false,
            'aria-controls': id,
            'aria-activedescendent': '',
        },
    });
};
