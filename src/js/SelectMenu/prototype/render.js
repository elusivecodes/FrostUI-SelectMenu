Object.assign(SelectMenu.prototype, {

    _render() {
        if (this._multiple) {
            this._renderSelectMulti();
        } else {
            if (this._settings.allowClear) {
                this._renderClear();
            }

            this._renderSelect();
        }

        this._renderPlaceholder();
        this._renderMenu();

        dom.addClass(this._node, 'visually-hidden');
        dom.after(this._node, this._toggle);
    },

    _renderClear() {
        this._clear = dom.create('button', {
            html: '<small class="icon-cancel"></small>',
            class: 'close float-end me-5 lh-base',
            dataset: {
                action: 'clear'
            }
        });
    },

    _renderInfo(text) {
        const element = dom.create('button', {
            html: this._settings.sanitize(text),
            class: 'selectmenu-item text-secondary'
        });
        dom.append(this._itemsList, element);
        this.update();
        return element;
    },

    _renderItem(item) {
        const active =
            (
                this._multiple &&
                this._value.includes(item.value)
            ) || (
                !this._multiple &&
                item.value == this._value
            );

        const { option, ...data } = item;

        const element = dom.create('div', {
            html: this._settings.sanitize(
                this._settings.renderResult(data, active)
            ),
            class: 'selectmenu-item selectmenu-action',
            dataset: {
                action: 'select',
                value: item.value
            }
        });

        if (active) {
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

        this._itemsList = dom.create('div', {
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

        const close = dom.create('div', {
            html: '<small class="icon-cancel"></small>',
            class: 'btn btn-sm btn-outline-secondary',
            dataset: {
                action: 'clear'
            }
        });
        dom.append(group, close);

        const content = this._settings.renderSelection(item);
        const tag = dom.create('div', {
            html: this._settings.sanitize(content),
            class: 'btn btn-sm btn-secondary'
        });
        dom.append(group, tag);

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
            return this._renderInfo(this._settings.lang.noResults);
        }

        for (const item of results) {
            const element = item.children ?
                this._renderGroup(item) :
                this._renderItem(item);
            dom.append(this._itemsList, element);
        }

        let focusNode = dom.findOne('.selectmenu-action.active', this._itemsList);

        if (!focusNode) {
            focusNode = dom.findOne('.selectmenu-action:not(.disabled)', this._itemsList);
        }

        if (focusNode) {
            dom.addClass(focusNode, 'selectmenu-focus');
        }
    },

    _renderSelectMulti() {
        this._toggle = dom.create('div', {
            class: [
                dom.getAttribute(this._node, 'class') || '',
                'selectmenu-multi d-flex flex-wrap position-relative text-start'
            ],
            dataset: {
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
                'selectmenu-toggle position-relative text-start'
            ],
            dataset: {
                target: '#' + dom.getAttribute(this._node, 'id')
            }
        });
    }

});
