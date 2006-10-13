/*
 * ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1
 * 
 * The contents of this file are subject to the Mozilla Public License
 * Version 1.1 ("License"); you may not use this file except in
 * compliance with the License. You may obtain a copy of the License at
 * http://www.zimbra.com/license
 * 
 * Software distributed under the License is distributed on an "AS IS"
 * basis, WITHOUT WARRANTY OF ANY KIND, either express or implied. See
 * the License for the specific language governing rights and limitations
 * under the License.
 * 
 * The Original Code is: Zimbra Collaboration Suite Server.
 * 
 * The Initial Developer of the Original Code is Zimbra, Inc.
 * Portions created by Zimbra are Copyright (C) 2006 Zimbra, Inc.
 * All Rights Reserved.
 * 
 * Contributor(s): 
 * 
 * ***** END LICENSE BLOCK *****
 */

package com.zimbra.cs.zclient;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import com.zimbra.cs.service.ServiceException;
import com.zimbra.cs.service.account.AccountService;
import com.zimbra.soap.Element;

public class ZGetInfoResult {


    private String mId;
    private String mName;
    private long mLifetime;
    private long mExpiration;
    private long mMailboxQuotaUsed;
    private Map<String, List<String>> mAttrs;
    private Map<String, List<String>> mPrefs;
    private List<String> mMailURLs;
    
    private static Map<String, List<String>> getMap(Element e, String root, String child) throws ServiceException {
        Map<String, List<String>> result = new HashMap<String, List<String>>();
        Element attrsEl = e.getOptionalElement(root);
        if (attrsEl != null) {
            for (Element attrEl : attrsEl.listElements(child)) {
                String name = attrEl.getAttribute(AccountService.A_NAME);
                List<String> list = result.get(name);
                if (list == null) {
                    list = new ArrayList<String>();
                    result.put(name, list);
                }
                list.add(attrEl.getText());
            }
        }
        return result;
    }
    
    public ZGetInfoResult(Element e) throws ServiceException {
        mId = e.getAttribute(AccountService.E_ID, null); // TODO: ID was just added to GetInfo, remove ,null shortly...        
        mName = e.getAttribute(AccountService.E_NAME);
        mLifetime = e.getAttributeLong(AccountService.E_LIFETIME);
        mMailboxQuotaUsed = e.getAttributeLong(AccountService.E_QUOTA_USED, -1);        
        mExpiration  = mLifetime + System.currentTimeMillis();
        mAttrs = getMap(e, AccountService.E_ATTRS, AccountService.E_ATTR);
        mPrefs = getMap(e, AccountService.E_PREFS, AccountService.E_PREF);
        mMailURLs = new ArrayList<String>();
        for (Element urlEl: e.listElements(AccountService.E_SOAP_URL)) {
            mMailURLs.add(urlEl.getText());
        }
    }

    public Map<String, List<String>> getAttrs() {
        return mAttrs;
    }

    public long getExpiration() {
        return mExpiration;
    }

    public long getLifetime() {
        return mLifetime;
    }

    public List<String> getMailURL() {
        return mMailURLs;
    }

    public String getName() {
        return mName;
    }

    public Map<String, List<String>> getPrefs() {
        return mPrefs;
    }
    
    public String toString() {
        ZSoapSB sb = new ZSoapSB();
        sb.beginStruct();
        sb.add("id", mId);        
        sb.add("name", mName);
        sb.addDate("expiration", mExpiration);
        sb.add("lifetime", mLifetime);
        sb.add("mailboxQuotaUsed", mMailboxQuotaUsed);
        sb.add("attrs", mAttrs);
        sb.add("prefs", mPrefs);
        sb.add("mailURLs", mMailURLs, true, true);
        sb.endStruct();
        return sb.toString();
    }

    public long getMailboxQuotaUsed() {
        return mMailboxQuotaUsed;
    }

    public String getId() {
        return mId;
    }
}

