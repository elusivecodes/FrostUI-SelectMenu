// SelectMenu default options
SelectMenu.defaults = {
    placeholder: '',
    lang: {
        loading: 'Loading..',
        maxSelections: 'Selection limit reached.',
        noResults: 'No results'
    },
    data: null,
    getResults: null,
    isMatch: (item, term) => {
        const escapedTerm = Core.escapeRegExp(term);
        const regExp = new RegExp(escapedTerm, 'i');

        if (regExp.test(item.text)) {
            return true;
        }

        const normalized = term.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const escapedNormal = Core.escapeRegExp(normalized);
        const regExpNormal = new RegExp(escapedNormal, 'i');

        if (regExpNormal.test(item.text)) {
            return true;
        }

        return false;
    },
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
    maxSelections: 0,
    minSearch: 0,
    allowClear: false,
    closeOnSelect: true,
    fullWidth: true,
    debounceInput: 250,
    duration: 100,
    placement: 'bottom',
    position: 'start',
    fixed: false,
    spacing: 3,
    minContact: false
};

UI.initComponent('selectmenu', SelectMenu);

UI.SelectMenu = SelectMenu;
