// SelectMenu default options
SelectMenu.defaults = {
    data: null,
    placeholder: 'Nothing Selected',
    lang: {
        loading: 'Loading..',
        maxSelect: 'Selection limit reached.',
        noResults: 'No results'
    },
    isMatch: (item, term) => item.text.toLowerCase().indexOf(term.toLowerCase()) > -1,
    renderResult: item => item.text,
    renderSelection: item => item.text,
    sanitize: input => dom.sanitize(input),
    sortResults: (results, term) => results.sort((a, b) => {
        const aLower = a.text.toLowerCase();
        const bLower = b.text.toLowerCase();

        if (term) {
            const diff = aLower.indexOf(term) - bLower.indexOf(term);

            if (diff) {
                return diff;
            }
        }

        return aLower.localeCompare(bLower);
    }),
    maxSearch: 0,
    maxSelect: 0,
    minSearch: 0,
    allowClear: false,
    closeOnSelect: true,
    fullWidth: true,
    duration: 100,
    placement: 'bottom',
    position: 'start',
    fixed: true,
    spacing: 3,
    minContact: false
};

// SelectMenu QuerySet method
if (QuerySet) {
    QuerySet.prototype.selectmenu = function(a, ...args) {
        let settings, method;

        if (Core.isObject(a)) {
            settings = a;
        } else if (Core.isString(a)) {
            method = a;
        }

        for (const node of this) {
            if (!Core.isElement(node)) {
                continue;
            }

            const selectMenu = SelectMenu.init(node, settings);

            if (method) {
                selectMenu[method](...args);
            }
        }

        return this;
    };
}

UI.SelectMenu = SelectMenu;
