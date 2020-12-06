Object.assign(SelectMenu, {

    _buildOption(item) {
        return dom.create('option', {
            text: item.text,
            value: item.value
        });
    },

    _getDataFromDOM(element) {
        const children = dom.children(element);

        const results = [];

        for (const child of children) {
            const text = dom.getText(child);
            const data = dom.getDataset(child);

            if (dom.is(child, 'option')) {
                results.push({
                    text,
                    value: dom.getValue(child),
                    ...data
                })
            } else {
                results.push({
                    text,
                    children: this._getDataFromDOM(child),
                    ...data
                });
            }
        }

        return results;
    },

    _getDataFromObject(data) {
        return Object.entries(data)
            .map(([value, text]) => ({ value, text }));
    },

    _parseData(data) {
        for (const item of data) {
            if (item.children) {
                this._parseData(item.children);
            } else {
                item.element = this._buildOption(item);
            }
        }

        return data;
    }

});
