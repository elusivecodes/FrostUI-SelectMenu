// SelectMenu default options
SelectMenu.defaults = {
    placeholder: '',
    lang: {
        loading: 'Loading..',
        maxSelections: 'Selection limit reached.',
        noResults: 'No results'
    },
    searchInputStyle: 'filled',
    data: null,
    getResults: null,
    isMatch: (item, term) => {
        const normalized = item.text.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const escapedTerm = Core.escapeRegExp(term);
        const regExp = new RegExp(escapedTerm, 'i');

        return regExp.test(item.text) || regExp.test(normalized);
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
    debounceInput: 250,
    duration: 100,
    appendTo: null,
    fullWidth: false,
    placement: 'bottom',
    position: 'start',
    fixed: false,
    spacing: 0,
    minContact: false
};

// Default classes
SelectMenu.classes = {
    action: 'selectmenu-action',
    active: 'selectmenu-active',
    clear: 'btn-close float-end mx-2 lh-base',
    disabled: 'disabled',
    disabledItem: 'selectmenu-disabled',
    focus: 'selectmenu-focus',
    group: 'selectmenu-group',
    hide: 'visually-hidden',
    info: 'selectmenu-item text-secondary',
    item: 'selectmenu-item',
    items: 'selectmenu-items',
    menu: 'selectmenu-menu shadow-sm',
    multiClear: 'btn btn-sm btn-outline-secondary',
    multiClearIcon: 'btn-close pe-none',
    multiGroup: 'btn-group',
    multiItem: 'btn btn-sm btn-secondary',
    multiSearchInput: 'selectmenu-multi-input',
    multiToggle: 'selectmenu-multi d-flex flex-wrap position-relative text-start',
    placeholder: 'selectmenu-placeholder',
    readonly: 'readonly',
    searchContainer: 'form-input',
    searchInputFilled: 'input-filled',
    searchInputOutline: 'input-outline',
    searchInputRipple: 'ripple-line',
    searchOuter: 'p-1',
    toggle: 'selectmenu-toggle position-relative text-start'
};

UI.initComponent('selectmenu', SelectMenu);

UI.SelectMenu = SelectMenu;
