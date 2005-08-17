/**
* Creates an empty message controller.
* @constructor
* @class
* This class controls the display and management of a single message in the content area. Since it
* needs to handle pretty much the same operations as a list, it extends ZmMailListController.
*
* @author Parag Shah
* @author Conrad Damon
* @param appCtxt	app context
* @param container	containing shell
* @param mailApp	containing app
*/
function ZmMsgController(appCtxt, container, mailApp) {

	ZmMailListController.call(this, appCtxt, container, mailApp);
}

ZmMsgController.prototype = new ZmMailListController;
ZmMsgController.prototype.constructor = ZmMsgController;

// Public methods

ZmMsgController.prototype.toString = 
function() {
	return "ZmMsgController";
}

/**
* Displays a message in the single-pane view.
*
* @param msg		the message to display
* @param conv		the conv to which the message belongs, if any
*/
ZmMsgController.prototype.show = 
function(msg, mode) {
	this.setMsg(msg);
	this._mode = mode;
	this._currentView = this._getViewType();
	this._list = msg.list;
	if (!msg.isLoaded())
		msg.load(this._appCtxt.get(ZmSetting.VIEW_AS_HTML));

	this._setup(this._currentView);
	this._resetOperations(this._toolbar[this._currentView], 1); // enable all buttons
	var elements = new Object();
	elements[ZmAppViewMgr.C_TOOLBAR_TOP] = this._toolbar[this._currentView];
	elements[ZmAppViewMgr.C_APP_CONTENT] = this._listView[this._currentView];
	this._setView(this._currentView, elements);
}

// Private methods (mostly overrides of ZmListController protected methods)

ZmMsgController.prototype._getToolBarOps = 
function() {
	var list = this._standardToolBarOps();
	list.push(ZmOperation.SEP);
	list = list.concat(this._msgOps());
	list.push(ZmOperation.SEP);
	list.push(ZmOperation.SPAM);
	list.push(ZmOperation.SEP);
	list.push(ZmOperation.CLOSE);
	return list;
}

ZmMsgController.prototype._getActionMenuOps =
function() {
	return null;
}

ZmMsgController.prototype._getViewType = 
function() {
	return ZmController.MSG_VIEW;
}

ZmMsgController.prototype._defaultView = 
function() {
	return ZmController.MSG_VIEW;
}

ZmMsgController.prototype._initializeListView = 
function(view) {
	if (!this._listView[view]) {
		this._listView[view] = new ZmMailMsgView(this._container, null, Dwt.ABSOLUTE_STYLE, ZmController.MSG_VIEW);
		this._listView[view].addInviteReplyListener(this._inviteReplyListener);
	}
}

ZmMsgController.prototype.getReferenceView = 
function () {
	return this._listView[this._currentView];
};

ZmMsgController.prototype._getSearchFolderId = 
function() {
	return this._msg.list.search.folderId;
}

ZmMsgController.prototype._getTagMenuMsg = 
function() {
	return ZmMsg.tagMessage;
}

ZmMsgController.prototype._getMoveDialogTitle = 
function() {
	return ZmMsg.moveMessage;
}

ZmMsgController.prototype._setViewContents =
function(view) {
	this._listView[view].set(this._msg);
}

ZmMsgController.prototype._resetNavToolBarButtons = 
function(view) {
	// NOTE: we purposely do not call base class here!
	
	var list = this._msg.list.getVector();
	
	this._navToolBar.enable(ZmOperation.PAGE_BACK, list.get(0) != this._msg);
	
	var bEnableForw = this._msg.list.hasMore() || (list.getZast() != this._msg);
	this._navToolBar.enable(ZmOperation.PAGE_FORWARD, bEnableForw);
	
	this._navToolBar.setToolTip(ZmOperation.PAGE_BACK, ZmMsg.previous + " " + ZmMsg.message);	
	this._navToolBar.setToolTip(ZmOperation.PAGE_FORWARD, ZmMsg.next + " " + ZmMsg.message);
}

ZmMsgController.prototype._paginate = 
function(view, bPageForward) {
	// NOTE: do not call base class.
	var controller = this._mode == ZmController.TRAD_VIEW 
		? this._app.getTradController() 
		: this._app.getConvController();

	if (controller) {
		controller.pageItemSilently(this._msg, bPageForward);
		this._resetNavToolBarButtons(view);
	}
}

ZmMsgController.prototype._processPrePopView = 
function(view) {
	this._resetNavToolBarButtons(view);
}

ZmMsgController.prototype._popdownActionListener = 
function(ev) {
	// dont do anything since msg view has no action menus
}

// Actions

// Override so we can pop view
ZmMsgController.prototype._doDelete = 
function(params) {
	ZmMailListController.prototype._doDelete.call(this, params);
	this._app.popView();
}

// Override so we can pop view
ZmMsgController.prototype._doMove = 
function(params) {
	ZmMailListController.prototype._doMove.call(this, params);
	this._app.popView();
}

// Override so we can pop view
ZmMsgController.prototype._doSpam = 
function(params) {
	ZmMailListController.prototype._doSpam.call(this, params);
	this._app.popView();
}

// Miscellaneous

// Returns the message currently being displayed.
ZmMsgController.prototype._getMsg =
function() {
	return this._msg;
}

ZmMsgController.prototype.setMsg =
function (msg) {
	this._msg = msg;
};

// No-op replenishment
ZmMsgController.prototype._checkReplenish =
function(params) {
	// XXX: remove this when replenishment is fixed for msg controller!
	DBG.println("SORRY. NO REPLENISHMENT FOR YOU.");
}
