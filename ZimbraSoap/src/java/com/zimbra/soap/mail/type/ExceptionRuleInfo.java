/*
 * ***** BEGIN LICENSE BLOCK *****
 * Zimbra Collaboration Suite Server
 * Copyright (C) 2011 Zimbra, Inc.
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

package com.zimbra.soap.mail.type;

import com.google.common.base.Objects;
import javax.xml.bind.annotation.XmlAccessType;
import javax.xml.bind.annotation.XmlAccessorType;
import javax.xml.bind.annotation.XmlElement;

import com.zimbra.common.soap.MailConstants;

@XmlAccessorType(XmlAccessType.FIELD)
public class ExceptionRuleInfo extends RecurIdInfo implements RecurRuleBase {

    @XmlElement(name=MailConstants.E_CAL_ADD, required=false)
    private RecurrenceInfo add;

    @XmlElement(name=MailConstants.E_CAL_EXCLUDE, required=false)
    private RecurrenceInfo exclude;

    public ExceptionRuleInfo() {
    }

    public void setAdd(RecurrenceInfo add) { this.add = add; }
    public void setExclude(RecurrenceInfo exclude) { this.exclude = exclude; }
    public RecurrenceInfo getAdd() { return add; }
    public RecurrenceInfo getExclude() { return exclude; }

    public Objects.ToStringHelper addToStringInfo(
                Objects.ToStringHelper helper) {
        helper = super.addToStringInfo(helper);
        return helper
            .add("add", add)
            .add("exclude", exclude);
    }

    @Override
    public String toString() {
        return addToStringInfo(Objects.toStringHelper(this))
                .toString();
    }
}
