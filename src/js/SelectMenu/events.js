// SelectMenu events
dom.addEvent(document, 'click.frost.selectmenu', e => {
    SelectMenu.autoHide(e.target);
});

dom.addEventDelegate(document, 'click.frost.selectmenu', '[data-toggle="selectmenu"]', e => {
    const target = UI.getTarget(e.currentTarget);
    SelectMenu.init(target).show();
});

dom.addEvent(document, 'keyup.frost.selectmenu', e => {
    switch (e.key) {
        case 'Tab':
            SelectMenu.autoHide(e.target);
            break;
        case 'Escape':
            SelectMenu.autoHide();
            break;
    }
});
