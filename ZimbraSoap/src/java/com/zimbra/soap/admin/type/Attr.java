/*
 * ***** BEGIN LICENSE BLOCK *****
 * Zimbra Collaboration Suite Server
 * Copyright (C) 2010, 2011 Zimbra, Inc.
 *
 * The contents of this file are subject to the Zimbra Public License
 * Version 1.3 ("License"); you may not use this file except in
 * compliance with the License.  You may obtain a copy of the License at
 * http://www.zimbra.com/license.
 *
 * Software distributed under the License is distributed on an "AS IS"
 * basis, WITHOUT WARRANTY OF ANY KIND, either express or implied.
 * ***** END LICENSE BLOCK *****
 */

package com.zimbra.soap.admin.type;

import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Map.Entry;

import com.google.common.base.Objects;
import com.google.common.collect.Lists;
import javax.xml.bind.annotation.XmlAccessType;
import javax.xml.bind.annotation.XmlAccessorType;
import javax.xml.bind.annotation.XmlAttribute;
import javax.xml.bind.annotation.XmlRootElement;
import javax.xml.bind.annotation.XmlValue;

import com.zimbra.common.service.ServiceException;
import com.zimbra.common.soap.AdminConstants;
import com.zimbra.common.util.StringUtil;
import com.zimbra.common.zclient.ZClientException;

@XmlAccessorType(XmlAccessType.FIELD)
@XmlRootElement(name=AdminConstants.E_A)
public class Attr {

    @XmlAttribute(name=AdminConstants.A_N /* n */, required=true)
    private String n;

    @XmlAttribute(name=AdminConstants.A_C /* c */, required=false)
    private Boolean isCosAttr;

    @XmlValue
    private String value;

    public Attr() {
        this(null, null, null);
    }

    public Attr(String n, String value) {
        this(n, value, null);
    }

    public Attr(String n, String value, Boolean isCosAttr) {
        this.n = n;
        this.value = value;
        this.isCosAttr = isCosAttr;
    }

    public static Attr fromNameValue(String n, String value) {
        return new Attr(n, value);
    }

    public void setN(String n) { this.n = n; }
    public void setIsCosAttr(Boolean isCosAttr) { this.isCosAttr = isCosAttr; }
    public void setValue(String value) { this.value = value; }
    public String getN() { return n; }
    public Boolean getIsCosAttr() { return isCosAttr; }
    public String getValue() { return value; }

    public static List <Attr> mapToList(Map<String, ? extends Object> attrs)
    throws ServiceException {
        List<Attr> newAttrs = Lists.newArrayList();
        if (attrs == null) return newAttrs;

        for (Entry<String, ? extends Object> entry : attrs.entrySet()) {
            String key = (String) entry.getKey();
            Object value = entry.getValue();
            if (value == null) {
                newAttrs.add(new Attr(key, (String) null));
            } else if (value instanceof String) {
                newAttrs.add(new Attr(key, (String) value));
            } else if (value instanceof String[]) {
                String[] values = (String[]) value;
                if (values.length == 0) {
                    // an empty array == removing the attr
                    newAttrs.add(new Attr(key, (String) null));
                } else {
                    for (String v: values) {
                        newAttrs.add(new Attr(key, v));
                    }
                }
            } else {
                throw ZClientException.CLIENT_ERROR(
                        "invalid attr type: " + key + " " + value.getClass().getName(), null);
            }
        }
        return newAttrs;
    }

    public static Map<String, Object> collectionToMap(Collection <Attr> attrs)
    throws ServiceException {
        Map<String, Object> result = new HashMap<String,Object>();
        for (Attr a : attrs) {
            StringUtil.addToMultiMap(result, a.getN(), a.getValue());
        }
        return result;
    }
    public Objects.ToStringHelper addToStringInfo(
                Objects.ToStringHelper helper) {
        return helper
            .add("n", n)
            .add("isCosAttr", isCosAttr)
            .add("value", value);
    }

    @Override
    public String toString() {
        return addToStringInfo(Objects.toStringHelper(this))
                .toString();
    }
}
