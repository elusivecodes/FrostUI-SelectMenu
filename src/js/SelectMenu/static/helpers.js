/**
 * SelectMenu (Static) Helpers
 */

Object.assign(SelectMenu, {

    /**
     * Build an option element for an item.
     * @param {object} item The item to use.
     * @returns {HTMLElement} The option element.
     */
    _buildOption(item) {
        return dom.create('option', {
            text: item.text,
            value: item.value,
            properties: {
                selected: true
            }
        });
    },

    /**
     * Build a data array from a DOM element.
     * @param {HTMLElement} element The element to parse.
     * @returns {array} The parsed data.
     */
    _getDataFromDOM(element) {
        return dom.children(element).map(child => {
            const data = dom.getDataset(child);

            if (dom.is(child, 'option')) {
                return {
                    text: dom.getText(child),
                    value: dom.getValue(child),
                    ...data
                };
            }

            return {
                text: dom.getAttribute(child, 'label'),
                children: this._getDataFromDOM(child),
                ...data
            };
        });
    },

    /**
     * Build a data array from an object.
     * @param {object} data The data to parse.
     * @returns {array} The parsed data.
     */
    _getDataFromObject(data) {
        return Object.entries(data)
            .map(([value, text]) => ({ value, text }));
    },

    /**
     * Add option elements to data.
     * @param {array} data The data to parse.
     * @returns {array} The parsed data.
     */
    _parseData(data) {
        for (const item of data) {
            if (item.children) {
                this._parseData(item.children);
            } else {
                item.element = this._buildOption(item);
            }
        }

        return data;
    },

    /**
     * Populate lookup with data.
     * @param {array} data The data to parse.
     * @param {object} [lookup] The lookup.
     * @returns {object} The populated lookup.
     */
    _parseDataLookup(data, lookup = {}) {
        for (const item of data) {
            if (data.children) {
                this._parseDataLookup(data.children, lookup);
            } else {
                lookup[item.value] = Core.extend({}, item);
            }
        }

        return lookup;
    }

});
