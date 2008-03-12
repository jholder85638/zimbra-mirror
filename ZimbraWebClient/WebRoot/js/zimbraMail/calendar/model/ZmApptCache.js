/*
 * ***** BEGIN LICENSE BLOCK *****
 * 
 * Zimbra Collaboration Suite Web Client
 * Copyright (C) 2005, 2006, 2007 Zimbra, Inc.
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

ZmApptCache = function(calViewController) {
	this._calViewController = calViewController;
	this.clearCache();
};

ZmApptCache.prototype.toString =
function() {
	return "ZmApptCache";
};

ZmApptCache.prototype.clearCache =
function() {
	this._cachedApptSummaries = {};
	this._cachedApptVectors = {};
	this._cachedMergedApptVectors = {};
	this._cachedIds = {};
	var miniCalCache = this._calViewController.getMiniCalCache();
	miniCalCache.clearCache();
};

ZmApptCache._sortFolderId =
function (a,b) {
	return a-b;
};

ZmApptCache.prototype._getCachedMergedKey =
function(params) {
	var sortedFolderIds = [];
	sortedFolderIds = sortedFolderIds.concat(params.folderIds);
	sortedFolderIds.sort(ZmApptCache._sortFolderId);

	// add query to cache key since user searches should not be cached
	var query = params.query && params.query.length > 0
		? (params.query + ":") : "";

	return (params.start + ":" + params.end + ":" + params.fanoutAllDay + ":" + query + sortedFolderIds.join(":"));
};

ZmApptCache.prototype._getCachedMergedVector =
function(cacheKey) {
	return this._cachedMergedApptVectors[cacheKey];
};

ZmApptCache.prototype._cacheMergedVector =
function(vector, cacheKey) {
	this._cachedMergedApptVectors[cacheKey] = vector.clone();
};

ZmApptCache.prototype._getCachedVector =
function(start, end, fanoutAllDay, folderId, query) {
	var folderCache = this._cachedApptVectors[folderId];
	if (folderCache == null)
		folderCache = this._cachedApptVectors[folderId] = {};

	var q = query ? (":" + query) : "";
	var cacheKey = start + ":" + end + ":" + fanoutAllDay + q;

	var vec = folderCache[cacheKey];
	if (vec == null) {
		// try to find it in the appt summaries results
		var apptList = this._getCachedApptSummaries(start, end, folderId, query);
		if (apptList != null) {
			vec = folderCache[cacheKey] = ZmApptList.toVector(apptList, start, end, fanoutAllDay);
		}
	}
	return vec;
};

ZmApptCache.prototype._cacheVector =
function(vector, start, end, fanoutAllDay, folderId, query) {
	var folderCache = this._cachedApptVectors[folderId];
	if (folderCache == null)
		folderCache = this._cachedApptVectors[folderId] = {};

	var q = query ? (":" + query) : "";
	var cacheKey = start + ":" + end + ":" + fanoutAllDay + q;
	folderCache[cacheKey] = vector;
};

ZmApptCache.prototype._cacheApptSummaries =
function(apptList, start, end, folderId, query) {
	var folderCache = this._cachedApptSummaries[folderId];
	if (folderCache == null)
		folderCache = this._cachedApptSummaries[folderId] = {};

	var q = query ? (":" + query) : "";
	var cacheKey = start + ":" + end + q;
	folderCache[cacheKey] = {start:start, end:end, list:apptList};
};

ZmApptCache.prototype._getCachedApptSummaries =
function(start, end, folderId, query) {
	var found = false;

	var folderCache = this._cachedApptSummaries[folderId];
	if (folderCache == null)
		folderCache = this._cachedApptSummaries[folderId] = {};

	var q = query ? (":" + query) : "";
	var cacheKey = start + ":" + end + q;

	// see if this particular range is cached
	var entry = this._cachedApptSummaries[cacheKey];
	if (entry != null) { return entry.list; }

	// look through all cache results. typically if we are asking for a week/day,
	// the month range will already be in the cache
	for (var key in folderCache) {
		entry = folderCache[key];
		if (start >= entry.start && end <= entry.end) {
			found = true;
			break;
		}
	}
	if (!found) { return null; }

	// hum. should this ever happen?
	if (entry.start == start && entry.end == end) {
		return entry.list;
	}

	// get subset, and cache it for future use (mainly if someone pages back and forth)
	var apptList = entry.list.getSubset(start, end);
	folderCache[cacheKey] = {start:start, end:end, list:apptList};
	return apptList;
};

ZmApptCache.prototype._updateCachedIds =
function(apptList) {
	var list = apptList.getVector();
	var size = list.size();
	for (var i=0; i < size; i++) {
		var ao = list.get(i);
		this._cachedIds[ao.id] = 1;
	}
};

/**
* Returns a vector of appt summaries for the specified time range across the
* specified folders.
* @param start 				[long]				start time in MS
* @param end				[long]				end time in MS
* @param fanoutAllDay		[Boolean]*
* @param folderIds			[Array]*			list of calendar folder Id's (null means use checked calendars in overview)
* @param callback			[AjxCallback]*		callback to call once search results are returned
* @param noBusyOverlay		[Boolean]*			don't show veil during search
*/
ZmApptCache.prototype.getApptSummaries =
function(params) {
	
	var apptVec = this.setSearchParams(params);
	
	if(apptVec != null && (apptVec instanceof AjxVector)) {
        return apptVec;
	}
	
	// this array will hold a list of appts as we collect them from the server
	this._rawAppts = [];

	if (params.callback) {
		this._search(params);
	} else {
		return this._search(params);
	}
};

ZmApptCache.prototype.setSearchParams =
function(params) {
	if (!(params.folderIds instanceof Array)) {
		params.folderIds = [params.folderIds];
	} else if (params.folderIds.length == 0) {
		var newVec = new AjxVector();
		if (params.callback) {
			params.callback.run(newVec);
		}
		return newVec;
	}

	params.mergeKey = this._getCachedMergedKey(params);
	var list = this._getCachedMergedVector(params.mergeKey);
	if (list != null) {
		if (params.callback) {
			params.callback.run(list.clone());
		}
		return list.clone();
	}

	params.needToFetch = [];
	params.resultList = [];

	for (var i=0; i < params.folderIds.length; i++) {
		var fid = params.folderIds[i];
		// check vector cache first
		list = this._getCachedVector(params.start, params.end, params.fanoutAllDay, fid);
		if (list != null) {
			params.resultList.push(list);
		} else {
			params.needToFetch.push(fid); // need to make soap call
		}
	}

	// if already cached, return from cache
	if (params.needToFetch.length == 0) {
		var newList = ZmApptList.mergeVectors(params.resultList);
		this._cacheMergedVector(newList, params.mergeKey);
		if (params.callback) {
			params.callback.run(newList);
		}
		return newList;
	}

	var folderIdMapper = {};
	var query = "";
	for (var i=0; i < params.needToFetch.length; i++) {
		var fid = params.needToFetch[i];
		var systemFolderId = appCtxt.getActiveAccount().isMain
			? fid : ZmOrganizer.getSystemId(fid);

		// map remote folder ids into local ones while processing search since
		// server wont do it for us (see bug 7083)
		var folder = appCtxt.getById(systemFolderId);
		var rid = folder ? folder.getRemoteId() : systemFolderId;
		folderIdMapper[rid] = systemFolderId;

		if (query.length)
			query += " OR ";
		query += "inid:" + fid;
		
	}
	params.queryHint = query;
	params.folderIdMapper = folderIdMapper;
	params.offset = 0;	
};

ZmApptCache.prototype._search =
function(params) {
	var jsonObj = {SearchRequest:{_jsns:"urn:zimbraMail"}};
	var request = jsonObj.SearchRequest;

	this._setSoapParams(request, params);
		
	if (params.callback) {
		var respCallback = new AjxCallback(this, this._getApptSummariesResponse, [params]);
		appCtxt.getAppController().sendRequest({jsonObj:jsonObj, asyncMode:true, callback:respCallback, noBusyOverlay:params.noBusyOverlay});
	} else {
		var response = appCtxt.getAppController().sendRequest({jsonObj: jsonObj});
		var result = new ZmCsfeResult(response, false);
		return this._getApptSummariesResponse(params, result);
	}
};

ZmApptCache.prototype.batchRequest =
function(searchParams, miniCalParams) {

	var jsonObj = {BatchRequest:{_jsns:"urn:zimbra", onerror:"continue"}};
	var request = jsonObj.BatchRequest;

    if (searchParams) {
        if (!searchParams.folderIds) {
		    searchParams.folderIds = this._calViewController.getCheckedCalendarFolderIds();
	    }
	    searchParams.query = this._calViewController._userQuery;
	    var apptVec = this.setSearchParams(searchParams);
	    var searchRequest = request.SearchRequest = {_jsns:"urn:zimbraMail"};
	    this._setSoapParams(searchRequest, searchParams);
    }

    var miniCalCache = this._calViewController.getMiniCalCache();
	var miniCalRequest = request.GetMiniCalRequest = {_jsns:"urn:zimbraMail"};
	miniCalCache._setSoapParams(miniCalRequest, miniCalParams);

	if ((searchParams && searchParams.callback) || miniCalParams.callback) {
		var respCallback = new AjxCallback(this, this.handleBatchResponse,[searchParams, miniCalParams]);
		appCtxt.getAppController().sendRequest({jsonObj:jsonObj, asyncMode:true, callback:respCallback, noBusyOverlay:true});
	} else {		
		var response = appCtxt.getAppController().sendRequest({jsonObj:jsonObj});	
		var batchResp = (response && response.BatchResponse) ? response.BatchResponse : null;
		return this.processBatchResponse(batchResp, searchParams, miniCalParams);
	}
};

ZmApptCache.prototype.processBatchResponse =
function(batchResp, searchParams, miniCalParams) {
	
	var miniCalCache = this._calViewController.getMiniCalCache();
	
	var miniCalResp = (batchResp && batchResp.GetMiniCalResponse) ? batchResp.GetMiniCalResponse :  null;
	var searchResp = (batchResp && batchResp.SearchResponse) ? batchResp.SearchResponse :  null;

	var data = [];
	
	miniCalCache.processBatchResponse(miniCalResp, data);	
	miniCalCache.highlightMiniCal(miniCalParams, data);
	miniCalCache.updateCache(miniCalParams, data);	
	
	if(miniCalParams.callback) {
		miniCalParams.callback.run(data)
	}

    if(!searchResp || !searchParams) { return; }
    
    //currently we send only one search request in batch
	if(searchResp && (searchResp instanceof Array)){
		searchResp = searchResp[0];
	}	

	var newList = this.processSearchResponse(searchResp, searchParams);

	if (searchParams.callback) {
		searchParams.callback.run(newList, searchParams.query);
	} else {
		return newList;
	}
};

ZmApptCache.prototype.handleBatchResponse =
function(searchParams, miniCalParams, response) {
	var batchResp = response && response._data && response._data.BatchResponse;	
	return this.processBatchResponse(batchResp, searchParams, miniCalParams);
};

ZmApptCache.prototype._setSoapParams =
function(request, params) {	
	request.sortBy = "none";
	request.limit = "500";
	request.calExpandInstStart = params.start;
	request.calExpandInstEnd = params.end;
	request.types = ZmSearch.TYPE[ZmItem.APPT];
    request.offset = params.offset;

	var query = params.query;
	if (params.queryHint) {
		query = (query != null)
			? (query + " (" + params.queryHint + ")")
			: params.queryHint;
	}
	request.query = {_content:query};
};

ZmApptCache.prototype._getApptSummariesResponse =
function(params, result) {
	// TODO: mark both as needing refresh?
	if (!result) { return; }

	var callback = params.callback;
	var resp;
	try {
		resp = result.getResponse();
	} catch (ex) {
		if (callback)
			callback.run(resp);
		return;
	}

	var searchResp = resp.SearchResponse;
	var newList = this.processSearchResponse(searchResp, params);
	if(newList == null) { return; }

	if (callback) {
		callback.run(newList, params.query);
	} else {
		return newList;
	}
};

ZmApptCache.prototype.processSearchResponse = 
function(searchResp, params) {
	
	if(!searchResp) { return; }
	
	if (searchResp && searchResp.appt && searchResp.appt.length) {
		this._rawAppts = this._rawAppts != null 
			? this._rawAppts.concat(searchResp.appt)
			: searchResp.appt;

		// if "more" flag set, keep requesting more appts
		if (searchResp.more) {
			var lastAppt = searchResp.appt[searchResp.appt.length-1];
			if (lastAppt) {
                params.offset += 500;
				this._search(params);
				return;
			}
		}
	}

	if (this._rawAppts && this._rawAppts.length) {
		var fanoutAllDay = params.fanoutAllDay;
		var folderIds = params.needToFetch;
		var start = params.start;
		var end = params.end;
		var query = params.query;

		// create a list of appts for each folder returned
		var folder2List = {};
		for (var j = 0; j < this._rawAppts.length; j++) {
			var fid = params.folderIdMapper[this._rawAppts[j].l];
			if (!folder2List[fid])
				folder2List[fid] = [];
			folder2List[fid].push(this._rawAppts[j]);
		}

		for (var i = 0; i < folderIds.length; i++) {
			var folderId = folderIds[i];
			var systemFolderId = appCtxt.getActiveAccount().isMain
				? folderId
				: ZmOrganizer.getSystemId(folderId);

			var apptList = new ZmApptList();
			apptList.loadFromSummaryJs(folder2List[systemFolderId]);

			// cache it
			this._updateCachedIds(apptList);
			this._cacheApptSummaries(apptList, start, end, systemFolderId, query);

			// convert to sorted vector
			var list = ZmApptList.toVector(apptList, start, end, fanoutAllDay);
			this._cacheVector(list, start, end, fanoutAllDay, systemFolderId, query); // id in response tied back to folder id

			params.resultList.push(list);
		}
	}

	// merge all the data and return
	var newList = ZmApptList.mergeVectors(params.resultList);
	this._cacheMergedVector(newList, params.mergeKey);

	this._rawAppts = null;
	return newList;	
	
};

// return true if the cache contains the specified id(s)
// id can be an array or a single id.
ZmApptCache.prototype.containsAnyId =
function(ids) {
	if (!ids) { return false; }
	if (ids instanceof Array) {
		for (var i=0; i < ids.length; i++) {
			if (this._cachedIds[ids[i]])
				return true;
		}
	} else {
		if (this._cachedIds[ids])
			return true;
	}
	return false;
};

// similar to  containsAnyId, though deals with an object
// (or array of objects) that have the id property
ZmApptCache.prototype.containsAnyItem =
function(items) {
	if (!items) { return false; }
	if (items instanceof Array) {
		for (var i=0; i < items.length; i++) {
			if (items[i].id && this._cachedIds[items[i].id])
				return true;
		}
	} else {
		if (items.id && this._cachedIds[items.id])
			return true;
	}
	return false;
};
