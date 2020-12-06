# FrostUI-SelectMenu

[~] Modify multi search input to have dynamic width
[~] Allow searching from focused button
[ ] Fix styling of dropdown arrow

[ ] Add update and updated events to Popper
[ ] Remove fullWidth option from Popper
[ ] Implement fixed height and overflow scroll to menu
[ ] Implement infinite scrolling from AJAX

[.] Implement disabled
[ ] disable()
[ ] enable()
[~] destroy()


[ ] Add break to keyup dropdown switch*

// init selection?

dom.query('#select').select2({
    data: (query, callback) => {
        return DOM.ajax({
            url: '/data.json',
            method: 'POST',
            data: query
        }).then(response => {
            callback(response);
        });
    }
})
dom.query('#select').data('selectmenu').setValue(3);
