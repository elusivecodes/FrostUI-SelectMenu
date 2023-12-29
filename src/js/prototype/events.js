import $ from '@fr0st/query';

/**
 * Attach events for the SelectMenu.
 */
export function _events() {
    $.addEvent(this._itemsList, 'contextmenu.ui.selectmenu', (e) => {
        // prevent menu node from showing right click menu
        e.preventDefault();
    });

    $.addEvent(this._menuNode, 'mousedown.ui.selectmenu', (e) => {
        if ($.isSame(this._searchInput, e.target)) {
            return;
        }

        // prevent search input from triggering blur event
        e.preventDefault();
    });

    $.addEvent(this._menuNode, 'click.ui.selectmenu', (e) => {
        // prevent menu node from closing modal
        e.stopPropagation();
    });

    $.addEvent(this._node, 'focus.ui.selectmenu', (_) => {
        if (!$.isSame(this._node, document.activeElement)) {
            return;
        }

        if (this._multiple) {
            $.focus(this._searchInput);
        } else {
            $.focus(this._toggle);
        }
    });

    $.addEventDelegate(this._itemsList, 'click.ui.selectmenu', '[data-ui-action="select"]', (e) => {
        e.preventDefault();

        if (this._multiple) {
            $.setDataset(this._searchInput, { uiKeepFocus: true });
        }

        const value = $.getDataset(e.currentTarget, 'uiValue');
        this._selectValue(value);

        if (this._multiple) {
            $.removeDataset(this._searchInput, 'uiKeepFocus');
        }
    });

    $.addEventDelegate(this._itemsList, 'mouseover.ui.selectmenu', '[data-ui-action="select"]', $.debounce((e) => {
        const focusedNode = $.findOne('[data-ui-focus]', this._itemsList);
        $.removeClass(focusedNode, this.constructor.classes.focus);
        $.removeDataset(focusedNode, 'uiFocus');

        $.addClass(e.currentTarget, this.constructor.classes.focus);
        $.setDataset(e.currentTarget, { uiFocus: true });

        const id = $.getAttribute(e.currentTarget, 'id');
        $.setAttribute(this._toggle, { 'aria-activedescendent': id });
        $.setAttribute(this._searchInput, { 'aria-activedescendent': id });
    }));

    $.addEvent(this._searchInput, 'input.ui.selectmenu', $.debounce((_) => {
        if (this._multiple) {
            this._updateSearchWidth();
        }

        if (this._multiple && !$.isConnected(this._menuNode)) {
            this.show();
        } else {
            const term = $.getValue(this._searchInput);
            this._getData({ term });
        }
    }));

    $.addEvent(this._searchInput, 'keydown.ui.selectmenu', (e) => {
        if (e.code === 'Backspace') {
            if (this._multiple && this._value.length && !$.getValue(this._searchInput)) {
                e.preventDefault();

                // remove the last selected item and populate the search input with it's value
                const lastValue = this._value.pop();
                const lastItem = this._findValue(lastValue);
                const lastLabel = lastItem.text;

                if (this._multiple) {
                    $.setDataset(this._searchInput, { uiKeepFocus: true });
                }

                this._refreshMulti();
                $.setValue(this._searchInput, lastLabel);
                $.focus(this._searchInput);
                this._updateSearchWidth();

                // trigger input
                $.triggerEvent(this._searchInput, 'input.ui.selectmenu');

                if (this._multiple) {
                    $.removeDataset(this._searchInput, 'uiKeepFocus');
                }
            }

            return;
        }

        if (e.code === 'Escape' && $.isConnected(this._menuNode)) {
            e.stopPropagation();

            // close the menu
            this.hide();

            if (this._multiple) {
                $.blur(this._searchInput);
                $.focus(this._searchInput);
            } else {
                $.focus(this._toggle);
            }

            return;
        }

        if (!['ArrowDown', 'ArrowUp', 'Enter', 'NumpadEnter'].includes(e.code)) {
            return;
        }

        if (this._multiple && !$.isConnected(this._menuNode)) {
            this.show();
            return;
        }

        const focusedNode = $.findOne('[data-ui-focus]', this._itemsList);

        switch (e.code) {
            case 'Enter':
            case 'NumpadEnter':
                // select the focused item
                if (focusedNode) {
                    const value = $.getDataset(focusedNode, 'uiValue');
                    this._selectValue(value);
                }

                return;
        }

        e.preventDefault();

        // focus the previous/next item

        let focusNode;
        if (!focusedNode) {
            focusNode = this._activeItems[0];
        } else {
            let focusIndex = this._activeItems.indexOf(focusedNode);

            switch (e.code) {
                case 'ArrowDown':
                    focusIndex++;
                    break;
                case 'ArrowUp':
                    focusIndex--;
                    break;
            }

            focusNode = this._activeItems[focusIndex];
        }

        if (!focusNode) {
            return;
        }

        $.removeClass(focusedNode, this.constructor.classes.focus);
        $.removeDataset(focusedNode, 'uiFocus');
        $.addClass(focusNode, this.constructor.classes.focus);
        $.setDataset(focusNode, { uiFocus: true });

        const id = $.getAttribute(focusNode, 'id');
        $.setAttribute(this._toggle, { 'aria-activedescendent': id });
        $.setAttribute(this._searchInput, { 'aria-activedescendent': id });

        const itemsScrollY = $.getScrollY(this._itemsList);
        const itemsRect = $.rect(this._itemsList, { offset: true });
        const nodeRect = $.rect(focusNode, { offset: true });

        if (nodeRect.top < itemsRect.top) {
            $.setScrollY(this._itemsList, itemsScrollY + nodeRect.top - itemsRect.top);
        } else if (nodeRect.bottom > itemsRect.bottom) {
            $.setScrollY(this._itemsList, itemsScrollY + nodeRect.bottom - itemsRect.bottom);
        }
    });

    if (this._options.getResults) {
        // infinite scrolling event
        $.addEvent(this._itemsList, 'scroll.ui.selectmenu', $._throttle((_) => {
            if (this._request || !this._showMore) {
                return;
            }

            const height = $.height(this._itemsList);
            const scrollHeight = $.height(this._itemsList, { boxSize: $.SCROLL_BOX });
            const scrollTop = $.getScrollY(this._itemsList);

            if (scrollTop >= scrollHeight - height - (height / 4)) {
                const term = $.getValue(this._searchInput);
                const offset = this._data.length;

                this._loadingScroll = true;
                this._getData({ term, offset });
            }
        }, 250, { leading: false }));
    }

    if (this._multiple) {
        this._eventsMulti();
    } else {
        this._eventsSingle();
    }
};

/**
 * Attach events for a multiple SelectMenu.
 */
export function _eventsMulti() {
    $.addEvent(this._searchInput, 'focus.ui.selectmenu', (_) => {
        if (!$.isSame(this._searchInput, document.activeElement)) {
            return;
        }

        $.hide(this._placeholder);
        $.detach(this._placeholder);
        $.addClass(this._toggle, 'focus');
    });

    $.addEvent(this._searchInput, 'blur.ui.selectmenu', (_) => {
        if (!$.isConnected(this._searchInput)) {
            return;
        }

        if ($.isSame(this._searchInput, document.activeElement)) {
            return;
        }

        if ($.getDataset(this._searchInput, 'uiKeepFocus')) {
            // prevent losing focus when toggle element is focused
            return;
        }

        $.removeClass(this._toggle, 'focus');

        if (!$.isConnected(this._menuNode)) {
            this._refreshPlaceholder();
            return;
        }

        if ($.getDataset(this._menuNode, 'uiAnimating') === 'out') {
            return;
        }

        $.stop(this._menuNode);
        $.removeDataset(this._menuNode, 'uiAnimating');

        this.hide();
    });

    $.addEvent(this._toggle, 'mousedown.ui.selectmenu', (e) => {
        if ($.is(e.target, '[data-ui-action="clear"]')) {
            e.preventDefault();
            return;
        }

        if ($.hasClass(this._toggle, 'focus')) {
            // maintain focus when toggle element is already focused
            $.setDataset(this._searchInput, { uiKeepFocus: true });
        } else {
            $.hide(this._placeholder);
            $.addClass(this._toggle, 'focus');
        }

        $.addEventOnce(window, 'mouseup.ui.selectmenu', (_) => {
            $.removeDataset(this._searchInput, 'uiKeepFocus');
            $.focus(this._searchInput);

            if (!e.button) {
                this.show();
            }
        });
    });

    $.addEventDelegate(this._toggle, 'click.ui.selectmenu', '[data-ui-action="clear"]', (e) => {
        if (e.button) {
            return;
        }

        e.stopPropagation();

        // remove selection
        const element = $.parent(e.currentTarget);
        const index = $.index(element);
        const value = this._value.slice();
        value.splice(index, 1);
        this._setValue(value, { triggerEvent: true });
        $.focus(this._searchInput);
    });
};

/**
 * Attach events for a single SelectMenu.
 */
export function _eventsSingle() {
    $.addEvent(this._searchInput, 'blur.ui.selectmenu', (_) => {
        if ($.isSame(this._searchInput, document.activeElement)) {
            return;
        }

        if ($.getDataset(this._menuNode, 'uiAnimating') === 'out') {
            return;
        }

        $.stop(this._menuNode);
        $.removeDataset(this._menuNode, 'uiAnimating');

        this.hide();
    });

    $.addEvent(this._toggle, 'mousedown.ui.selectmenu', (e) => {
        if ($.is(e.target, '[data-ui-action="clear"]')) {
            e.preventDefault();
            return;
        }

        if (e.button) {
            return;
        }

        if ($.isConnected(this._menuNode)) {
            this.hide();
        } else {
            this.show();

            $.addEventOnce(window, 'mouseup.ui.selectmenu', (_) => {
                // focus search input when mouse is released
                $.focus(this._searchInput);
            });
        }
    });

    $.addEvent(this._toggle, 'keydown.ui.selectmenu', (e) => {
        const searching = /^.$/u.test(e.key);

        if (!searching && !['ArrowDown', 'ArrowUp', 'Enter', 'NumpadEnter'].includes(e.code)) {
            return;
        }

        if (!searching) {
            e.preventDefault();
        }

        this.show();
        $.focus(this._searchInput);
    });

    if (this._options.allowClear) {
        $.addEventDelegate(this._toggle, 'click.ui.selectmenu', '[data-ui-action="clear"]', (e) => {
            if (e.button) {
                return;
            }

            e.stopPropagation();

            // remove selection
            this._setValue(null, { triggerEvent: true });

            if ($.isConnected(this._menuNode)) {
                this.hide();
            }
        });
    }
};
