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
import com.google.common.collect.Iterables;
import com.google.common.collect.Lists;

import java.util.Collections;
import java.util.List;

import javax.xml.bind.annotation.XmlAccessType;
import javax.xml.bind.annotation.XmlAccessorType;
import javax.xml.bind.annotation.XmlAttribute;
import javax.xml.bind.annotation.XmlElement;
import javax.xml.bind.annotation.XmlElements;
import javax.xml.bind.annotation.XmlType;

import com.zimbra.common.soap.MailConstants;
import com.zimbra.soap.type.KeyValuePair;

@XmlAccessorType(XmlAccessType.FIELD)
@XmlType(propOrder = {"id", "part", "sentDate", "emails", "subject",
                "messageIdHeader", "invite", "headers", "contentElems"})
public class InviteAsMP extends MessageCommon {

    @XmlAttribute(name=MailConstants.A_ID /* id */, required=false)
    private String id;

    @XmlAttribute(name=MailConstants.A_PART /* part */, required=false)
    private String part;

    @XmlAttribute(name=MailConstants.A_SENT_DATE /* sd */, required=false)
    private Long sentDate;

    @XmlElement(name=MailConstants.E_EMAIL /* e */, required=false)
    private List<EmailInfo> emails = Lists.newArrayList();

    @XmlElement(name=MailConstants.E_SUBJECT /* su */, required=false)
    private String subject;

    @XmlElement(name=MailConstants.E_MSG_ID_HDR /* mid */, required=false)
    private String messageIdHeader;

    @XmlElement(name=MailConstants.E_INVITE /* inv */, required=false)
    private MPInviteInfo invite;

    @XmlElement(name=MailConstants.A_HEADER /* header */, required=false)
    private List<KeyValuePair> headers = Lists.newArrayList();

    @XmlElements({
        @XmlElement(name=MailConstants.E_MIMEPART /* mp */,
            type=PartInfo.class),
        @XmlElement(name=MailConstants.E_SHARE_NOTIFICATION /* shr */,
            type=Notification.class),
        @XmlElement(name=MailConstants.E_DL_SUBSCRIPTION_NOTIFICATION /* dlSubs */,
            type=DLSubscriptionNotification.class)              
    })
    private List<Object> contentElems = Lists.newArrayList();

    public InviteAsMP() {
    }

    public void setId(String id) { this.id = id; }
    public void setPart(String part) { this.part = part; }
    public void setSentDate(Long sentDate) { this.sentDate = sentDate; }
    public void setEmails(Iterable <EmailInfo> emails) {
        this.emails.clear();
        if (emails != null) {
            Iterables.addAll(this.emails,emails);
        }
    }

    public void addEmail(EmailInfo email) {
        this.emails.add(email);
    }

    public void setSubject(String subject) { this.subject = subject; }
    public void setMessageIdHeader(String messageIdHeader) {
        this.messageIdHeader = messageIdHeader;
    }
    public void setInvite(MPInviteInfo invite) { this.invite = invite; }
    public void setHeaders(Iterable <KeyValuePair> headers) {
        this.headers.clear();
        if (headers != null) {
            Iterables.addAll(this.headers,headers);
        }
    }

    public void addHeader(KeyValuePair header) {
        this.headers.add(header);
    }

    public void setContentElems(Iterable <Object> contentElems) {
        this.contentElems.clear();
        if (contentElems != null) {
            Iterables.addAll(this.contentElems,contentElems);
        }
    }

    public void addContentElem(Object contentElem) {
        this.contentElems.add(contentElem);
    }

    public String getId() { return id; }
    public String getPart() { return part; }
    public Long getSentDate() { return sentDate; }
    public List<EmailInfo> getEmails() {
        return Collections.unmodifiableList(emails);
    }
    public String getSubject() { return subject; }
    public String getMessageIdHeader() { return messageIdHeader; }
    public MPInviteInfo getInvite() { return invite; }
    public List<KeyValuePair> getHeaders() {
        return Collections.unmodifiableList(headers);
    }
    public List<Object> getContentElems() {
        return Collections.unmodifiableList(contentElems);
    }

    public Objects.ToStringHelper addToStringInfo(
                Objects.ToStringHelper helper) {
        helper = super.addToStringInfo(helper);
        return helper
            .add("id", id)
            .add("part", part)
            .add("sentDate", sentDate)
            .add("emails", emails)
            .add("subject", subject)
            .add("messageIdHeader", messageIdHeader)
            .add("invite", invite)
            .add("headers", headers)
            .add("contentElems", contentElems);
    }

    @Override
    public String toString() {
        return addToStringInfo(Objects.toStringHelper(this))
                .toString();
    }
}
