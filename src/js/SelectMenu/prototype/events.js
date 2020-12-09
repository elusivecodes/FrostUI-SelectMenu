Object.assign(SelectMenu.prototype, {

    _events() {
        dom.addEventDelegate(this._itemsList, 'click.frost.selectmenu', '[data-action="select"]', e => {
            e.preventDefault();

            let value = dom.getDataset(e.currentTarget, 'value');

            const item = this._findValue(value);

            value = item.value;

            if (this._multiple) {
                const index = this._value.indexOf(value);
                if (index >= 0) {
                    this._value.splice(index, 1)
                    value = this._value;
                } else {
                    value = this._value.concat([value]);
                }
            }

            this._setValue(value);

            if (this._settings.closeOnSelect) {
                this.hide();
            } else {
                this._getData({});
            }

            this._refreshPlaceholder();

            dom.setValue(this._searchInput, '');

            if (this._multiple) {
                dom.focus(this._searchInput);
            } else {
                dom.focus(this._toggle);
            }
        });

        dom.addEventDelegate(this._itemsList, 'mouseover.frost.selectmenu', '.selectmenu-action:not(.disabled)', e => {
            const focusedNode = dom.findOne('.selectmenu-focus', this._itemsList);
            dom.removeClass(focusedNode, 'selectmenu-focus');
            dom.addClass(e.currentTarget, 'selectmenu-focus');
        });

        dom.addEvent(this._searchInput, 'keydown.frost.selectmenu', e => {
            if (e.key === 'Backspace' && this._multiple && !dom.getValue(this._searchInput)) {
                const lastValue = this._value.pop();

                if (!lastValue) {
                    return;
                }

                e.preventDefault();

                this._refreshMulti();
                const lastItem = this._findValue(lastValue);
                dom.setValue(this._searchInput, lastItem.text);
                this._updateSearchWidth();
                dom.focus(this._searchInput);
                dom.triggerEvent(this._searchInput, 'input.frost.selectmenu');
                return;
            }

            if (e.key === 'Escape') {
                dom.blur(this._searchInput);

                if (this._multiple) {
                    dom.focus(this._searchInput);
                } else {
                    dom.focus(this._toggle);
                }

                return;
            }

            if (!['ArrowDown', 'ArrowUp', 'Enter'].includes(e.key)) {
                return;
            }

            e.preventDefault();

            if (this._multiple && !dom.isConnected(this._menuNode)) {
                return this.show();
            }

            const focusedNode = dom.findOne('.selectmenu-focus', this._itemsList);

            if (e.key === 'Enter') {
                return dom.click(focusedNode);
            }

            let focusNode;

            if (!focusedNode) {
                focusNode = dom.findOne('.selectmenu-action:not(.disabled)', this._itemsList);
            } else {
                switch (e.key) {
                    case 'ArrowDown':
                        focusNode = dom.nextAll(focusedNode, '.selectmenu-action:not(.disabled)').shift();
                        break;
                    case 'ArrowUp':
                        focusNode = dom.prevAll(focusedNode, '.selectmenu-action:not(.disabled)').pop();
                        break;
                }
            }

            if (!focusNode) {
                return;
            }

            dom.removeClass(focusedNode, 'selectmenu-focus');
            dom.addClass(focusNode, 'selectmenu-focus');
        });

        dom.addEvent(this._searchInput, 'input.frost.selectmenu', _ => {
            if (this._multiple) {
                this._updateSearchWidth();
            }

            const term = dom.getValue(this._searchInput);

            if (term.length < this._settings.minSearch) {
                return;
            }

            if (this._multiple) {
                this.show();
            }

            dom.empty(this._itemsList);
            this._getData({ term });
        });

        if (this._settings.getResults) {
            dom.addEvent(this._itemsList, 'scroll.frost.selectmenu', _ => {
                if (this._request || !this._showMore) {
                    return;
                }

                const height = dom.height(this._itemsList);
                const scrollHeight = dom.height(this._itemsList, DOM.SCROLL_BOX);
                const scrollTop = dom.getScrollY(this._itemsList);

                if (scrollTop >= scrollHeight - height - 50) {
                    const term = dom.getValue(this._searchInput);
                    const offset = this._data.length;

                    this._getData({ term, offset });
                }
            });
        }

        if (this._multiple) {
            this._eventsMulti()
        } else {
            this._eventsSingle();
        }
    },

    _eventsMulti() {
        dom.addEvent(this._node, 'focus.frost.selectmenu', _ => {
            dom.focus(this._searchInput);
        });

        dom.addEvent(this._searchInput, 'focus.frost.selectmenu', _ => {
            dom.hide(this._placeholder);
            dom.detach(this._placeholder);
            dom.addClass(this._toggle, 'focus');
        });

        dom.addEvent(this._searchInput, 'blur.frost.selectmenu', _ => {
            if (dom.getDataset(this._toggle, 'preFocus')) {
                return;
            }

            this._refreshPlaceholder();
            dom.setValue(this._searchInput, '');
            dom.removeClass(this._toggle, 'focus');
            this.hide();
        });

        dom.addEvent(this._toggle, 'mousedown.frost.selectmenu', _ => {
            if (dom.hasClass(this._toggle, 'focus')) {
                dom.setDataset(this._toggle, 'preFocus', true);
            } else {
                dom.hide(this._placeholder);
                dom.addClass(this._toggle, 'focus');
            }
            this.show();
            dom.addEventOnce(window, 'mouseup.frost.selectmenu', _ => {
                dom.removeDataset(this._toggle, 'preFocus');
                dom.focus(this._searchInput);
            });
        });

        // remove selection
        dom.addEventDelegate(this._toggle, 'click.frost.selectmenu', '[data-action="clear"]', e => {
            e.preventDefault();

            const element = dom.parent(e.currentTarget);
            const index = dom.index(element);
            this._value.splice(index, 1)
            this.setValue(this._value);
            dom.focus(this._searchInput);
        });
    },

    _eventsSingle() {
        dom.addEvent(this._node, 'focus.frost.selectmenu', _ => {
            dom.focus(this._toggle);
        });

        dom.addEvent(this._searchInput, 'blur.frost.selectmenu', _ => {
            this.hide();
        });

        dom.addEvent(this._toggle, 'mousedown.frost.selectmenu', _ => {
            if (dom.isConnected(this._menuNode)) {
                this.hide();
            } else {
                this.show();
                dom.addEventOnce(window, 'mouseup.frost.selectmenu', _ => {
                    dom.focus(this._searchInput);
                });
            }
        });

        dom.addEvent(this._toggle, 'keydown.frost.selectmenu', _ => {
            this.show();
            dom.focus(this._searchInput);
        });

        // remove selection
        if (this._settings.allowClear) {
            dom.addEventDelegate(this._toggle, 'click.frost.selectmenu', '[data-action="clear"]', e => {
                this.setValue(null);
            });
        }
    }

});
