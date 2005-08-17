function ZmMoveToDialog(parent, msgDialog, className, folderTree) {

	var newButton = new DwtDialog_ButtonDescriptor(ZmMoveToDialog.NEW_BUTTON, ZmMsg._new, DwtDialog.ALIGN_LEFT);
	ZmDialog.call(this, parent, msgDialog, className, ZmMsg.move, [newButton]);

	this.setContent(this._contentHtml());
	this._setFolderTree(folderTree, null, this._folderTreeCellId, null, true);

	this.registerCallback(ZmMoveToDialog.NEW_BUTTON, this._showNewDialog, this);
	this._changeListener = new AjxListener(this, this._folderTreeChangeListener);

	this._creatingFolder = false;
}

ZmMoveToDialog.prototype = new ZmDialog;
ZmMoveToDialog.prototype.constructor = ZmMoveToDialog;

ZmMoveToDialog.NEW_BUTTON = DwtDialog.LAST_BUTTON + 1;

ZmMoveToDialog.prototype.toString = 
function() {
	return "ZmMoveToDialog";
}

ZmMoveToDialog.prototype.popup =
function(data, loc) {
	var omit = new Object();
	omit[ZmFolder.ID_DRAFTS] = true;
	if (data instanceof ZmFolder) {
		this._folder = data;
		omit[ZmFolder.ID_SPAM] = true;
	} else {
		this._items = data;
	}

	this._folderTree.removeChangeListener(this._changeListener);
	var folders = [ZmFolder.ID_USER];
	this._folderTreeView.set(this._folderTree, folders, false, omit);
	// this listener has to be added after folder tree view is set (so that it comes after the view's standard change listener)
	this._folderTree.addChangeListener(this._changeListener);

	ZmDialog.prototype.popup.call(this, loc);
	if (this._appCtxt.get(ZmSetting.USER_FOLDERS_ENABLED)) {
		var userFolder = this._folderTree.getById(ZmFolder.ID_USER);
		var ti = this._folderTreeView.getTreeItemById(userFolder.id);
		ti.setExpanded(true);
		if (this._folder)
			this._folderTreeView.setSelected(userFolder);
	}
}

ZmMoveToDialog.prototype._contentHtml = 
function() {
	this._folderTreeCellId = Dwt.getNextId();
	var html = new Array();
	var idx = 0;
	html[idx++] = "<table cellpadding='0' cellspacing='0' border='0'>";
	html[idx++] = "<tr><td class='Zabel' colspan=2>" + ZmMsg.targetFolder + ":</td></tr>";
	html[idx++] = "<tr><td colspan=2 id='" + this._folderTreeCellId + "'/></tr>";
	html[idx++] = "</table>";
	
	return html.join("");
}

ZmMoveToDialog.prototype._showNewDialog =
function() {
	var dialog = this._appCtxt.getNewFolderDialog();
	dialog.reset();
	dialog.registerCallback(DwtDialog.OK_BUTTON, this._newCallback, this);
	dialog.popup(null, this);
}

ZmMoveToDialog.prototype._newCallback =
function(args) {
	var ftc = this._appCtxt.getOverviewPanelController().getFolderTreeController();
	ftc._schedule(ftc._doCreate, {name: args[0], parent: args[1]});
	this._appCtxt.getNewFolderDialog().popdown();
	this._creatingFolder = true;
}

ZmMoveToDialog.prototype._folderTreeChangeListener =
function(ev) {
	if (ev.event == ZmEvent.E_CREATE && this._creatingFolder) {
		this._folderTreeView.setSelected(ev.source, true);
		this._creatingFolder = false;
	}
}

ZmMoveToDialog.prototype._okButtonListener =
function(ev) {
	var msg;
	var tgtFolder = this._folderTreeView.getSelected();
	if (!tgtFolder)
		msg = ZmMsg.noTargetFolder;

	// moving a folder, check for valid target
	if (!msg && this._folder &&	!tgtFolder.mayContain(this._folder))
	    msg = ZmMsg.badTargetFolder;

	// moving items, check for valid target
	if (!msg && !this._folder && !tgtFolder.mayContain(this._items))
		msg = ZmMsg.badTargetFolderItems;

	if (msg)
		this._showError(msg);
	else
		DwtDialog.prototype._buttonListener.call(this, ev, [tgtFolder]);
}
