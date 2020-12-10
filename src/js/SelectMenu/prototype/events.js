/**
 * SelectMenu Events
 */

Object.assign(SelectMenu.prototype, {

    /**
     * Attach events for the SelectMenu.
     */
    _events() {
        dom.addEvent(this._node, 'focus.frost.selectmenu', _ => {
            if (this._disabled) {
                return;
            }

            if (this._multiple) {
                dom.focus(this._searchInput);
            } else {
                dom.focus(this._toggle);
            }
        });

        dom.addEvent(this._menuNode, 'mousedown.frost.selectmenu', e => {
            // prevent search input from triggering blur event
            e.preventDefault();
        });

        dom.addEventDelegate(this._itemsList, 'mouseup.frost.selectmenu', '[data-action="select"]', e => {
            e.preventDefault();

            const value = dom.getDataset(e.currentTarget, 'value');
            this._selectValue(value);
        });

        dom.addEventDelegate(this._itemsList, 'mouseover.frost.selectmenu', '.selectmenu-action:not(.disabled)', e => {
            const focusedNode = dom.findOne('.selectmenu-focus', this._itemsList);
            dom.removeClass(focusedNode, 'selectmenu-focus');
            dom.addClass(e.currentTarget, 'selectmenu-focus');
        });

        dom.addEvent(this._searchInput, 'keydown.frost.selectmenu', e => {
            if (!['ArrowDown', 'ArrowUp', 'Backspace', 'Enter', 'Escape'].includes(e.key)) {
                return;
            }

            if (e.key === 'Backspace') {
                if (this._multiple && this._value.length && !dom.getValue(this._searchInput)) {
                    e.preventDefault();

                    // remove the last selected item and populate the search input with it's value
                    const lastValue = this._value.pop();
                    const lastItem = this._findValue(lastValue);

                    this._refreshMulti();
                    dom.setValue(this._searchInput, lastItem.text);
                    dom.focus(this._searchInput);
                    this._updateSearchWidth();

                    // trigger input
                    dom.triggerEvent(this._searchInput, 'input.frost.selectmenu');
                }

                return;
            }

            if (this._multiple && !dom.isConnected(this._menuNode) && ['ArrowDown', 'ArrowUp', 'Enter'].includes(e.key)) {
                return this.show();
            }

            if (e.key === 'Escape') {
                // close the menu
                dom.blur(this._searchInput);

                if (this._multiple) {
                    dom.focus(this._searchInput);
                } else {
                    dom.focus(this._toggle);
                }

                return;
            }

            const focusedNode = dom.findOne('.selectmenu-focus', this._itemsList);

            if (e.key === 'Enter') {
                // select the focused item
                if (focusedNode) {
                    const value = dom.getDataset(focusedNode, 'value');
                    this._selectValue(value);
                }

                return;
            }

            // focus the previous/next item

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

            if (focusNode) {
                dom.removeClass(focusedNode, 'selectmenu-focus');
                dom.addClass(focusNode, 'selectmenu-focus');
            }
        });

        dom.addEvent(this._searchInput, 'input.frost.selectmenu', _ => {
            if (this._multiple) {
                this._updateSearchWidth();
            }

            const term = dom.getValue(this._searchInput);

            // check for minimum search length
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
            // infinite scrolling event
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

    /**
     * Attach events for a multiple SelectMenu.
     */
    _eventsMulti() {
        dom.addEvent(this._searchInput, 'focus.frost.selectmenu', _ => {
            dom.hide(this._placeholder);
            dom.detach(this._placeholder);
            dom.addClass(this._toggle, 'focus');
        });

        dom.addEvent(this._searchInput, 'blur.frost.selectmenu', _ => {
            if (dom.hasDataset(this._toggle, 'preFocus')) {
                // prevent losing focus when toggle element is focused
                return;
            }

            dom.removeClass(this._toggle, 'focus');
            this.hide();
        });

        dom.addEvent(this._toggle, 'mousedown.frost.selectmenu', _ => {
            if (dom.hasClass(this._toggle, 'focus')) {
                // maintain focus when toggle element is already focused
                dom.setDataset(this._toggle, 'preFocus', true);
            } else {
                dom.hide(this._placeholder);
                dom.addClass(this._toggle, 'focus');
            }

            this.show();

            dom.addEventOnce(window, 'mouseup.frost.selectmenu', _ => {
                if (dom.hasDataset(this._toggle, 'preFocus')) {
                    dom.removeDataset(this._toggle, 'preFocus');
                }

                dom.focus(this._searchInput);
            });
        });

        dom.addEventDelegate(this._toggle, 'click.frost.selectmenu', '[data-action="clear"]', e => {
            e.preventDefault();

            // remove selection
            const element = dom.parent(e.currentTarget);
            const index = dom.index(element);
            this._value.splice(index, 1)
            this._setValue(this._value);
            dom.focus(this._searchInput);
        });
    },

    /**
     * Attach events for a single SelectMenu.
     */
    _eventsSingle() {
        dom.addEvent(this._searchInput, 'blur.frost.selectmenu', _ => {
            this.hide();
        });

        dom.addEvent(this._toggle, 'mousedown.frost.selectmenu', _ => {
            if (dom.isConnected(this._menuNode)) {
                this.hide();
            } else {
                this.show();

                dom.addEventOnce(window, 'mouseup.frost.selectmenu', _ => {
                    // focus search input when mouse is released
                    dom.focus(this._searchInput);
                });
            }
        });

        dom.addEvent(this._toggle, 'keydown.frost.selectmenu', e => {
            if (!/^.$/u.test(e.key)) {
                return;
            }

            this.show();
            dom.focus(this._searchInput);
        });

        if (this._settings.allowClear) {
            dom.addEventDelegate(this._toggle, 'click.frost.selectmenu', '[data-action="clear"]', _ => {
                // remove selection
                this._setValue(null);
            });
        }
    }

});
