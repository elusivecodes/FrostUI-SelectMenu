import $ from '@fr0st/query';
import { initComponent } from '@fr0st/ui';
import SelectMenu from './select-menu.js';
import { data, getMaxSelections, getPlaceholder, getValue, setMaxSelections, setPlaceholder, setValue } from './prototype/api.js';
import { _getDataInit, _getResultsInit, _getResultsCallbackInit } from './prototype/data.js';
import { _events, _eventsMulti, _eventsSingle } from './prototype/events.js';
import { _cloneItem, _findValue, _loadValue, _refresh, _refreshDisabled, _refreshMulti, _refreshPlaceholder, _refreshSingle, _selectValue, _setValue, _updateSearchWidth } from './prototype/helpers.js';
import { _buildOption, _getDataFromDOM, _getDataFromObject, _parseData, _parseDataLookup } from './prototype/parsers.js';
import { _render, _renderClear, _renderGroup, _renderInfo, _renderItem, _renderMenu, _renderMultiSelection, _renderPlaceholder, _renderResults, _renderToggleMulti, _renderToggleSingle } from './prototype/render.js';

initComponent('selectmenu', SelectMenu);

// SelectMenu default options
SelectMenu.defaults = {
    placeholder: '',
    lang: {
        clear: 'Remove selection',
        error: 'Error loading data.',
        loading: 'Loading..',
        maxSelections: 'Selection limit reached.',
        noResults: 'No results',
        search: 'Search',
    },
    searchInputStyle: 'filled',
    data: null,
    getResults: null,
    getLabel: (value) => value.text,
    getValue: (value) => value.value,
    renderResult(data) {
        return this._options.getLabel(data);
    },
    renderSelection(data) {
        return this._options.getLabel(data);
    },
    sanitize: (input) => $.sanitize(input),
    isMatch(data, term) {
        const value = this._options.getLabel(data);
        const escapedTerm = $._escapeRegExp(term);
        const regExp = new RegExp(escapedTerm, 'i');

        if (regExp.test(value)) {
            return true;
        }

        const normalized = value.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

        return regExp.test(normalized);
    },
    sortResults(a, b, term) {
        const aLower = this._options.getLabel(a).toLowerCase();
        const bLower = this._options.getLabel(b).toLowerCase();

        if (term) {
            const diff = aLower.indexOf(term) - bLower.indexOf(term);

            if (diff) {
                return diff;
            }
        }

        return aLower.localeCompare(bLower);
    },
    maxSelections: 0,
    minSearch: 0,
    allowClear: false,
    closeOnSelect: true,
    debounce: 250,
    duration: 100,
    maxHeight: '250px',
    appendTo: null,
    fullWidth: false,
    placement: 'bottom',
    position: 'start',
    fixed: false,
    spacing: 0,
    minContact: false,
};

// Default classes
SelectMenu.classes = {
    active: 'active',
    clear: 'btn-close mx-2 lh-base',
    disabled: 'disabled',
    disabledItem: 'disabled',
    focus: 'focus',
    group: 'selectmenu-group',
    groupContainer: 'selectmenu-group-container list-unstyled',
    hide: 'visually-hidden',
    info: 'selectmenu-item text-body-secondary',
    item: 'selectmenu-item',
    items: 'selectmenu-items list-unstyled',
    menu: 'selectmenu-menu shadow-sm',
    multiClear: 'btn',
    multiClearIcon: 'btn-close pe-none',
    multiGroup: 'btn-group my-n1',
    multiItem: 'btn',
    multiSearchInput: 'selectmenu-multi-input',
    multiToggle: 'selectmenu-multi d-flex flex-wrap position-relative text-start',
    placeholder: 'selectmenu-placeholder',
    readonly: 'readonly',
    searchContainer: 'form-input',
    searchInputFilled: 'input-filled',
    searchInputOutline: 'input-outline',
    searchInputRipple: 'ripple-line',
    searchOuter: 'p-1',
    selectionSingle: 'me-auto',
    toggle: 'selectmenu-toggle d-flex position-relative justify-content-between text-start',
};

const proto = SelectMenu.prototype;

proto.data = data;
proto.getMaxSelections = getMaxSelections;
proto.getPlaceholder = getPlaceholder;
proto.getValue = getValue;
proto.setMaxSelections = setMaxSelections;
proto.setPlaceholder = setPlaceholder;
proto.setValue = setValue;
proto._buildOption = _buildOption;
proto._cloneItem = _cloneItem;
proto._events = _events;
proto._eventsMulti = _eventsMulti;
proto._eventsSingle = _eventsSingle;
proto._findValue = _findValue;
proto._getDataFromDOM = _getDataFromDOM;
proto._getDataFromObject = _getDataFromObject;
proto._getDataInit = _getDataInit;
proto._getResultsInit = _getResultsInit;
proto._getResultsCallbackInit = _getResultsCallbackInit;
proto._loadValue = _loadValue;
proto._parseData = _parseData;
proto._parseDataLookup = _parseDataLookup;
proto._refresh = _refresh;
proto._refreshDisabled = _refreshDisabled;
proto._refreshMulti = _refreshMulti;
proto._refreshPlaceholder = _refreshPlaceholder;
proto._refreshSingle = _refreshSingle;
proto._render = _render;
proto._renderClear = _renderClear;
proto._renderGroup = _renderGroup;
proto._renderInfo = _renderInfo;
proto._renderItem = _renderItem;
proto._renderMenu = _renderMenu;
proto._renderMultiSelection = _renderMultiSelection;
proto._renderPlaceholder = _renderPlaceholder;
proto._renderResults = _renderResults;
proto._renderToggleMulti = _renderToggleMulti;
proto._renderToggleSingle = _renderToggleSingle;
proto._selectValue = _selectValue;
proto._setValue = _setValue;
proto._updateSearchWidth = _updateSearchWidth;

export default SelectMenu;
