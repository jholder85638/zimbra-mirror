/*
 * ***** BEGIN LICENSE BLOCK *****
 * 
 * Zimbra Collaboration Suite Web Client
 * Copyright (C) 2007 Zimbra, Inc.
 * 
 * The contents of this file are subject to the Yahoo! Public License
 * Version 1.0 ("License"); you may not use this file except in
 * compliance with the License.  You may obtain a copy of the License at
 * http://www.zimbra.com/license.
 * 
 * Software distributed under the License is distributed on an "AS IS"
 * basis, WITHOUT WARRANTY OF ANY KIND, either express or implied.
 * 
 * ***** END LICENSE BLOCK *****
 */

/**
 * Creates an account object containing meta info about the account
 * @constructor
 * @class
 * An account object is created primarily if a user has added subaccounts that
 * he would like to manage (i.e. family mailbox).
 *
 * @author Parag Shah
 *
 * @param id			[string]*		unique ID for this account
 * @param name			[string]*		email address
 * @param visible		[boolean]*		if true, make this account available in the overview (child accounts)
 */
ZmZimbraAccount = function(id, name, visible, list) {

	ZmAccount.call(this, ZmAccount.ZIMBRA, id, name, list);
	this.visible = (visible !== false);

	this.settings = null;
	this.trees = {};
	this.loaded = false;
};

ZmZimbraAccount.prototype = new ZmAccount;
ZmZimbraAccount.prototype.constructor = ZmZimbraAccount;

ZmZimbraAccount.prototype.toString =
function() {
	return "ZmZimbraAccount";
};


//
// Constants
//

ZmAccount.ZIMBRA			= "Zimbra";
ZmZimbraAccount.DEFAULT_ID	= "main";


//
// Public methods
//

ZmZimbraAccount.prototype.setName =
function(name) {
	var identity = this.getIdentity();
	// TODO: If no identity and name is set, should create one!
	if (!identity) return;
	identity.name = name;
};

ZmZimbraAccount.prototype.getName =
function() {
	var identity = this.getIdentity();
	var name = (!identity)
		? this.settings.get(ZmSetting.DISPLAY_NAME)
		: identity.name;

	if (!name) {
		name = this.getDisplayName();
	}
	return name;
}

ZmZimbraAccount.prototype.setEmail =
function(email) {} // IGNORE

ZmZimbraAccount.prototype.getEmail =
function() {
	return this.name;
};

ZmZimbraAccount.prototype.getDisplayName =
function() {
	var dispName = this.isMain
		? this.settings.get(ZmSetting.DISPLAY_NAME)
		: this.displayName;
	return (dispName || this.name);
};

ZmZimbraAccount.prototype.getIdentity =
function() {
	if (this.isMain) {
		return appCtxt.getIdentityCollection().defaultIdentity;
	}

	if (!this.dummyIdentity) {
		this.dummyIdentity = new ZmIdentity(this.name);
	}
	return this.dummyIdentity;
};

ZmZimbraAccount.createFromDom =
function(node) {
	var acct = new ZmZimbraAccount();
	acct._loadFromDom(node);
	return acct;
};

ZmZimbraAccount.prototype.load =
function(callback, batchCmd) {
	if (!this.loaded) {
		// create new ZmSetting for this account
		this.settings = new ZmSettings();

		// check "{APP}_ENABLED" state against main account's settings
		var mainAcct = appCtxt.getMainAccount();

		// for all *loaded* apps, add their app-specific settings
		for (var i = 0; i < ZmApp.APPS.length; i++) {
			var appName = ZmApp.APPS[i];
			var setting = ZmApp.SETTING[appName];
			if (setting && appCtxt.get(setting, null, mainAcct)) {
				var app = appCtxt.getApp(appName);
				if (app) {
					app._registerSettings(this.settings);
				}
			}
		}

		// load user settings retrieved from server now
		var respCallback = new AjxCallback(this, this._handleResponseLoad, callback);
		var errorCallback = new AjxCallback(this, this._handleErrorLoad);
		this.settings.loadUserSettings(respCallback, errorCallback, this.name, batchCmd);
	} else {
		if (callback) {	callback.run(); }
	}
};

ZmZimbraAccount.prototype.save =
function(callback, errorCallback, batchCmd) {
	return (this.getIdentity().save(callback, errorCallback, batchCmd));
};

//
// Protected methods
//

ZmZimbraAccount.prototype._handleResponseLoad =
function(callback, result) {
	DBG.println(AjxDebug.DBG1, "Account settings successfully loaded for " + this.name);

	// initialize identities/data-sources/signatures for this account
	var obj = result.getResponse().GetInfoResponse
	appCtxt.getIdentityCollection().initialize(obj.identities);
	AjxDispatcher.run("GetDataSourceCollection").initialize(obj.dataSources);
	appCtxt.getSignatureCollection().initialize(obj.signatures);

	var soapDoc = AjxSoapDoc.create("GetFolderRequest", "urn:zimbraMail");
	var method = soapDoc.getMethod();
	method.setAttribute("visible", "1");

	var params = {
		soapDoc: soapDoc,
		accountName: this.name,
		asyncMode: true,
		callback: new AjxCallback(this, this._handleResponseLoad1, callback)
	};
	appCtxt.getRequestMgr().sendRequest(params);
};

ZmZimbraAccount.prototype._handleResponseLoad1 =
function(callback, result) {
	var resp = result.getResponse().GetFolderResponse;
	var folders = resp ? resp.folder[0] : null;
	if (folders) {
		appCtxt.getRequestMgr()._loadTree(ZmOrganizer.FOLDER, null, resp.folder[0], "folder", this);
		appCtxt.getRequestMgr()._loadTree(ZmOrganizer.TAG, null, resp.tags, null, this);
	}

	this.loaded = true;

	if (callback) {
		callback.run(this);
	}
};

ZmZimbraAccount.prototype._handleErrorLoad =
function(ev) {
	DBG.println(AjxDebug.DBG1, "------- ERROR loading account settings for " + this.name);
};

ZmZimbraAccount.prototype._loadFromDom =
function(node) {
	this.id = node.id;
	this.name = node.name;
	this.visible = node.visible;

	var data = (node.attrs && node.attrs[0]) ? node.attrs[0].attr[0] : null;
	this.displayName = data && data.name == "displayName" ? data._content : this.email;
};
