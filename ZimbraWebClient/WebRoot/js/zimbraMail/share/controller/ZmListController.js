/**
* Creates a new, empty list controller. It must be initialized before it can be used.
* @constructor
* @class
* This class is a base class for any controller that manages lists of items (eg mail or
* contacts). It consolidates handling of list functionality (eg selection) and of common
* operations such as tagging and deletion. Operations may be accessed by the user through
* either the toolbar or an action menu. The public method show() gets everything going,
* and then the controller just handles events.
*
* <p>Support is also present for handling multiple views (eg contacts).</p>
*
* <p>Controllers for single items may extend this class, since the functionality needed is 
* virtually the same. An item can be thought of as the degenerate form of a list.</p>
*
* @author Conrad Damon
* @param appCtxt	app context
* @param container	containing shell
* @param app		containing app
*/
function ZmListController(appCtxt, container, app) {

	if (arguments.length == 0) return;
	ZmController.call(this, appCtxt, container, app);

	this._toolbar = new Object;		// LmButtonToolbar (one per view)
	this._listView = new Object;	// ZmListView (one per view)
	this._list = null;				// ZmList (the data)
	this._actionMenu = null; 		// ZmActionMenu
	this._actionEv = null;
	
	this._tagList = this._appCtxt.getTagList();
	this._tagList.addChangeListener(new AjxListener(this, this._tagChangeListener));
	this._creatingTag = false;
	this._activeSearch = null;
	this._searchString = null;

	// create a listener for each operation
	this._listeners = new Object();
	this._listeners[ZmOperation.NEW_MENU] = new AjxListener(this, this._newListener);
	this._listeners[ZmOperation.TAG_MENU] = new AjxListener(this, this._tagButtonListener);
	this._listeners[ZmOperation.TAG] = new AjxListener(this, this._tagListener);
	this._listeners[ZmOperation.PRINT] = new AjxListener(this, this._printListener);
	this._listeners[ZmOperation.DELETE]  = new AjxListener(this, this._deleteListener);
	this._listeners[ZmOperation.CLOSE] = new AjxListener(this, this._backListener);
	this._listeners[ZmOperation.MOVE]  = new AjxListener(this, this._moveListener);
	this._listeners[ZmOperation.SEARCH] = new AjxListener(this, this._participantSearchListener);
	this._listeners[ZmOperation.BROWSE] = new AjxListener(this, this._participantBrowseListener);
	this._listeners[ZmOperation.NEW_MESSAGE] = new AjxListener(this, this._participantComposeListener);
	this._listeners[ZmOperation.IM] = new AjxListener(this, this._participantImListener);
	this._listeners[ZmOperation.CONTACT] = new AjxListener(this, this._participantContactListener);
	this._listeners[ZmOperation.VIEW] = new AjxListener(this, this._viewButtonListener);

	this._popdownListener = new AjxListener(this, this._popdownActionListener);

	this._dropTgt = new DwtDropTarget(ZmTag);
	this._dropTgt.markAsMultiple();
	this._dropTgt.addDropListener(new AjxListener(this, this._dropListener));
}

ZmListController.prototype = new ZmController;
ZmListController.prototype.constructor = ZmListController;

// abstract public methods

// public methods

ZmListController.prototype.toString = 
function() {
	return "ZmListController";
}

/**
* Performs some setup for displaying the given search results in a list view. Subclasses will need
* to do the actual display work, typically by calling the list view's set() method.
*
* @param searchResults		a ZmSearchResult
* @param searchString		the query string
* @param view				view type to use
*/
ZmListController.prototype.show	=
function(searchResults, searchString, view) {
	this._currentView = view ? view : this._defaultView();
	this._activeSearch = searchResults;
	this._searchString = searchString;
	// save current search for use by replenishment
	if (searchResults)
		this._currentSearch = searchResults.search;
	this.currentPage = 1;
	this.maxPage = 1;
	this.pageIsDirty = new Object();
}

ZmListController.prototype.getCurrentView = 
function() {
	return this._listView[this._currentView];
}

ZmListController.prototype.getList = 
function() {
	return this._list;
}

ZmListController.prototype.setList = 
function(newList) {
	if (newList != this._list && (newList instanceof ZmList)) {
		// dtor current list if necessary
		if (this._list)
			this._list.clear();
		this._list = newList;
	}
}

// abstract protected methods

// Creates the view element
ZmListController.prototype._createNewView	 	= function() {}

// Returns the view ID
ZmListController.prototype._getViewType 		= function() {}

// Populates the view with data
ZmListController.prototype._setViewContents		= function(view) {}

// Returns text for the tag operation
ZmListController.prototype._getTagMenuMsg 		= function(num) {}

// Returns text for the move dialog
ZmListController.prototype._getMoveDialogTitle	= function(num) {}

// Returns a list of desired toolbar operations
ZmListController.prototype._getToolBarOps 		= function() {}

// Returns a list of desired action menu operations
ZmListController.prototype._getActionMenuOps 	= function() {}

// Attempts to process a nav toolbar up/down button click
ZmListController.prototype._paginateDouble 		= function(bDoubleForward) {}

// Saves search results so we only fetch them once
ZmListController.prototype._cacheList			= function(search) {}

// Returns the type of item in the underlying list
ZmListController.prototype._getItemType			= function() {}

// private and protected methods

// Creates basic elements and sets the toolbar and action menu
ZmListController.prototype._setup =
function(view) {
	this._initialize(view);
	this._resetOperations(this._toolbar[view], 0);
	this._resetOperations(this._actionMenu, 0);
}

// Creates the basic elements: toolbar, list view, and action menu
ZmListController.prototype._initialize =
function(view) {
	this._initializeToolBar(view);
	this._initializeListView(view);
	this._initializeActionMenu();
}

// Below are functions that return various groups of operations, for cafeteria-style
// operation selection.

ZmListController.prototype._standardToolBarOps =
function() {
	var list = [ZmOperation.NEW_MENU];
	if (this._appCtxt.get(ZmSetting.TAGGING_ENABLED))
		list.push(ZmOperation.TAG_MENU);
	list.push(ZmOperation.SEP);
	if (this._appCtxt.get(ZmSetting.PRINT_ENABLED))
		list.push(ZmOperation.PRINT);
	list.push(ZmOperation.DELETE);
	list.push(ZmOperation.MOVE);
	return list;
}

ZmListController.prototype._standardActionMenuOps =
function() {
	var list = new Array();
	if (this._appCtxt.get(ZmSetting.TAGGING_ENABLED))
		list.push(ZmOperation.TAG_MENU);
	list.push(ZmOperation.DELETE);
	if (this._appCtxt.get(ZmSetting.PRINT_ENABLED))
		list.push(ZmOperation.PRINT);
	list.push(ZmOperation.MOVE);
	return list;
}

ZmListController.prototype._contactOps =
function() {
	var list = new Array();
	if (this._appCtxt.get(ZmSetting.SEARCH_ENABLED))
		list.push(ZmOperation.SEARCH);
	if (this._appCtxt.get(ZmSetting.BROWSE_ENABLED))
		list.push(ZmOperation.BROWSE);
	list.push(ZmOperation.NEW_MESSAGE);
	if (this._appCtxt.get(ZmSetting.IM_ENABLED))
		list.push(ZmOperation.IM);
	if (this._appCtxt.get(ZmSetting.CONTACTS_ENABLED))
		list.push(ZmOperation.CONTACT);
	return list;
}

// toolbar: buttons and listeners
ZmListController.prototype._initializeToolBar = 
function(view) {
	if (this._toolbar[view]) return;

	var buttons = this._getToolBarOps();
	if (!buttons) return;
	this._toolbar[view] = new ZmButtonToolBar(this._container, buttons, null, Dwt.ABSOLUTE_STYLE, "LmAppToolBar");
	// remove text for Print, Delete, and Move buttons
	var list = [ZmOperation.PRINT, ZmOperation.DELETE, ZmOperation.MOVE];
	for (var i = 0; i < list.length; i++) {
		var button = this._toolbar[view].getButton(list[i]);
		if (button)
			button.setText(null);
	}
	for (var i = 0; i < buttons.length; i++)
		if (buttons[i] > 0 && this._listeners[buttons[i]])
			this._toolbar[view].addSelectionListener(buttons[i], this._listeners[buttons[i]]);
	this._propagateMenuListeners(this._toolbar[view], ZmOperation.NEW_MENU);
	if (this._appCtxt.get(ZmSetting.TAGGING_ENABLED)) {
		var tagMenuButton = this._toolbar[view].getButton(ZmOperation.TAG_MENU);
		if (tagMenuButton) {
			tagMenuButton.noMenuBar = true;
			this._setupTagMenu(this._toolbar[view]);
		}
	}
}

// list view and its listeners
ZmListController.prototype._initializeListView = 
function(view) {
	if (this._listView[view]) return;
	
	this._listView[view] = this._createNewView(view);
	this._listView[view].addSelectionListener(new AjxListener(this, this._listSelectionListener));
	this._listView[view].addActionListener(new AjxListener(this, this._listActionListener));	
}

// action menu: menu items and listeners
ZmListController.prototype._initializeActionMenu = 
function() {
	if (this._actionMenu) return;

	var menuItems = this._getActionMenuOps();
	if (!menuItems) return;
	this._actionMenu = new ZmActionMenu(this._shell, menuItems);
	for (var i = 0; i < menuItems.length; i++)
		if (menuItems[i] > 0)
			this._actionMenu.addSelectionListener(menuItems[i], this._listeners[menuItems[i]]);
	this._actionMenu.addPopdownListener(this._popdownListener);
	if (this._appCtxt.get(ZmSetting.TAGGING_ENABLED))
		this._setupTagMenu(this._actionMenu);
}

/**
* Creates the desired application view.
*
* @param view			view ID
* @param elements		array of view components
* @param isAppView		this view is a top-level app view
* @param clear			if true, clear the hidden stack of views
* @param pushOnly		don't reset the view's data, just swap the view in
*/
ZmListController.prototype._setView =
function(view, elements, isAppView, clear, pushOnly) {

	// create the view (if we haven't yet)
	if (!this._appViews[view]) {
		// view management callbacks
		var callbacks = new Object();
		callbacks[ZmAppViewMgr.CB_PRE_HIDE] =
			this._preHideCallback ? new AjxCallback(this, this._preHideCallback) : null;
		callbacks[ZmAppViewMgr.CB_POST_HIDE] =
			this._postHideCallback ? new AjxCallback(this, this._postHideCallback) : null;
		callbacks[ZmAppViewMgr.CB_PRE_SHOW] =
			this._preShowCallback ? new AjxCallback(this, this._preShowCallback) : null;
		callbacks[ZmAppViewMgr.CB_POST_SHOW] =
			this._postShowCallback ? new AjxCallback(this, this._postShowCallback) : null;
	
		this._app.createView(view, elements, callbacks, isAppView);
		this._appViews[view] = 1;
	}

	// populate the view
	if (!pushOnly)
		this._setViewContents(view);

	// push the view
	 return (clear ? this._app.setView(view) : this._app.pushView(view));
}

// List listeners

// List selection event - handle flagging if a flag icon was clicked, otherwise reset
// the toolbar based on how many items are selected.
ZmListController.prototype._listSelectionListener = 
function(ev) {
	if (ev.field == ZmListView.FIELD_PREFIX[ZmItem.F_FLAG]) {
		this._schedule(this._doFlag, {items: [ev.item]});
	} else {
		this._resetOperations(this._toolbar[this._currentView], this._listView[this._currentView].getSelectionCount());
	}
}

// List action event - set the dynamic tag menu, and enable operations in the action menu
// based on the number of selected items. Note that the menu is not actually popped up
// here; that's left up to the subclass, which should override this function.
ZmListController.prototype._listActionListener = 
function(ev) {
	this._actionEv = ev;
	if (this._appCtxt.get(ZmSetting.TAGGING_ENABLED))
		this._setTagMenu(this._actionMenu);
	this._resetOperations(this._actionMenu, this._listView[this._currentView].getSelectionCount());
}

ZmListController.prototype._popdownActionListener = 
function(ev) {
	if (!this._pendingActionData)
		this._listView[this._currentView].handleActionPopdown(ev);
}

// Operation listeners

// Create some new thing, via a dialog. If just the button has been pressed (rather than
// a menu item), the action taken depends on the app.
ZmListController.prototype._newListener = 
function(ev) {
	var id = ev.item.getData(ZmOperation.KEY_ID);
	if (!id || id == ZmOperation.NEW_MENU)
		id = this._defaultNewId;
	if (id == ZmOperation.NEW_MESSAGE) {
		var inNewWindow = this._appCtxt.get(ZmSetting.NEW_WINDOW_COMPOSE) || ev.shiftKey;
		this._appCtxt.getApp(ZmZimbraMail.MAIL_APP).getComposeController().doAction(ZmOperation.NEW_MESSAGE, inNewWindow);
	} else if (id == ZmOperation.NEW_CONTACT) {
		var contact = new ZmContact(this._appCtxt);
		this._appCtxt.getApp(ZmZimbraMail.CONTACTS_APP).getContactController().show(contact);
	} else if (id == ZmOperation.NEW_APPT) {
		var app = this._appCtxt.getApp(ZmZimbraMail.CALENDAR_APP);
		var con = app.getCalController();
		con.newAppointment();
	} else if (id == ZmOperation.NEW_FOLDER) {
		this._showDialog(this._appCtxt.getNewFolderDialog(), this._newFolderCallback);
	} else if (id == ZmOperation.NEW_TAG) {
		this._showDialog(this._appCtxt.getNewTagDialog(), this._newTagCallback, null, null, false);
	}
}

// Tag button has been pressed. We don't tag anything (since no tag has been selected),
// we just show the dynamic tag menu.
ZmListController.prototype._tagButtonListener = 
function(ev) {
	this._setTagMenu(this._toolbar[this._currentView]);
}

// Tag/untag items.
ZmListController.prototype._tagListener = 
function(item) {
	if (this._app.getAppViewMgr().getCurrentView() == this._getViewType()) {
		var tagEvent = item.getData(ZmTagMenu.KEY_TAG_EVENT);
		var tagAdded = item.getData(ZmTagMenu.KEY_TAG_ADDED);
		var items = this._listView[this._currentView].getSelection();
		if (tagEvent == ZmEvent.E_TAGS && tagAdded) {
			this._schedule(this._doTag, {items: items, tag: item.getData(Dwt.KEY_OBJECT), bTag: true});
		} else if (tagEvent == ZmEvent.E_CREATE) {
			this._pendingActionData = this._listView[this._currentView].getSelection();
			var newTagDialog = this._appCtxt.getNewTagDialog();
			this._showDialog(newTagDialog, this._newTagCallback, null, null, true);
			newTagDialog.registerCallback(DwtDialog.CANCEL_BUTTON, this._clearDialog, this, newTagDialog);
		} else if (tagEvent == ZmEvent.E_TAGS && !tagAdded) {
			this._schedule(this._doTag, {items: items, tag: item.getData(Dwt.KEY_OBJECT), bTag: false});
		} else if (tagEvent == ZmEvent.E_REMOVE_ALL) {
			// XXX: remove this once bug 607 is fixed
			if (this instanceof ZmConvListController) {
				var tagList = item.getData(Dwt.KEY_OBJECT);
				for (var i = 0; i < tagList.length; i++)
					this._schedule(this._doTag, {items: items, tag: this._tagList.getById(tagList[i]), bTag: false});
			} else {
				this._schedule(this._doRemoveAllTags, items);
			}
		}
	}
}

ZmListController.prototype._printListener = 
function(ev) {
	var items = this._listView[this._currentView].getSelection();
	var item = (items instanceof Array) ? items[0] : items;
	if (!this._printView)
		this._printView = new ZmPrintView(this._appCtxt);
	
	this._printView.render(item);
}

ZmListController.prototype._backListener = 
function(ev) {
	this._app.popView();
}

// Delete one or more items.
ZmListController.prototype._deleteListener = 
function(ev) {
	var items = this._listView[this._currentView].getSelection();
	this._schedule(this._doDelete, {items: items});
}

// Move button has been pressed, show the dialog.
ZmListController.prototype._moveListener = 
function(ev) {
	this._pendingActionData = this._listView[this._currentView].getSelection();
	var moveToDialog = this._appCtxt.getMoveToDialog();
	this._showDialog(moveToDialog, this._moveCallback, this._pendingActionData);
	moveToDialog.registerCallback(DwtDialog.CANCEL_BUTTON, this._clearDialog, this, moveToDialog);
	moveToDialog.setTitle(this._getMoveDialogTitle(this._pendingActionData.length));
}

// Switch to selected view.
ZmListController.prototype._viewButtonListener =
function(ev) {
	this.switchView(ev.item.getData(ZmOperation.MENUITEM_ID));
}

// Navbar listeners

ZmListController.prototype._navBarListener = 
function(ev) {
	// skip listener for non-current views
	if (this._appCtxt.getAppViewMgr().getCurrentView() != this._getViewType())
		return;
	
	var op = ev.item.getData(ZmOperation.KEY_ID);
	
	try {
		if (op == ZmOperation.PAGE_BACK || op == ZmOperation.PAGE_FORWARD) 
		{
			this._paginate(this._currentView, (op == ZmOperation.PAGE_FORWARD));
		} 
		else if (op == ZmOperation.PAGE_DBL_BACK || op == ZmOperation.PAGE_DBL_FORW) 
		{
			this._paginateDouble(op == ZmOperation.PAGE_DBL_FORW);
		}
	} catch (ex) {
		this._handleException(ex, this._navBarListener, ev, false);
	}
}

// Participant listeners

// Search based on email address
ZmListController.prototype._participantSearchListener = 
function(ev) {
	var name = this._actionEv.address.getAddress();
	this._appCtxt.getSearchController().fromSearch(name);
}

// Browse based on email address
ZmListController.prototype._participantBrowseListener = 
function(ev) {
	var name = this._actionEv.address.getAddress();
	this._appCtxt.getSearchController().fromBrowse(name);
}

// Compose message to participant
ZmListController.prototype._participantComposeListener = 
function(ev) {
	var name = this._actionEv.address.toString() + ZmEmailAddress.SEPARATOR;
	var inNewWindow = this._appCtxt.get(ZmSetting.NEW_WINDOW_COMPOSE) || ev.shiftKey;
	var cc = this._appCtxt.getApp(ZmZimbraMail.MAIL_APP).getComposeController();
	cc.doAction(ZmOperation.NEW_MESSAGE, inNewWindow, null, name);
}

// IM the participant (if enabled via config)
ZmListController.prototype._participantImListener =
function(ev) {
	// get the first selected message
	var msg = this._listView[this._currentView].getSelection()[0];
	var screenName = msg._contact._fullName;
	if (!this._newImDialog)
		this._newImDialog = new ZmNewImDialog(this._shell, null, screenName);
	else
		this._newImDialog.setScreenName(screenName);
	this._newImDialog.popup();
}

// If there's a contact for the participant, edit it, otherwise add it.
ZmListController.prototype._participantContactListener = 
function(ev) {
	var cc = this._appCtxt.getApp(ZmZimbraMail.CONTACTS_APP).getContactController();	
	if (this._actionEv.contact) {
		cc.show(this._actionEv.contact);
	} else {
		var contact = new ZmContact(this._appCtxt);
		contact.initFromEmail(this._actionEv.address);
		cc.show(contact);
	}
}

// Drag and drop listeners

ZmListController.prototype._dragListener =
function(ev) {
	if (ev.action == DwtDragEvent.SET_DATA) {
		ev.srcData = {data: ev.srcControl.getDnDSelection(), controller: this};
	} else if (ev.action == DwtDragEvent.DRAG_END) {
		this._checkReplenish();
	}
}

// The list view as a whole is the drop target, since it's the lowest-level widget. Still, we
// need to find out which item got dropped onto, so we get that from the original UI event 
// (a mouseup). The header is within the list view, but not an item, so it's not a valid drop
// target. One drawback of having the list view be the drop target is that we can't exercise
// fine-grained control on what's a valid drop target. If you enter via an item and then drag to
// the header, it will appear to be valid.
ZmListController.prototype._dropListener =
function(ev) {
	var div, item;
	div = DwtUiEvent.getTargetWithProp(ev.uiEvent, "_itemIndex");
	var view = this._listView[this._currentView];
	if (div) {
		item = view.getItemFromElement(div);
	}
	// only tags can be dropped on us
	if (ev.action == DwtDropEvent.DRAG_ENTER) {
		ev.doIt = (item && this._dropTgt.isValidTarget(ev.srcData));
		DBG.println(AjxDebug.DBG3, "DRAG_ENTER: doIt = " + ev.doIt);
		if (item && (item.type == ZmItem.CONTACT) && item.isGal)
			ev.doIt = false; // can't tag a GAL contact
	    view.dragSelect(div);
	} else if (ev.action == DwtDropEvent.DRAG_DROP) {
	    view.dragDeselect(div);
		var items = [item];
		var sel = view.getSelection();
		if (sel.length) {
			var vec = AjxVector.fromArray(sel);
			if (vec.contains(item))
				items = sel;
		}
		var tag = ev.srcData;
		this._schedule(this._doTag, {items: items, tag: tag, bTag: true});
	} else if (ev.action == DwtDropEvent.DRAG_LEAVE) {
		view.dragDeselect(div);
	} else if (ev.action == DwtDropEvent.DRAG_OP_CHANGED) {
	}
}

// Dialog callbacks

// Created a new tag, now apply it.
ZmListController.prototype._tagChangeListener = 
function(ev) {
	// only process if current view is this view!
	if (this._app.getAppViewMgr().getCurrentView() == this._getViewType()) {
		if (ev.type == ZmEvent.S_TAG && ev.event == ZmEvent.E_CREATE && this._creatingTag) {
			this._schedule(this._doTag, {items: this._pendingActionData, tag: ev.source, bTag: true});
			this._creatingTag = false;
			this._pendingActionData = null;
			this._popdownActionListener();
		}
	}
}

// Create a folder.
ZmListController.prototype._newFolderCallback =
function(args) {
	this._appCtxt.getNewFolderDialog().popdown();
	var ftc = this._appCtxt.getOverviewPanelController().getFolderTreeController();
	this._schedule(ftc._doCreate, {name: args[0], parent: args[1]});
}

// Create a tag.
ZmListController.prototype._newTagCallback =
function(args) {
	this._appCtxt.getNewTagDialog().popdown();
	var ttc = this._appCtxt.getOverviewPanelController().getTagTreeController();
	this._schedule(ttc._doCreate, {name: args[1], color: args[2]});
	this._creatingTag = args[0];
}

// Move stuff to a new folder.
ZmListController.prototype._moveCallback =
function(args) {
	this._schedule(this._doMove, {items: this._pendingActionData, folder: args[0]});
	this._clearDialog(this._appCtxt.getMoveToDialog());
}

// Data handling

// Flag/unflag an item
ZmListController.prototype._doFlag =
function(params) {
	try {
		this._list.flagItems(params.items, "flag", !params.items[0].isFlagged);
	} catch (ex) {
		this._handleException(ex, this._doFlag, params, false);
	}
}

// Tag/untag items
ZmListController.prototype._doTag =
function(params) {
	try {
		this._list.tagItems(params.items, params.tag.id, params.bTag);
	} catch (ex) {
		this._handleException(ex, this._doTag, params, false);
	}
}

// Remove all tags for given items
ZmListController.prototype._doRemoveAllTags = 
function(items) {
	try {
		this._list.removeAllTags(items);
	} catch (ex) {
		this._handleException(ex, this._doRemoveAllTags, items, false);
	}
}

// Delete items - moves them to Trash unless hardDelete is set, in which case they are
// physically deleted
ZmListController.prototype._doDelete =
function(params) {
	try {
		this._list.deleteItems(params.items, params.hardDelete);
		this._checkReplenish();
	} catch (ex) {
		this._handleException(ex, this._doDelete, params, false);
	}
}

// Move items to a different folder
ZmListController.prototype._doMove =
function(params) {
	try {
		this._list.moveItems(params.items, params.folder);
		this._checkReplenish();
	} catch (ex) {
		this._handleException(ex, this._doMove, params, false);
	}
}

// Modify an item
ZmListController.prototype._doModify =
function(params) {
	try {
		this._list.modifyItems(params.items, params.mods);
	} catch (ex) {
		this._handleException(ex, this._doModify, params, false);
	}
}

// Create an item. We need to be passed a list since we may not have one.
ZmListController.prototype._doCreate =
function(params) {
	try {
		params.list.create(params.args);
	} catch (ex) {
		this._handleException(ex, this._doCreate, params, false);
	}
}

// Miscellaneous

// Adds the same listener to all of a menu's items
ZmListController.prototype._propagateMenuListeners =
function(parent, op, listener) {
	if (!parent) return;
	listener = listener || this._listeners[op];
	var opWidget = parent.getOp(op);
	if (opWidget) {
		var menu = opWidget.getMenu();
	    var items = menu.getItems();
		var cnt = menu.getItemCount();
		for (var i = 0; i < cnt; i++)
			items[i].addSelectionListener(listener);
	}
}

// Add listener to tag menu
ZmListController.prototype._setupTagMenu =
function(parent) {
	if (!parent) return;
	var tagMenu = parent.getTagMenu();
	if (tagMenu)
		tagMenu.addSelectionListener(this._listeners[ZmOperation.TAG]);
	if (parent instanceof ZmButtonToolBar) {
		var tagButton = parent.getOp(ZmOperation.TAG_MENU);
		if (tagButton)
			tagButton.addDropDownSelectionListener(this._listeners[ZmOperation.TAG_MENU]);
	}
}

// Dynamically build the tag menu based on selected items and their tags.
ZmListController.prototype._setTagMenu =
function(parent) {
	if (!parent) return;
	var tagOp = parent.getOp(ZmOperation.TAG_MENU);
	if (tagOp) {
		var tagMenu = parent.getTagMenu();
		// dynamically build tag menu add/remove lists
		var items = this._listView[this._currentView].getSelection();
		if (items instanceof ZmItem)
			items = [items];
		tagMenu.set(items, this._tagList);
		if (parent instanceof ZmActionMenu)
			tagOp.setText(this._getTagMenuMsg(items.length));
		else
			tagMenu.popup();
	}
}

// Set the view menu's icon, and make sure the appropriate list item is checked
ZmListController.prototype._setViewMenu =
function(view) {
	var appToolbar = this._appCtxt.getCurrentAppToolbar();
	appToolbar.showViewMenu(view);
    var menu = appToolbar.getViewButton().getMenu();
    var mi = menu.getItemById(ZmOperation.MENUITEM_ID, view);
    if (mi)
		mi.setChecked(true, true);
}

// Set up the New button based on the current app.
ZmListController.prototype._setNewButtonProps =
function(view, toolTip, enabledIconId, disabledIconId, defaultId) {
	var newButton = this._toolbar[view].getButton(ZmOperation.NEW_MENU);
	if (newButton) {
		newButton.setToolTipContent(toolTip);
		newButton.setImage(enabledIconId);
		newButton.setDisabledImage(disabledIconId);
		this._defaultNewId = defaultId;
	}
}

// Sets text to "add" or "edit" based on whether a participant is a contact or not.
ZmListController.prototype._setContactText =
function(isContact) {
	var newOp = isContact ? ZmOperation.EDIT_CONTACT : ZmOperation.NEW_CONTACT;
	var newText = isContact ? null : LmMsg.AB_ADD_CONTACT;
	ZmOperation.setOperation(this._toolbar[this._currentView], ZmOperation.CONTACT, newOp, LmMsg.AB_ADD_CONTACT);
	ZmOperation.setOperation(this._actionMenu, ZmOperation.CONTACT, newOp, newText);
}

// Resets the available options on a toolbar or action menu.
ZmListController.prototype._resetOperations = 
function(parent, num) {
	if (!parent) return;
	if (num == 0) {
		parent.enableAll(false);
		parent.enable(ZmOperation.NEW_MENU, true);
	} else if (num == 1) {
		parent.enableAll(true);
	} else if (num > 1) {
		// enable only the tag and delete operations
		parent.enableAll(false);
		parent.enable([ZmOperation.NEW_MENU, ZmOperation.TAG_MENU, ZmOperation.DELETE, ZmOperation.MOVE], true);
	}
}

// Pagination

ZmListController.prototype._search = 
function(view, offset, limit, callback, isCurrent) {
	var sortBy = this._appCtxt.get(ZmSetting.SORTING_PREF, view);
	var type = this._getItemType();
	var types = AjxVector.fromArray([type]);
	var sc = this._appCtxt.getSearchController();
	var search = new ZmSearch(this._appCtxt, this._searchString, types, sortBy, offset, limit);
	if (isCurrent)
		this._currentSearch = search;
	var obj = {"searchFieldAction": ZmSearchController.LEAVE_SEARCH_TXT};
	sc.redoSearch(search, callback, obj);
}

// Get next or previous page of mail items, using last search as base.
// loadIndex is the index'd item w/in the list that needs to be loaded - 
// initiated only when user is in CV and pages a conversation that has not 
// been loaded yet. Also added a return value indicating whether the page was 
// cached or not to allow calling method to react accordingly.
ZmListController.prototype._paginate = 
function(view, bPageForward, loadIndex) {
	var offset = this._listView[view].getNewOffset(bPageForward);
	var limit = this._listView[view].getLimit();
	bPageForward ? this.currentPage++ : this.currentPage--;
	this.maxPage = Math.max(this.maxPage, this.currentPage);
	DBG.println(AjxDebug.DBG2, "current page is now: " + this.currentPage);

	this._listView[view].setOffset(offset);
	
	// if offset + limit has not been cached and more convs are available to d/l, 
	if ((offset + limit > this._list.size() && this._list.hasMore()) || this.pageIsDirty[this.currentPage]) {

		// attempt to fetch the remaining page that needs fetching 
		// (i.e. if user deleted a conv on the previous page)
		var delta = offset + limit - this._list.size();
		// set max to fetch only up to what we need
		var max = delta < limit && delta > 0 ? delta : limit;
		
		if (max < limit)
			offset = ((offset + limit) - max) + 1;

		// get remainder convs from server
		var callback = new AjxCallback(this, this._paginateCallback, [view, loadIndex, false]);
		this._search(view, offset, max, callback, true);
		return false; // means page was not cached
	} 
	
	this._resetOperations(this._toolbar[view], 0);
	this._resetNavToolBarButtons(view);
	this._setViewContents(view);
	this._resetSelection();
	return true; // means page was cached
}

ZmListController.prototype._paginateCallback = 
function(args) {
	var view = args[0];
	var bSaveSelection = args[2];
	var searchResult = args[3];
	
	// update more flag
	this._list.setHasMore(searchResult.getAttribute("more"));
	
	// cache search results into internal list
	this._cacheList(searchResult);
	
	this._resetOperations(this._toolbar[view], 0);
	this._resetNavToolBarButtons(view);

	// save selection if need be...
	var selItem = bSaveSelection === true ? this._listView[this._currentView].getSelection()[0] : null;
	var selectedIdx = selItem ? this._listView[this._currentView]._getItemIndex(selItem) : -1;
	
	this._setViewContents(view);
	this.pageIsDirty[this.currentPage] = false;
	this._resetSelection(selectedIdx);
}


ZmListController.prototype._checkReplenish = 
function() {
	var view = this._listView[this._currentView];
	var list = view.getList();
	// dont bother if the view doesnt really have a list
	if (list) {
		var replCount = view.getLimit() - view.size();
		if (replCount > view.getReplenishThreshold())
			this._replenishList(this._currentView, replCount);
	}
}

ZmListController.prototype._replenishList = 
function(view, replCount) {
	// determine if there are any more items to replenish with
	var idxStart = this._listView[view].getOffset() + this._listView[view].size();
	var totalCount = this._list.size();
	
	if (idxStart < totalCount) {
		// replenish from cache
		var idxEnd = idxStart + replCount;
		if (idxEnd > totalCount)
			idxEnd = totalCount;
		var list = this._list.getVector().getArray();
		var sublist = list.slice(idxStart, idxEnd);
		var subVector = AjxVector.fromArray(sublist);
		this._listView[view].replenish(subVector);
	} else {
		// replenish from server request
		this._getMoreToReplenish(view, replCount);
	}
}

ZmListController.prototype._resetSelection = 
function(idx) {
	var list = this._listView[this._currentView].getList();
	if (list) {
		var selIdx = idx >= 0 ? idx : 0;
		var first = list.get(selIdx);
		this._listView[this._currentView].setSelection(first, false, true);
	}
}

/**
* Requests replCount items from the server to replenish current listview
*
* @param view		current view to replenish
* @param replCount 	number of items to replenish
*/
ZmListController.prototype._getMoreToReplenish = 
function(view, replCount) {
	if (this._list.hasMore()) {
		var offset = this._list.size();
		var callback = new AjxCallback(this, this._replenishCallback, view);
		this._search(view, offset, replCount, callback);
	} else {
		if (this._listView[view].size() == 0)
			this._listView[view]._setNoResultsHtml();
	}
}

ZmListController.prototype._replenishCallback = 
function(args) {
	var view = args[0];
	var searchResult = args[1];
	
	// set updated has more flag
	var more = searchResult.getAttribute("more");
	this._list.setHasMore(more);
	
	// cache search results into internal list
	this._cacheList(searchResult);

	// update view w/ replenished items
	var list = searchResult.getResults(this._getItemType()).getVector();
	this._listView[view].replenish(list);

	// reset forward pagination button only
	this._toolbar[view].enable(ZmOperation.PAGE_FORWARD, more);
}

ZmListController.prototype._setNavToolBar = 
function(toolbar) {
	this._navToolBar = toolbar;
	if (this._navToolBar) {
		var navBarListener = new AjxListener(this, this._navBarListener);
		if (this._navToolBar.hasSingleArrows) {
			this._navToolBar.addSelectionListener(ZmOperation.PAGE_BACK, navBarListener);
			this._navToolBar.addSelectionListener(ZmOperation.PAGE_FORWARD, navBarListener);
		}
		if (this._navToolBar.hasDoubleArrows) {
			this._navToolBar.addSelectionListener(ZmOperation.PAGE_DBL_BACK, navBarListener);
			this._navToolBar.addSelectionListener(ZmOperation.PAGE_DBL_FORW, navBarListener);
		}
	}
}

ZmListController.prototype._resetNavToolBarButtons = 
function(view) {
	if (!this._navToolBar) return;

	if (this._navToolBar.hasDoubleArrows)
		this._navToolBar.enable([ZmOperation.PAGE_DBL_BACK, ZmOperation.PAGE_DBL_FORW], false);

	if (this._navToolBar.hasSingleArrows) {
		var offset = this._listView[view].getOffset();
		this._navToolBar.enable(ZmOperation.PAGE_BACK, offset > 0);
	
		// determine also if we have more cached conv to show (in case more is wrong)
		var hasMore = this._list ? this._list.hasMore() : false;
		var evenMore = this._list ? (offset + this._listView[view].getLimit()) < this._list.size() : false;
	
		this._navToolBar.enable(ZmOperation.PAGE_FORWARD, (hasMore || evenMore));
	}
}

ZmListController.prototype._showListRange = 
function(view) {
	var offset = this._listView[view].getOffset();
	var limit = this._listView[view].getLimit();
	var size = this._list.size();
	var start = offset + 1;
	var end = Math.min(offset + limit, size);
	this._navToolBar.setText(start + " - " + end);	
}

// default callback before a view is shown - enable/disable nav buttons
ZmListController.prototype._preShowCallback =
function(view, viewPushed) {
	this._resetNavToolBarButtons(view);
	return true;
}
