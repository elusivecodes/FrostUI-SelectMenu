Object.assign(SelectMenu.prototype, {

    _render() {
        if (this._multiple) {
            this._renderSelectMulti();
        } else {
            this._renderSelect();
        }
        this._renderPlaceholder();
        this._renderMenu();
        dom.hide(this._node);
        dom.after(this._node, this._toggle);
    },

    _renderItem(item) {
        const element = dom.create('li', {
            html: this._settings.sanitize(
                this._settings.renderResult(item)
            ),
            class: 'selectmenu-item selectmenu-action',
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

        this._itemsList = dom.create('ul', {
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
        this._placeholder = dom.create('span', {
            html: this._settings.sanitize(this._settings.placeholder),
            class: 'selectmenu-placeholder'
        });
    },

    _renderResults(results) {
        if (!results.length) {
            const noResults = dom.create('li', {
                html: this._settings.sanitize(
                    this._settings.lang.noResults
                ),
                class: 'selectmenu-item'
            });
            dom.append(this._itemsList, noResults);
            return;
        }

        for (const item of results) {
            const element = item.children ?
                this._renderGroup(item) :
                this._renderItem(item);
            dom.append(this._itemsList, element);
        }
    },

    _renderSelectMulti() {
        this._toggle = dom.create('div', {
            class: [
                dom.getAttribute(this._node, 'class') || '',
                'selectmenu-multi d-flex flex-wrap position-relative text-left'
            ],
            dataset: {
                toggle: 'selectmenu',
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
                'selectmenu-toggle position-relative text-left'
            ],
            dataset: {
                toggle: 'selectmenu',
                target: '#' + dom.getAttribute(this._node, 'id')
            }
        });
    }

});
