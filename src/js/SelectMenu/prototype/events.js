/**
 * SelectMenu Events
 */

Object.assign(SelectMenu.prototype, {

    /**
     * Attach events for the SelectMenu.
     */
    _events() {
        dom.addEvent(this._node, 'focus.ui.selectmenu', _ => {
            if (this._multiple) {
                dom.focus(this._searchInput);
            } else {
                dom.focus(this._toggle);
            }
        });

        dom.addEvent(this._menuNode, 'mousedown.ui.selectmenu', e => {
            if (dom.isSame(this._searchInput, e.target)) {
                return;
            }

            // prevent search input from triggering blur event
            e.preventDefault();
        });

        dom.addEventDelegate(this._menuNode, 'contextmenu.ui.selectmenu', '[data-ui-action="select"]', e => {
            // prevent menu node from showing right click menu
            e.preventDefault();
        });

        dom.addEventDelegate(this._itemsList, 'mouseup.ui.selectmenu', '[data-ui-action="select"]', e => {
            e.preventDefault();

            const value = dom.getDataset(e.currentTarget, 'uiValue');
            this._selectValue(value);
        });

        dom.addEventDelegate(this._itemsList, 'mouseover.ui.selectmenu', '[data-ui-action="select"]', DOM.debounce(e => {
            const focusedNode = dom.find('[data-ui-focus]', this._itemsList);
            dom.removeClass(focusedNode, this.constructor.classes.focus);
            dom.removeDataset(focusedNode, 'uiFocus');
            dom.addClass(e.currentTarget, this.constructor.classes.focus);
            dom.setDataset(e.currentTarget, 'uiFocus', true);
        }));

        dom.addEvent(this._searchInput, 'keydown.ui.selectmenu', e => {
            if (!['ArrowDown', 'ArrowUp', 'Backspace', 'Enter', 'Escape'].includes(e.code)) {
                return;
            }

            if (e.code === 'Backspace') {
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
                    dom.triggerEvent(this._searchInput, 'input.ui.selectmenu');
                }

                return;
            }

            if (this._multiple && !dom.isConnected(this._menuNode) && ['ArrowDown', 'ArrowUp', 'Enter'].includes(e.code)) {
                return this.show();
            }

            if (e.code === 'Escape') {
                // close the menu
                dom.blur(this._searchInput);

                if (this._multiple) {
                    dom.focus(this._searchInput);
                } else {
                    dom.focus(this._toggle);
                }

                return;
            }

            const focusedNode = dom.findOne('[data-ui-focus]', this._itemsList);

            if (e.code === 'Enter') {
                // select the focused item
                if (focusedNode) {
                    const value = dom.getDataset(focusedNode, 'uiValue');
                    this._selectValue(value);
                }

                return;
            }

            // focus the previous/next item

            let focusNode;
            if (!focusedNode) {
                focusNode = dom.findOne('[data-ui-action="select"]', this._itemsList);
            } else {
                switch (e.code) {
                    case 'ArrowDown':
                        focusNode = dom.nextAll(focusedNode, '[data-ui-action="select"]').shift();
                        break;
                    case 'ArrowUp':
                        focusNode = dom.prevAll(focusedNode, '[data-ui-action="select"]').pop();
                        break;
                }
            }

            if (focusNode) {
                dom.removeClass(focusedNode, this.constructor.classes.focus);
                dom.removeDataset(focusedNode, 'uiFocus');
                dom.addClass(focusNode, this.constructor.classes.focus);
                dom.setDataset(focusNode, 'uiFocus', true);
            }
        });

        // debounced input event
        const getDataDebounced = Core.debounce(term => {
            dom.empty(this._itemsList);
            this._getData({ term });
        }, this._settings.debounceInput);

        dom.addEvent(this._searchInput, 'input.ui.selectmenu', DOM.debounce(_ => {
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

            getDataDebounced(term);
        }));

        if (this._settings.getResults) {
            // infinite scrolling event
            dom.addEvent(this._itemsList, 'scroll.ui.selectmenu', Core.throttle(_ => {
                if (this._request || !this._showMore) {
                    return;
                }

                const height = dom.height(this._itemsList);
                const scrollHeight = dom.height(this._itemsList, DOM.SCROLL_BOX);
                const scrollTop = dom.getScrollY(this._itemsList);

                if (scrollTop >= scrollHeight - height - (height / 4)) {
                    const term = dom.getValue(this._searchInput);
                    const offset = this._data.length;

                    this._getData({ term, offset });
                }
            }, 250, false));
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
        dom.addEvent(this._searchInput, 'focus.ui.selectmenu', _ => {
            dom.hide(this._placeholder);
            dom.detach(this._placeholder);
            dom.addClass(this._toggle, 'focus');
        });

        let keepFocus = false;
        dom.addEvent(this._searchInput, 'blur.ui.selectmenu', _ => {
            if (keepFocus) {
                // prevent losing focus when toggle element is focused
                return;
            }

            dom.removeClass(this._toggle, 'focus');
            if (dom.isConnected(this._menuNode)) {
                this.hide();
            } else {
                this._refreshPlaceholder();
            }
        });

        dom.addEvent(this._toggle, 'mousedown.ui.selectmenu', e => {
            if (dom.hasClass(this._toggle, 'focus')) {
                // maintain focus when toggle element is already focused
                keepFocus = true;
            } else {
                dom.hide(this._placeholder);
                dom.addClass(this._toggle, 'focus');
            }

            if (!e.button) {
                this.show();
            }

            dom.focus(this._searchInput);
            dom.addEventOnce(window, 'mouseup.ui.selectmenu', _ => {
                keepFocus = false;
                dom.focus(this._searchInput);
            });
        });

        dom.addEventDelegate(this._toggle, 'mouseup.ui.selectmenu', '[data-ui-action="clear"]', e => {
            if (e.button) {
                return;
            }

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
        dom.addEvent(this._searchInput, 'blur.ui.selectmenu', _ => {
            this.hide();
        });

        dom.addEvent(this._toggle, 'mousedown.ui.selectmenu', e => {
            if (e.button) {
                return;
            }

            if (dom.isConnected(this._menuNode)) {
                this.hide();
            } else {
                this.show();

                dom.addEventOnce(window, 'mouseup.ui.selectmenu', _ => {
                    // focus search input when mouse is released
                    dom.focus(this._searchInput);
                });
            }
        });

        dom.addEvent(this._toggle, 'keydown.ui.selectmenu', e => {
            if (!/^.$/u.test(e.key)) {
                return;
            }

            this.show();
            dom.focus(this._searchInput);
        });

        if (this._settings.allowClear) {
            dom.addEventDelegate(this._toggle, 'mouseup.ui.selectmenu', '[data-ui-action="clear"]', e => {
                if (e.button) {
                    return;
                }

                // remove selection
                this._setValue(null);
            });
        }
    }

});
