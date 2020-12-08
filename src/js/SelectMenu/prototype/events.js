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

            this.setValue(value);

            if (this._settings.closeOnSelect) {
                this.hide();
            } else {
                this._getData({});
            }

            this._refreshPlaceholder();

            dom.setValue(this._searchInput, '');
            dom.focus(this._searchInput);
        });

        dom.addEvent(this._searchInput, 'input.frost.selectmenu', _ => {
            if (this._multiple) {
                this._updateSearchWidth();
            }

            let term = dom.getValue(this._searchInput);

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
            dom.addEvent(this._menuNode, 'scroll.frost.selectmenu', _ => {
                if (this._request || !this._showMore) {
                    return;
                }

                const height = dom.height(this._menuNode);
                const scrollHeight = dom.height(this._menuNode, DOM.SCROLL_BOX);
                const scrollTop = dom.getScrollY(this._menuNode);

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
            this._refreshPlaceholder();
            dom.removeClass(this._toggle, 'focus');
        });

        dom.addEvent(this._toggle, 'mousedown.frost.selectmenu', _ => {
            dom.addClass(this._toggle, 'focus');

            dom.addEventOnce(window, 'mouseup.frost.selectmenu', _ => {
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
