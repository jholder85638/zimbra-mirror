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

package com.zimbra.soap.account.message;

import com.google.common.base.Objects;
import javax.xml.bind.annotation.XmlAccessType;
import javax.xml.bind.annotation.XmlAccessorType;
import javax.xml.bind.annotation.XmlElement;
import javax.xml.bind.annotation.XmlRootElement;

import com.zimbra.common.soap.AccountConstants;
import com.zimbra.soap.account.type.NewIdentity;

@XmlAccessorType(XmlAccessType.FIELD)
@XmlRootElement(name=AccountConstants.E_CREATE_IDENTITY_REQUEST)
public class CreateIdentityRequest {

    @XmlElement(name=AccountConstants.E_IDENTITY, required=true)
    private final NewIdentity identity;

    /**
     * no-argument constructor wanted by JAXB
     */
    @SuppressWarnings("unused")
    private CreateIdentityRequest() {
        this((NewIdentity) null);
    }

    public CreateIdentityRequest(NewIdentity identity) {
        this.identity = identity;
    }

    public NewIdentity getIdentity() { return identity; }

    @Override
    public String toString() {
        return Objects.toStringHelper(this)
            .add("identity", identity)
            .toString();
    }
}
