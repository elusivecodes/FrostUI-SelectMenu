import $ from '@fr0st/query';

/**
 * Build an option element for an item.
 * @param {object} item The item to use.
 * @return {HTMLElement} The option element.
 */
export function _buildOption(item) {
    return $.create('option', {
        text: this._options.getLabel(item),
        value: this._options.getValue(item),
        properties: {
            selected: true,
        },
    });
};

/**
 * Build a data array from a DOM element.
 * @param {HTMLElement} element The element to parse.
 * @return {array} The parsed data.
 */
export function _getDataFromDOM(element) {
    return $.children(element).map((child) => {
        const data = $.getDataset(child);

        if ($.is(child, 'option')) {
            return {
                text: $.getText(child),
                value: $.getValue(child),
                disabled: $.is(child, ':disabled'),
                ...data,
            };
        }

        return {
            text: $.getAttribute(child, 'label'),
            children: this._getDataFromDOM(child),
            ...data,
        };
    });
};

/**
 * Build a data array from an object.
 * @param {object} data The data to parse.
 * @return {array} The parsed data.
 */
export function _getDataFromObject(data) {
    return Object.entries(data)
        .map(([value, text]) => ({ value, text }));
};

/**
 * Add option elements to data.
 * @param {array} data The data to parse.
 * @return {array} The parsed data.
 */
export function _parseData(data) {
    for (const item of data) {
        if ('children' in item && $._isArray(item.children)) {
            this._parseData(item.children);
        } else {
            item.element = this._buildOption(item);
        }
    }

    return data;
};

/**
 * Populate lookup with data.
 * @param {array} data The data to parse.
 * @param {object} [lookup] The lookup.
 * @return {object} The populated lookup.
 */
export function _parseDataLookup(data, lookup = {}) {
    for (const item of data) {
        if ('children' in item) {
            this._parseDataLookup(item.children, lookup);
        } else {
            const key = this._options.getValue(item);
            lookup[key] = $._extend({}, item);
        }
    }

    return lookup;
};
