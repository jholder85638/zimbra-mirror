ZmOffline = function(){
    this._convIds = [];
    ZmOffline.CONVERSATION = "conversation";
    ZmOffline.MESSAGE = "message";
    ZmOffline.appCacheDone = false;
    ZmOffline.messageNotShowed = true;
    ZmOffline.cacheMessageLimit = 500;
    ZmOffline.cacheProgress = [];
    ZmOffline.cacheConversationLimit = 500;
    ZmOffline.folders = ["inbox", "sent", "drafts"]; // Should be configured
    ZmOffline.offlineFolderIds = ["2", "5", "6"];
    ZmOffline.ZmOfflineStore = "ZmOfflineStore";
    ZmOffline.syncStarted = false;
    ZmOffline._syncInProgress = false;

    ZmOffline.store = [];
    for (var i=0, length = ZmOffline.folders.length;i<length;i++){
        ZmOffline.store.push(ZmOffline.folders[i] + ZmOffline.MESSAGE);
        //ZmOffline.store.push(ZmOffline.folders[i] + ZmOffline.CONVERSATION);
    }
};

ZmOffline._checkCacheDone =
function (){
    if (ZmOffline.appCacheDone && ZmOffline.cacheProgress.length === 0 && ZmOffline.syncStarted && ZmOffline.messageNotShowed){
        appCtxt.setStatusMsg(ZmMsg.offlineCachingDone, ZmStatusView.LEVEL_INFO);
        ZmOffline.messageNotShowed = false;
    }
};

ZmOffline._checkAppCacheDone =
function (){
    ZmOffline.appCacheDone = true;
    ZmOffline._checkCacheDone();
};

ZmOffline.prototype.init =
function(cb){
    if (!appCtxt.isOfflineMode()){
        window.applicationCache.addEventListener('cached', function(e) {
            ZmOffline._checkAppCacheDone();
        }, false);

        window.applicationCache.addEventListener('noupdate', function(e) {
            ZmOffline._checkAppCacheDone();
        }, false);
    }

    var callback = (appCtxt.isOfflineMode()) ? this.setOffline.bind(this, cb) : this._cacheData.bind(this, cb);
    ZmOfflineDB.indexedDB.open(callback);
    this._addListeners();
};

ZmOffline.prototype.setOffline =
function(callback){
    callback();
    window.setTimeout(this._setNetwork.bind(this), 3000);
};

ZmOffline.prototype.setItem =
function(key, value, objStore) {
    try{
        if (key){
            ZmOfflineDB.indexedDB.setItem(key, value, objStore);
        }
    }catch(ex){
        DBG.println(AjxDebug.DBG1, ex);
    }
};

ZmOffline.prototype.getItem =
function(key, callback, params, objStore) {

    if ($.inArray(objStore, ZmOffline.store) === -1 && objStore !== ZmOffline.ZmOfflineStore){
        return;
    }
    var searchRequest = params && params.jsonObj && params.jsonObj.SearchRequest;
    if (searchRequest && searchRequest._jsns === "urn:zimbraMail" ){
        this._syncSearchRequest(callback, objStore, params)
        return;
    }

    if (key){
      ZmOfflineDB.indexedDB.getItem(key, callback, params, objStore);
    }
};
ZmOffline.prototype._addListeners =
function(){
    $( window ).bind("online offline",this._setNetwork.bind(this));
    $(window).bind("online", this._replayOfflineRequest.bind(this));
};


ZmOffline.prototype._setNetwork =
function() {
    var containerEl = document.getElementById(ZmId.SKIN_NETWORK);
	if (!containerEl) {
		return;
	}
    var isOffline = appCtxt.isOfflineMode();
    if (isOffline){
        this._enableApps(false);
    }

    if (isOffline && !appCtxt.networkBtn){
        var button = new DwtToolBarButton({parent:DwtShell.getShell(window), id: ZmId.OP_GO_OFFLINE});
        button.setImage("Disconnect");
        button.setToolTipContent(ZmMsg.networkChangeWebOffline, true);
        button.reparentHtmlElement(ZmId.SKIN_NETWORK);
        appCtxt.networkBtn = button;
    } else if (!isOffline){
        Dwt.removeChildren(containerEl);
        appCtxt.networkBtn = null;
        //this.sendSyncRequest();
    }
};

ZmOffline.prototype._enableApps =
function(opt){
   var supportedApps = [ZmApp.MAIL];
    for (var id in ZmApp.CHOOSER_SORT) {
        if (supportedApps.indexOf(id) !== -1){
            continue;
        }
        var appChooser = appCtxt.getAppChooser();
        if (appChooser){
            var app = appChooser.getButton(id);
            if (app){
                app.setEnabled(opt);
            }
        }
    }
    this._enableMailFeatures(opt);
};

ZmOffline.prototype._cacheData =
function(callback){
    callback();
    this._fixLazyCSSLoadIssues(); // To be addressed in different way
    window.setTimeout(this._cacheMailData.bind(this), localStorage.getItem("syncToken") ? 0 : 5000);
};

// Mail

ZmOffline.prototype._cacheMailData =
function(){
    appCtxt.setStatusMsg(ZmMsg.offlineCachingSync, ZmStatusView.LEVEL_INFO);
    if (!localStorage.getItem("syncToken")){
        for (var i=0, length=ZmOffline.folders.length; i<length;i++){
            this._downloadMessages(ZmOffline.folders[i], 0, ZmOffline.cacheMessageLimit, ZmOffline.MESSAGE, "all", 1, null);
            //this._downloadMessages(ZmOffline.folders[i], 0, ZmOffline.cacheConversationLimit, ZmOffline.CONVERSATION, "u1", 1, this._loadConversations.bind(this, ZmOffline.folders[i] , this._convIds));
        }
    } else{
        this.sendSyncRequest();
    }
};



ZmOffline.prototype._fixLazyCSSLoadIssues =
function(){
		if (!ZmMailMsgView._CSS) {
			var cssUrl = appContextPath + "/css/msgview.css?v=" + cacheKillerVersion;
			var result = AjxRpc.invoke(null, cssUrl, null, null, true);
			ZmMailMsgView._CSS = result && result.text;
		}
};

ZmOffline.prototype._downloadMessages =
function(folder, offset, limit, type, fetch, html, callback){
var jsonObj = {SearchRequest:{_jsns:"urn:zimbraMail"}};
var request = jsonObj.SearchRequest;
    ZmOffline.cacheProgress.push(folder + type);
    ZmMailMsg.addRequestHeaders(request);
    request.offset = offset;
    request.limit = limit;
    request.types = type;
    request.fetch = fetch;
    request.html = html;
    request.query = "in:\"" + folder +"\""
	var respCallback = this._handleResponseLoadMsgs.bind(this, folder, type, callback || null);
	appCtxt.getRequestMgr().sendRequest({jsonObj:jsonObj, asyncMode:true, callback:respCallback});
};


ZmOffline.prototype._handleResponseLoadMsgs =
function(folder, type, callback, result){
    DBG.println(AjxDebug.DBG1, "_handleResponseLoadMsgs folder: " + folder + "  type: " + type);

    var searchResponse = result._data && result._data.SearchResponse;
    var isConv = (type === ZmOffline.CONVERSATION);
    var messages =  (isConv) ? searchResponse.c : searchResponse.m;
    if (!messages || (messages.length === 0) ){
        this._updateCacheProgress(folder + type);
        return;
    }
    for(var i=0, length = messages.length; i < length ; i++){
        if (isConv){
            this._convIds.push(messages[i].id)
        } else {
            this.addItem( messages[i], type, (folder + type));
        }
    }
    if (type === ZmOffline.MESSAGE){
        this._updateCacheProgress(folder + type);
    }
    if (callback){
        callback.run();
    }
};

ZmOffline.prototype._updateCacheProgress =
function(folderName){

    var index = $.inArray(folderName, ZmOffline.cacheProgress);
    if(index != -1){
        ZmOffline.cacheProgress.splice(index, 1);
    }
    if (ZmOffline.cacheProgress.length === 0){
        this.sendSyncRequest();
        ZmOffline._checkCacheDone();
    }
    DBG.println(AjxDebug.DBG1, "_updateCacheProgress folder: " + folderName + " ZmOffline.cacheProgress " + ZmOffline.cacheProgress.join());


};

ZmOffline.prototype._loadConversations =
function(store, convIds){
    if (!convIds || convIds.length === 0){
        return;
    }
    var soapDoc = AjxSoapDoc.create("BatchRequest", "urn:zimbra");
    soapDoc.setMethodAttribute("onerror", "continue");

    for (var i=0, length = convIds.length;i< length; i++) {
        var requestNode = soapDoc.set("GetConvRequest",null,null,"urn:zimbraMail");
        var conv = soapDoc.set("c", null, requestNode);
        conv.setAttribute("id", convIds[i]);
        conv.setAttribute("read", 0);
        conv.setAttribute("html", 1);
        conv.setAttribute("needExp", 1);
        conv.setAttribute("max", 250000);
        conv.setAttribute("fetch", "all");
        conv.setAttribute("header", ["{n:List-ID}","{n:X-Zimbra-DL}","{n:IN-REPLY-TO}"]);
     }

    var respCallback = this._cacheConversations.bind(this, store);
    appCtxt.getRequestMgr().sendRequest({
        soapDoc: soapDoc,
        asyncMode: true,
        callback: respCallback
    });

};

ZmOffline.prototype._cacheConversations  =
function(folder, result){
    var convs = result.getResponse().BatchResponse.GetConvResponse;
    if (!convs  || convs.length === 0){
        return;
    }
    var objStore = folder + ZmOffline.CONVERSATION;
    for (var i=0, length = convs.length || 0; i<length; i++){
        this.addItem(convs[i].c[0], ZmOffline.CONVERSATION, objStore);
    }
    var index = $.inArray(objStore, ZmOffline.cacheProgress);
    if(index != -1){
        ZmOffline.cacheProgress.splice(index, 1);
    }
    ZmOffline._checkCacheDone();
};

ZmOffline.prototype._getValue =
function(message, isConv){
    var result = {
   "Header":{
      "context":{
         "session":{
            "id":"offline_id",
            "_content":"offline_content"
         },
         "change":{
            "token":"offline_token"
         },
         "_jsns":"urn:zimbra"
      }
   },
   "Body":{},
    "_jsns":"urn:zimbraSoap"
    };
    if (isConv){
        result.Body.SearchConvResponse = {
         "_jsns": "urn:zimbraMail",
         "offset":"0",
         "sortBy":"dateDesc",
         "more":false,
         "_jsns":"urn:zimbraMail"
        }
        result.Body.SearchConvResponse.m = message.m;
    }else{
       result.Body.GetMsgResponse = {"m" : [message]};
    }
    return result;
};


ZmOffline.syncData =
function(){
    var groupMailBy = appCtxt.get(ZmSetting.GROUP_MAIL_BY);
    var mlc = (groupMailBy == ZmSetting.GROUP_BY_CONV) ? AjxDispatcher.run("GetConvListController") :  AjxDispatcher.run("GetTradController");
    mlc && mlc.runRefresh(); // Mails
    var clc = AjxDispatcher.run("GetContactListController");
    clc && clc.runRefresh(); // Contacts
    var cm = appCtxt.getCalManager();
    var cvc = cm && cm.getCalViewController();
    cvc && cvc.runRefresh(); // Appointments
};

ZmOffline.prototype.getSyncRequest =
function(){
    var syncToken = localStorage.getItem("syncToken");
    var soapDoc = AjxSoapDoc.create("SyncRequest", "urn:zimbraMail");
    if (syncToken) {
        soapDoc.set("token", syncToken);
    }
    return  soapDoc;

}

ZmOffline.prototype.isSyncInProgress =
function(){
  return ZmOffline._syncInProgress;
};

ZmOffline.prototype._setSyncInProgress =
function(value){
 ZmOffline._syncInProgress = value;
};

ZmOffline.prototype.sendSyncRequest =
function(){
    if (this.isSyncInProgress()){
        return;
    }
    this._setSyncInProgress(true);
	var syncReq = this.getSyncRequest();
	appCtxt.getAppController().sendRequest({
		soapDoc:syncReq,
		asyncMode:true,
		noBusyOverlay:true,
		callback:this.syncHandler.bind(this)
	});

};

ZmOffline.prototype.syncHandler =
function(result){
    var response = result && result.getResponse();
    var syncResponse = response && response.SyncResponse;
    var syncToken =  syncResponse.token;
    if (syncToken){
        localStorage.setItem("syncToken", syncToken);
    }
    ZmOffline.syncStarted = true;
    ZmOffline._checkCacheDone();
    this._processSyncData(syncResponse);  // To be called when user switchs from offline to online or first access
};

ZmOffline.prototype._processSyncData =
function(syncResponse){
    this._setSyncInProgress(false);
    if (!syncResponse){
        return;
    }

    // Handle delete
    this._handledeleteItems(syncResponse.deleted);

    this._handleUpdateItems(syncResponse.m, "message");

    //this._handleUpdateItems(syncResponse.c, "conversation");  Dependency on Bug#81962 (Need sync support for conversations)


};

ZmOffline.prototype._handledeleteItems =
function(deletedItems){

    if (!deletedItems || deletedItems.length == 0){
        return;
    }

    var ids = deletedItems[0].ids;

    if (ids){
        this._deleteItemByIds(ids.split(','));
    }

};

ZmOffline.prototype._handleUpdateItems =
function(items, type){

// Handle create and modify

    if (!items || items.length === 0 ){
        return;
    }

    var updated = [], created = [], deleted = [], item=null, folder = null;

    for (var i=0, length = items.length; i < length; i++){
        item = items[i];
        if (item.l === "2" || item.l === "6" || item.l === "5"){
            if (item.cid){
                updated.push(item);
            }else{
                created.push(item.id);
            }

        } else {
            deleted.push(item.id);
        }

    }

// Create

    if (created.length){
        this._loadMessages(created);
    }


// Modify

    if (updated.length){
        var store = null;
        for (var i=0, length = updated.length;i<length;i++){
            this.modifyItem(updated[i].id, updated[i], type);
        }
    }

    if (deleted.length){
        this._deleteItemByIds(deleted); // If messages are moved
    }

};

ZmOffline.prototype._updateItem =
function(type, modifiedItem, result){
    var store = null, callback = null;
    var folder =  this._getFolder(modifiedItem.l);
    var offlineItem = result && result.response && result.response.Body && result.response.Body.GetMsgResponse.m[0];

    DBG.println(AjxDebug.DBG1, "ZmOffline.prototype.modifyItem : offlineItem " + JSON.stringify(offlineItem));

    if (offlineItem){
        var prevFolder = offlineItem && this._getFolder(offlineItem.l);
        var prevKey = offlineItem && offlineItem.id;
        $.extend(offlineItem, modifiedItem);
        folder = this._getFolder(offlineItem.l);
        if (folder){
            callback = this.addItem.bind(this, offlineItem, type, (folder + type));
        }
        ZmOfflineDB.indexedDB.deteleItem(prevKey, (prevFolder + type), callback);
    } else {
        if (folder){
            this.addItem(modifiedItem, type, (folder + type));
        }
    }
};

ZmOffline.prototype._loadMessages =
function(msgIds){
    if (!msgIds || msgIds.length === 0){
        return;
    }
    var soapDoc = AjxSoapDoc.create("BatchRequest", "urn:zimbra");
    soapDoc.setMethodAttribute("onerror", "continue");
    for (var i=0, length = msgIds.length;i<length;i++){
        var requestNode = soapDoc.set("GetMsgRequest",null,null,"urn:zimbraMail");
        var msg = soapDoc.set("m", null, requestNode);
        msg.setAttribute("id", msgIds[i]);
        msg.setAttribute("read", 0);
        msg.setAttribute("html", 1);
        msg.setAttribute("needExp", 1);
        msg.setAttribute("max", 250000);
     }
    var respCallback = this._cacheMessages.bind(this);
    appCtxt.getRequestMgr().sendRequest({
        soapDoc: soapDoc,
        asyncMode: true,
        callback: respCallback
    });

};

ZmOffline.prototype._cacheMessages =
function(result){
    var response = result.getResponse();
    var msgs = response && response.BatchResponse.GetMsgResponse;
    this._putItems(msgs);

};

ZmOffline.prototype._putItems =
function(items){
    if (!items || items.length === 0 ){
        return;
    }
    var key = null, value = null, msg = null;
    for (var i=0, length = items.length; i<length; i++){
        msg = items[i].m[0];
        if (msg.l === "2" || msg.l === "5" || msg.l === "6"){  // Only inbox for now
            this.addItem(msg, ZmOffline.MESSAGE, this._getFolder(msg.l) + ZmOffline.MESSAGE );
        } else { // Message is moved
            ZmOfflineDB.indexedDB.deleteItemById(msg.id);
        }
    }
};


ZmOffline.prototype._syncSearchRequest =
function(callback, store, params){
    ZmOfflineDB.indexedDB.getAll(store, this._generateMsgSearchResponse.bind(this, callback, params, store), ZmOffline.cacheMessageLimit);
};

ZmOffline.prototype.syncFoldersMetaData =
function(){
    for (var i=0, length = ZmOffline.offlineFolderIds.length;i<length;i++){
        this.setFolderMetaData(ZmOffline.offlineFolderIds[i], localStorage.getItem(ZmOffline.offlineFolderIds[i]));
    }

};

ZmOffline.prototype.setFolderMetaData =
function(id, data){
    var folderData = JSON.parse(data);
    appCtxt.getById(id).numUnread = folderData.numUnread;
    appCtxt.getById(id).numTotal = folderData.numTotal;
    appCtxt.getById(id).sizeTotal = folderData.sizeTotal;
};


ZmOffline.prototype.storeFolderMetaData =
function(id, data){
    var folderData = {};
    folderData.numUnread = data.numUnread;
    folderData.numTotal = data.numTotal;
    folderData.sizeTotal = data.sizeTotal;
    localStorage.setItem(id, JSON.stringify(folderData));
};

ZmOffline.prototype.storeFoldersMetaData =
function(){
    for (var i=0, length = ZmOffline.offlineFolderIds.length;i<length;i++){
        this.storeFolderMetaData(ZmOffline.offlineFolderIds[i], appCtxt.getById(ZmOffline.offlineFolderIds[i]));
    }
};

ZmOffline.prototype._generateMsgSearchResponse =
function(callback, params, store, messages){
    var searchResponse = [];
    var response = {
   "Header":{
      "context":{
         "session":{
            "id":"offline_id",
            "_content":"offline_content"
         },
         "change":{
            "token":"offline_token"
         },
         "_jsns":"urn:zimbra"
      }
   },
   "Body":{
       "SearchResponse":{
           "sortBy": "dateDesc",
           "offset": 0,
           "more": false
       },
       "_jsns":"urn:zimbraSoap"
   }
   };
    for (i = (messages.length -1); i > -1 ; i--){
        var msg = this._getHeaders(messages[i], store);
        searchResponse.push(msg);
    }
    searchResponse = searchResponse.sort(function(item1, item2){
        if (item1['d'] === item2['d']){
            return ((Math.abs(parseInt(item1['id'])) < Math.abs(parseInt(item2['id'])) ) ? 1 : -1);
        }
        return ((item1['d'] < item2['d'] ) ? 1 : -1);
    });
    appCtxt._msgSearchResponse = searchResponse;
    if (store.match(/message$/)){
        response.Body.SearchResponse.m = searchResponse;
    } else {
        response.Body.SearchResponse.c = searchResponse;
    }

    if (!params._skipResponse){
        params.response = response;
    } else {
        params = null;
    }

    callback(params);
};

ZmOffline.prototype._getHeaders =
function(item, store){
    var headers = null;
    mailItem = item.value.Body;
    var headers = store.match(/message$/) ? mailItem.GetMsgResponse.m[0] : mailItem.SearchConvResponse.c;
    if (headers && headers.mp){
       delete (headers.mp)
    }
    return headers;
};

ZmOffline.prototype._replayOfflineRequest =
function() {
    var callback = this._sendOfflineRequest.bind(this);
    ZmOfflineDB.indexedDB.getAllItemsInRequestQueue(callback);
};

ZmOffline.prototype._sendOfflineRequest =
function(result) {

    if (!result || result.length === 0) {
        this._enableApps(!appCtxt.isOfflineMode());
        jQuery(document).trigger('OfflineRequestSent');
        return;
    }

    var batchCommand = new ZmBatchCommand(true, null, true),
        requestMgr = appCtxt.getRequestMgr(),
        obj,
        params,
        methodName;

    for (var i = 0, length = result.length; i < length; i++) {
        obj = result[i];
        methodName = obj.methodName;
        if (methodName) {
            if (methodName === "SendMsgRequest") {
                if (obj.offlineCreated) {// Newly created offline messages
                    delete obj[methodName].m.id;//Removing the temporary id
                }
            }
            params = {
                noBusyOverlay : true,
                asyncMode : true,
                callback : this._handleResponseSendOfflineRequest.bind(this, obj),
                jsonObj : {}
            };
            params.jsonObj[methodName] = obj[methodName];
            batchCommand.add(requestMgr.sendRequest.bind(requestMgr, params));
        }
    }
    batchCommand.run();
};

ZmOffline.prototype._checkOutboxQueue =
function(result) {
    if (!result || result.length === 0) {
        this._enableApps(!appCtxt.isOfflineMode());
        return;
    }
};

ZmOffline.prototype._handleResponseSendOfflineRequest =
function(obj) {
    var callback = ZmOfflineDB.indexedDB.getAllItemsInRequestQueue.bind(this, this._checkOutboxQueue.bind(this));
    ZmOfflineDB.indexedDB.deleteItemInRequestQueue(obj.oid, callback);
    var notify = {
        deleted : {
            id : obj.id.toString()
        },
        modified : {
            folder : [{
                id : ZmFolder.ID_OUTBOX,
                n : appCtxt.getById(ZmFolder.ID_OUTBOX).numTotal - 1
            }]
        }
    };
    appCtxt.getRequestMgr()._notifyHandler(notify);
};

/**
 * Adds conversation or message into the offline database.
 * @param {item}	message or conversation that needs to be added to offline database.
 * @param {type}    type of the mail item ("message" or "conversation").
 */

ZmOffline.prototype.addItem =
function(item, type, store){
    var isConv = (type === ZmOffline.CONVERSATION);
    var value = this._getValue(item, isConv);
    store = store || ((item.l) ? this._getFolder(item.l) + type : ZmOffline.ZmOfflineStore);
    this.setItem(item.id, value, store);
};

ZmOffline.prototype._getFolder =
function(index){
    var mapping = {"2":"inbox", "5":"sent", "6":"drafts"};
    return mapping[index];
};

/**
 * Deletes conversations or messages from the offline database.
 * @param {deletedIds}	array of message/convesation id's to be deleted from offline database.
 * @param {type}    type of the mail item ("message" or "conversation").
 */

ZmOffline.prototype.deleteItem =
function(deletedIds, type, folder){
    if (!deletedIds || deletedIds.length === 0){
        return;
    }
    var store = folder + type;
    for (var i=0, length = deletedIds.length;i < length; i++){
        ZmOfflineDB.indexedDB.deteleItem(deletedIds[i], store);
    }

};


/**
 * Modifies  message or conversation in the offline database.
 * @param {id}	    message/convesation id that should be modified.
 * @param {newItem}    modified item or an object with modified fields as {{'f','fu'}, ['tn':'aaa'] ... }.
 * @param {type}    message or conversation
 */

ZmOffline.prototype.modifyItem =
function(id, newItem, type){
    DBG.println(AjxDebug.DBG1, "ZmOffline.prototype.modifyItem : id " + id);

    var updateItem = this._updateItem.bind(this, type, newItem);
    var cb = this.getItem.bind(this, id, updateItem, {});
    ZmOfflineDB.indexedDB.getItemById(id, cb);
};


ZmOffline.prototype._deleteItemByIds =
function(ids){
    if (!ids || ids.length === 0){
        return;
    }
    for(var i=0, length = ids.length; i < length; i++){
        ZmOfflineDB.indexedDB.deleteItemById(ids[i]);
    }
};

/**
 * Modifies  message or conversation in the offline database.
 * @param {id}	    message/convesation id that should be modified.
 * @param {stores}   Array of store [folder + type] values
 */


ZmOffline.prototype._deleteItemById =
function(id, stores){
      for (store in stores){
          ZmOfflineDB.indexedDB.deteleItem(id, store);
      }
};

ZmOffline.deleteAllOfflineData =
function(){
    DBG.println(AjxDebug.DBG1, "Delete all offline data");

    delete localStorage['syncToken'];
    indexedDB.deleteDatabase('ZmOfflineDB');
    indexedDB.deleteDatabase("OfflineLog");
};

ZmOffline.prototype._enableMailFeatures =
function(online) {
    var mailApp = appCtxt.getApp(ZmApp.MAIL);
    var mlc = mailApp.getMailListController();
    var view = appCtxt.isOfflineMode() ? ZmId.VIEW_TRAD : localStorage.getItem("MAILVIEW");
    mlc.switchView(view, true);
    var toolbar = mlc._toolbar[mlc._currentViewId];
    toolbar && mlc._resetOperations(mlc._toolbar[mlc._currentViewId], 1);

    var overview = mailApp.getOverview();
    var children = (overview && overview.getChildren()) || [];
    var selector = null;

    if (online){
        for (var i=0,length = children.length; i<length; i++){
            children[i].setVisible(true);
            if (children[i].type === "FOLDER"){
                selector = "#" + children[i].getHTMLElId() + " .DwtTreeItemLevel1ChildDiv > div";
                $(selector).each(function(index, value){
                   $(value).show();
                });
            }

        }
    } else {
        for (var i=0,length = children.length; i<length; i++){
            selector = "#" + children[i].getHTMLElId() + " .DwtTreeItemLevel1ChildDiv > div";
            if (children[i].type === "FOLDER"){
                $(selector).each(function(index, value){
                    if (index > 2 && index !== 4){
                        $(value).hide();
                    }
                });
            }else{
               children[i].setVisible(false);

            }
        }

    }


};

ZmOffline.closeDB =
function(){
    if (!localStorage.getItem("syncToken")){
        DBG.println(AjxDebug.DBG1, "Incomplete initial sync, deleting message data");
        ZmOffline.deleteAllOfflineData();
        return;
    }
    DBG.println(AjxDebug.DBG1, "Closing offline databases");

    ZmOfflineDB.indexedDB.close();
};

ZmOffline.generateMsgResponse =
function(result) {
    var resp = [],
        obj,
        msgNode,
        messagePart,
        i,
        length;

    result = [].concat(result);
    for (i = 0, length = result.length; i < length; i++) {
        obj = result[i];
        if (obj) {
            msgNode = obj[obj.methodName]["m"];
            if (msgNode) {
                msgNode.su = msgNode.su._content;
                msgNode.l = ZmFolder.ID_OUTBOX;
                msgNode.f = "s";
                messagePart = msgNode.mp[0];
                if (messagePart) {
                    if (messagePart.ct === ZmMimeTable.TEXT_PLAIN) {
                        messagePart.content = msgNode.fr = (messagePart.content) ? messagePart.content._content : "";
                        messagePart.body = true;
                    }
                    else if (messagePart.ct === ZmMimeTable.MULTI_ALT) {
                        var partsArray = messagePart.mp,
                            partsArrayLength = partsArray.length,
                            part;

                        for (var j = 0; j < partsArrayLength; j++) {
                            part = partsArray[j];
                            part.part = j + 1;
                            if (part.ct === ZmMimeTable.TEXT_PLAIN) {
                                part.content = msgNode.fr = (part.content) ? part.content._content : "";
                            }
                            else if (part.ct === ZmMimeTable.TEXT_HTML) {
                                part.content = (part.content) ? part.content._content : "";
                                part.body = true;
                            }
                        }
                    }
                }
                resp.push(msgNode);
            }
        }
    }
    return resp;
};

/**
 * For ZWC offline, adds outbox folder
 */
ZmOffline.addOutboxFolder =
function() {
    if (!appCtxt._supportsOffline) {
        return;
    }
    var folderTree = appCtxt.getFolderTree(),
        root = folderTree.root,
        folderObj = {
            id: ZmFolder.ID_OUTBOX,
            absFolderPath: "/Outbox",
            activesyncdisabled: false,
            name: "Outbox"
        };
    var folder = ZmFolderTree.createFolder(ZmOrganizer.FOLDER, root, folderObj, folderTree, null, "folder");
    root.children.add(folder);
    ZmOffline.updateOutboxFolderCount();
};

ZmOffline.updateOutboxFolderCount =
function() {
    var indexObj = {methodName : "SendMsgRequest"};
    ZmOfflineDB.indexedDB.actionsInRequestQueueUsingIndex(indexObj, ZmOffline.updateOutboxFolderCountCallback);
};

ZmOffline.updateOutboxFolderCountCallback =
function(result) {
    var outboxFolder = appCtxt.getById(ZmFolder.ID_OUTBOX),
        length = result ? result.length : 0;
    if (outboxFolder) {
        outboxFolder.notifyModify({n : length});
    }
};
