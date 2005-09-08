/*
 * ***** BEGIN LICENSE BLOCK *****
 * Version: ZAPL 1.1
 * 
 * The contents of this file are subject to the Zimbra AJAX Public
 * License Version 1.1 ("License"); you may not use this file except in
 * compliance with the License. You may obtain a copy of the License at
 * http://www.zimbra.com/license
 * 
 * Software distributed under the License is distributed on an "AS IS"
 * basis, WITHOUT WARRANTY OF ANY KIND, either express or implied. See
 * the License for the specific language governing rights and limitations
 * under the License.
 * 
 * The Original Code is: Zimbra AJAX Toolkit.
 * 
 * The Initial Developer of the Original Code is Zimbra, Inc.
 * Portions created by Zimbra are Copyright (C) 2005 Zimbra, Inc.
 * All Rights Reserved.
 * 
 * Contributor(s):
 * 
 * ***** END LICENSE BLOCK *****
 */

// DvModel is data with a change listener.
function DvModel() {
	this._evtMgr = new AjxEventMgr();
}

DvModel.prototype.toString = 
function() {
	return "DvModel";
}

DvModel.prototype.addChangeListener = 
function(listener) {
	return this._evtMgr.addListener(DvEvent.L_MODIFY, listener);
}

DvModel.prototype.removeChangeListener = 
function(listener) {
	return this._evtMgr.removeListener(DvEvent.L_MODIFY, listener);    	
}
