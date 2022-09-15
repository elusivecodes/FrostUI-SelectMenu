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
        dom.addClass(this._node, this.constructor.classes.hide);
        dom.setAttribute(this._node, 'tabindex', '-1');

        dom.after(this._node, this._toggle);
    },

    /**
     * Render the clear button.
     */
    _renderClear() {
        this._clear = dom.create('button', {
            class: this.constructor.classes.clear,
            attributes: {
                type: 'button'
            },
            dataset: {
                uiAction: 'clear'
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
            class: this.constructor.classes.group
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
            class: this.constructor.classes.info,
            attributes: {
                type: 'button'
            }
        });
        dom.append(this._itemsList, element);
        this.update();
        return element;
    },

    /**
     * Render an item.
     * @param {object} item The item to render.
     * @returns {HTMLElement} The item element.
     */
    _renderItem(item) {
        const active =
            (
                this._multiple &&
                this._value.some(value => value == item.value)
            ) || (
                !this._multiple &&
                item.value == this._value
            );

        const { option, ...data } = item;

        const element = dom.create('div', {
            html: this._settings.sanitize(
                this._settings.renderResult(data, active)
            ),
            class: this.constructor.classes.item
        });

        if (active) {
            dom.addClass(element, this.constructor.classes.active);
            dom.setDataset(element, 'uiActive', true);
        }

        if (item.disabled) {
            dom.addClass(element, this.constructor.classes.disabledItem);
        } else {
            dom.addClass(element, this.constructor.classes.action)
            dom.setDataset(element, {
                uiAction: 'select',
                uiValue: item.value
            });
        }

        return element;
    },

    /**
     * Render the menu.
     */
    _renderMenu() {
        this._menuNode = dom.create('div', {
            class: this.constructor.classes.menu
        });

        if (!this._multiple) {
            // add search input for single select menus

            const searchOuter = dom.create('div', {
                class: this.constructor.classes.searchOuter
            });
            dom.append(this._menuNode, searchOuter);

            const searchContainer = dom.create('div', {
                class: this.constructor.classes.searchContainer
            });
            dom.append(searchOuter, searchContainer);

            this._searchInput = dom.create('input', {
                class: this._settings.searchInputStyle === 'filled' ?
                    this.constructor.classes.searchInputFilled :
                    this.constructor.classes.searchInputOutline,
                attributes: {
                    autocomplete: 'off'
                }
            });
            dom.append(searchContainer, this._searchInput);

            if (this._settings.searchInputStyle === 'filled') {
                const ripple = dom.create('div', {
                    class: this.constructor.classes.searchInputRipple
                });
                dom.append(searchContainer, ripple);
            }
        }

        this._itemsList = dom.create('div', {
            class: this.constructor.classes.items
        });
        dom.append(this._menuNode, this._itemsList);

        this._popperOptions = {
            reference: this._toggle,
            placement: this._settings.placement,
            position: this._settings.position,
            fixed: this._settings.fixed,
            spacing: this._settings.spacing,
            minContact: this._settings.minContact
        };

        if (this._settings.fullWidth) {
            this._popperOptions.afterUpdate = (node, reference) => {
                const width = dom.width(reference, DOM.BORDER_BOX);
                dom.setStyle(node, 'width', width);
            };

            this._popperOptions.beforeUpdate = node => {
                dom.setStyle(node, 'width', '');
            };
        }
    },

    /**
     * Render a multiple selection item.
     * @param {object} item The item to render.
     * @returns {HTMLElement} The selection element.
     */
    _renderMultiSelection(item) {
        const group = dom.create('div', {
            class: this.constructor.classes.multiGroup
        });

        const close = dom.create('div', {
            html: `<span class="${this.constructor.classes.multiClearIcon}"></span>`,
            class: this.constructor.classes.multiClear,
            dataset: {
                uiAction: 'clear'
            }
        });
        dom.append(group, close);

        const { option, ...data } = item;

        const content = this._settings.renderSelection(data);
        const tag = dom.create('div', {
            html: this._settings.sanitize(content),
            class: this.constructor.classes.multiItem
        });
        dom.append(group, tag);

        return group;
    },

    /**
     * Render the placeholder.
     */
    _renderPlaceholder() {
        this._placeholder = dom.create('span', {
            html: this._placeholderText ?
                this._settings.sanitize(this._placeholderText) :
                '&nbsp;',
            class: this.constructor.classes.placeholder
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

        const focusedNode = dom.findOne('[data-ui-focus]', this._itemsList);

        if (focusedNode) {
            return;
        }

        let focusNode = dom.findOne('[data-ui-active]', this._itemsList);

        if (!focusNode) {
            focusNode = dom.findOne('[data-ui-action="select"]', this._itemsList);
        }

        if (focusNode) {
            dom.addClass(focusNode, this.constructor.classes.focus);
            dom.setDataset(focusNode, 'uiFocus', true);
        }
    },

    /**
     * Render the single toggle element.
     */
    _renderToggleSingle() {
        this._toggle = dom.create('button', {
            class: [
                dom.getAttribute(this._node, 'class') || '',
                this.constructor.classes.toggle
            ],
            attributes: {
                type: 'button'
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
                this.constructor.classes.multiToggle
            ]
        });

        this._searchInput = dom.create('input', {
            class: this.constructor.classes.multiSearchInput,
            attributes: {
                autocomplete: 'off'
            }
        });
    }

});
