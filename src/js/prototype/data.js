import $ from '@fr0st/query';

/**
 * Initialize preloaded get data.
 */
export function _getDataInit() {
    this._getData = ({ term = null }) => {
        this._activeItems = [];
        $.empty(this._itemsList);
        $.setAttribute(this._toggle, { 'aria-activedescendent': '' });
        $.setAttribute(this._searchInput, { 'aria-activedescendent': '' });

        // check for minimum search length
        if (this._options.minSearch && (!term || term.length < this._options.minSearch)) {
            $.hide(this._menuNode);
            this.update();
            return;
        }

        $.show(this._menuNode);

        // check for max selections
        if (this._multiple && this._maxSelections && this._value.length >= this._maxSelections) {
            const info = this._renderInfo(this._options.lang.maxSelections);
            $.append(this._itemsList, info);
            this.update();
            return;
        }

        let results = this._data;

        if (term) {
            const isMatch = this._options.isMatch.bind(this);
            const sortResults = this._options.sortResults.bind(this);

            // filter results
            results = this._data
                .flatMap((item) => 'children' in item && $._isArray(item.children) ?
                    item.children :
                    item,
                )
                .map((item) => this._cloneItem(item))
                .filter((data) => isMatch(data, term))
                .sort((a, b) => sortResults(a, b, term));
        }

        this._renderResults(results);
        this.update();
    };
};

/**
 * Initialize get data from callback.
 */
export function _getResultsInit() {
    const load = $._debounce(({ offset, term }) => {
        const options = { offset };

        if (term) {
            options.term = term;
        }

        const request = Promise.resolve(this._options.getResults(options));

        request.then((response) => {
            const newData = this._parseData(response.results);

            // update lookup
            Object.assign(
                this._lookup,
                this._parseDataLookup(newData),
            );

            if (this._request !== request) {
                return;
            }

            if (!offset) {
                this._data = newData;
                $.empty(this._itemsList);
            } else {
                this._data.push(...newData);
                $.detach(this._loader);
            }

            this._showMore = response.showMore;

            this._renderResults(newData);

            this._request = null;
        }).catch((_) => {
            if (this._request !== request) {
                return;
            }

            $.detach(this._loader);
            $.append(this._itemsList, this._error);

            this._request = null;
        }).finally((_) => {
            this._loadingScroll = false;
            this.update();
        });

        this._request = request;
    }, this._options.debounce);

    this._getData = ({ offset = 0, term = null }) => {
        // cancel last request
        if (this._request && this._request.cancel) {
            this._request.cancel();
        }

        this._request = null;

        if (!offset) {
            this._activeItems = [];
            $.setAttribute(this._toggle, { 'aria-activedescendent': '' });
            $.setAttribute(this._searchInput, { 'aria-activedescendent': '' });

            const children = $.children(this._itemsList, (node) => !$.isSame(node, this._loader));
            $.detach(children);
        } else {
            $.detach(this._error);
        }

        // check for minimum search length
        if (this._options.minSearch && (!term || term.length < this._options.minSearch)) {
            $.hide(this._menuNode);
            this.update();
            return;
        }

        $.show(this._menuNode);

        // check for max selections
        if (this._multiple && this._maxSelections && this._value.length >= this._maxSelections) {
            const info = this._renderInfo(this._options.lang.maxSelections);
            $.append(this._itemsList, info);
            this.update();
            return;
        }

        const lastChild = $.child(this._itemsList, ':last-child');
        if (!lastChild || !$.isSame(lastChild, this._loader)) {
            $.append(this._itemsList, this._loader);
        }

        load({ offset, term });
    };
};
