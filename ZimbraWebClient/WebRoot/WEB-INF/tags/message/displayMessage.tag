<%@ tag body-content="empty" %>
<%@ attribute name="message" rtexprvalue="true" required="true" type="com.zimbra.cs.taglib.bean.ZMessageBean" %>
<%@ attribute name="mailbox" rtexprvalue="true" required="true" type="com.zimbra.cs.taglib.bean.ZMailboxBean" %>
<%@ attribute name="showconvlink" rtexprvalue="true" required="false" %>
<%@ attribute name="hideops" rtexprvalue="true" required="false" %>
<%@ attribute name="externalImageUrl" rtexprvalue="true" required="false" type="java.lang.String" %>
<%@ attribute name="composeUrl" rtexprvalue="true" required="true" type="java.lang.String" %>
<%@ attribute name="newWindowUrl" rtexprvalue="true" required="false" type="java.lang.String" %>
<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>
<%@ taglib prefix="fn" uri="http://java.sun.com/jsp/jstl/functions" %>
<%@ taglib prefix="fmt" uri="http://java.sun.com/jsp/jstl/fmt" %>
<%@ taglib prefix="zm" uri="com.zimbra.zm" %>
<%@ taglib prefix="app" uri="com.zimbra.htmlclient" %>

<%--compute body up front, so attachments refereneced in multipart/related don't show up --%>
<c:set var="body" value="${message.body}"/>

<c:set var="theBody">
    <c:if test="${body.isTextHtml or body.isTextPlain}">
        <c:catch>
          ${zm:getPartHtmlContent(body, message)}
        </c:catch>
    </c:if>
</c:set>

<c:if test="${not empty message.invite and mailbox.features.calendar}">
    <c:set var="appt" value="${message.invite.component}"/>
    <c:set var="showInviteReply" value="${not zm:getFolder(pageContext, message.folderId).isInTrash and not empty message.invite.component}"/>
</c:if>
<c:set var="shareAccepted" value="${not empty message.share and zm:hasShareMountPoint(mailbox, message)}"/>
<c:set var="showShareInfo" value="${not empty message.share and not shareAccepted}"/>
<c:set var="needExtraCol" value="${showInviteReply or showShareInfo}"/>

<fmt:message var="unknownSender" key="unknownSender"/>

<c:set var="isPart" value="${!empty message.partName}"/>
<table width=100% cellpadding=0 cellspacing=0 class=Msg>
    <tr>
        <td class='MsgHdr' colspan=2>
            <table width=100% cellpadding=0 cellspacing=0 border=0>
                <tr>
                    <td>
                        <table width=100% cellpadding=2 cellspacing=0 border=0>
                            <tr>
                                <td class='MsgHdrName'>
                                    <fmt:message key="from"/>
                                    :
                                </td>
                                <td class='MsgHdrValue'>
                                    <c:out value="${message.displayFrom}" default="${unknownSender}"/>
                                </td>
                            </tr>
                            <c:set var="sender" value="${message.displaySender}"/>
                            <c:if test="${not empty sender}">
                                 <tr>
                                    <td class='MsgHdrName'>
                                        <fmt:message key="sender"/>
                                        :
                                    </td>
                                    <td class='MsgHdrValue'>
                                        <c:out
                                                value="${sender}"/>
                                    </td>
                                </tr>
                            </c:if>
                            <c:if test="${empty message.subject}">
                                <fmt:message var="noSubject" key="noSubject"/>
                            </c:if>
                            <tr>
                                <td class='MsgHdrName'>
                                    <fmt:message key="subject"/>
                                    :
                                </td>
                                <td
                                        class='MsgHdrValue'>${fn:escapeXml(empty message.subject ? noSubject : message.subject)}</td>
                            </tr>
                            <c:set var="to" value="${message.displayTo}"/>
                            <c:if test="${not empty to}">
                                <tr>
                                    <td class='MsgHdrName'>
                                        <fmt:message key="to"/>
                                        :
                                    </td>
                                    <td class='MsgHdrValue'>
                                        <c:out
                                                value="${to}"/>
                                    </td>
                                </tr>
                            </c:if>
                            <c:set var="cc" value="${message.displayCc}"/>
                            <c:if test="${not empty cc}">
                                <tr>
                                    <td class='MsgHdrName'>
                                        <fmt:message key="cc"/>
                                        :
                                    </td>
                                    <td class='MsgHdrValue'>
                                        <c:out
                                                value="${cc}"/>
                                    </td>
                                </tr>
                            </c:if>
                            <c:set var="bcc" value="${message.displayBcc}"/>
                            <c:if test="${not empty bcc}">
                                <tr>
                                    <td class='MsgHdrName'>
                                        <fmt:message key="bcc"/>
                                        :
                                    </td>
                                    <td class='MsgHdrValue'>
                                        <c:out
                                                value="${bcc}"/>
                                    </td>
                                </tr>
                            </c:if>
                            <c:set var="replyto" value="${message.displayReplyTo}"/>
                            <c:if test="${not empty replyto}">
                                <tr>
                                    <td class='MsgHdrName'>
                                        <fmt:message key="replyTo"/>
                                        :
                                    </td>
                                    <td class='MsgHdrValue'>
                                        <c:out
                                                value="${replyto}"/>
                                    </td>
                                </tr>
                            </c:if>
                        </table>
                    </td>
                    <td valign='top'>
                        <table width=100% cellpadding=2 cellspacing=0 border=0>
                            <tr>
                                <td nowrap align='right' class='MsgHdrSent'>
                                    <fmt:message var="dateFmt" key="formatDateSent"/>
                                    <fmt:formatDate timeZone="${mailbox.prefs.timeZone}" pattern="${dateFmt}" value="${message.sentDate}"/>
                                </td>
                            </tr>
                            <c:if test="${message.hasTags or message.isFlagged}">
                                <tr>
                                    <td nowrap align='right' class='Tags'>
                                        <c:if test="${mailbox.features.tagging}">
                                            <c:set var="tags" value="${zm:getTags(pageContext, message.tagIds)}"/>
                                            <c:forEach items="${tags}" var="tag">
                                                <app:img src="${tag.miniImage}" alt='${fn:escapeXml(tag.name)}'/>
                                                <span>${fn:escapeXml(tag.name)}</span>
                                            </c:forEach>
                                        </c:if> 
                                        <c:if test="${message.isFlagged}">
                                            <app:img altkey='ALT_FLAGGED' src="tag/FlagRed.gif"/>
                                        </c:if>
                                    </td>
                                </tr>
                            </c:if>
                            <c:if test="${not empty message.attachments}">
                                <tr>
                                    <td nowrap align="right" class='MsgHdrAttAnchor'>
                                        <a href="#attachments${message.partName}">
                                            <app:img src="common/Attachment.gif" altkey="ALT_ATTACHMENT"/>
                                            <fmt:message key="attachmentCount">
                                                <fmt:param value="${message.numberOfAttachments}"/>
                                            </fmt:message>
                                        </a>
                                    </td>
                                </tr>
                            </c:if>
                        </table>
                    </td>
                </tr>
            </table>
        </td>
    </tr>
    <c:if test="${not hideops}">
    <tr>
        <td class='MsgOps' colspan=2>
            <table width=100% >
                <tr valign="middle">
                    <td nowrap align=left style='padding-left: 5px'>
                        <table cellspacing=4 cellpadding=0 class='Tb'>
                            <tr>
                                <c:set var="accessKey" value="${0}"/>
                                <c:if test="${showInviteReply}">
                                    <c:set var="keyOffset" value="${3}"/>
                                    <td style='padding: 0 2px 0 2px'>
                                        <a <c:if test="${not isPart}">accesskey="1" </c:if> href="${composeUrl}&op=accept">
                                            <img src="<c:url value="/images/common/Check.gif"/>" alt=""/>
                                            &nbsp;
                                            <span><fmt:message key="replyAccept"/></span>
                                        </a>
                                    </td>
                                    <td><div class='vertSep'></div></td>
                                    <td style='padding: 0 2px 0 2px'>
                                        <a <c:if test="${not isPart}">accesskey="2" </c:if> href="${composeUrl}&op=tentative">
                                            <img src="<c:url value="/images/common/QuestionMark.gif"/>" alt=""/>
                                            &nbsp;
                                            <span><fmt:message key="replyTentative"/></span>
                                        </a>
                                    </td>
                                    <td><div class='vertSep'></div></td>
                                    <td style='padding: 0 2px 0 2px'>
                                        <a <c:if test="${not isPart}">accesskey="3" </c:if> href="${composeUrl}&op=decline">
                                            <img src="<c:url value="/images/common/Cancel.gif"/>" alt=""/>
                                            &nbsp;
                                            <span><fmt:message key="replyDecline"/></span>
                                        </a>
                                    </td>
                                    <td><div class='vertSep'></div></td>
                                </c:if>
                                <td style='padding: 0 2px 0 2px'>
                                    <a <c:if test="${not isPart}">accesskey="${keyOffset+1}" id="OPREPLY"</c:if> href="${composeUrl}&op=reply">
                                        <img src="<c:url value="/images/mail/Reply.gif"/>" alt=""/>
                                        &nbsp;
                                        <span><fmt:message key="reply"/></span>
                                    </a>
                                </td>
                                <td><div class='vertSep'></div></td>
                                <td style='padding: 0 2px 0 2px'>
                                    <a <c:if test="${not isPart}">accesskey="${keyOffset+2}" id="OPREPLYALL"</c:if> href="${composeUrl}&op=replyAll">
                                        <img src="<c:url value="/images/mail/ReplyAll.gif"/>" alt=""/>
                                        &nbsp;
                                        <span><fmt:message key="replyAll"/></span>
                                    </a>
                                </td>
                                <td><div class='vertSep'></div></td>
                                <td style='padding: 0 2px 0 2px'>
                                    <a <c:if test="${not isPart}">accesskey="${keyOffset+3}" id="OPFORW"</c:if> href="${composeUrl}&op=forward">
                                        <img src="<c:url value="/images/mail/Forward.gif"/>" alt=""/>
                                        &nbsp;
                                        <span><fmt:message key="forward"/></span>
                                    </a>
                                </td>
                            </tr>
                        </table>
                    </td>
                    <td nowrap align=right style='padding-right: 5px;'>
                        <table cellspacing=4 cellpadding=0 class='Tb'>
                            <tr>
                                <c:if test="${showconvlink and not fn:startsWith(message.conversationId, '-')}">
                                    <td style='padding: 0 2px 0 2px'>
                                        <c:url var="convUrl" value="/h/search">
                                            <c:param name="action" value="view"/>
                                            <c:param name="st" value="conversation"/>
                                            <c:param name="sq" value='conv:"${message.conversationId}"'/>
                                        </c:url>
                                        <a accesskey='${not empty newWindowUrl ? '8' : '9'}' href="${convUrl}">
                                            <img src="<c:url value="/images/mail/Conversation.gif"/>" alt="<fmt:message key="showConversation"/>" title="<fmt:message key="showConversation"/>"/>
                                        </a>
                                    </td>
                                </c:if>
                                <td><div class='vertSep'></div></td>
                                <c:if test="${not empty newWindowUrl}">
                                <td style='padding: 0 2px 0 2px'>
                                    <a accesskey='9' target="_blank" href="${newWindowUrl}">
                                        <img src="<c:url value="/images/common/OpenInNewWindow.gif"/>" alt="<fmt:message key="newWindow"/>" title="<fmt:message key="newWindow"/>"/>
                                    </a>
                                </td>
                                </c:if>
                                <td><div class='vertSep'></div></td>
                                <c:if test="${not isPart}">
                                <td style='padding: 0 2px 0 2px'>
                                    <a accesskey='0' target="_blank" href="/service/home/~/?id=${message.id}&auth=co">
                                        <img src="<c:url value="/images/mail/Message.gif"/>" alt="<fmt:message key="showOrig"/>" title="<fmt:message key="showOrig"/>"/>
                                    </a>
                                    </c:if>
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>
            </table>
        </td>
    </tr>
    </c:if>
    <c:if test="${not empty externalImageUrl and (message.externalImageCount gt 0)}">
        <tr>
            <td class='DisplayImages' colspan=2>
                <fmt:message key="externalImages"/>
                &nbsp;<a id="DISPEXTIMG" accesskey='x' href="${externalImageUrl}">
                <fmt:message key="displayExternalImages"/>
            </a>
            </td>
        </tr>
    </c:if>
    <c:if test="${shareAccepted}">
        <tr>
            <td width=1% class='DisplayImages'>
                <app:img src="dwt/Information.gif"/>
            </td>
            <td class='DisplayImages' colspan=1>
                <fmt:message key="shareAlreadyAccepted"/>
            </td>
        </tr>
    </c:if>
    <tr>
        <td id="iframeBody" class=MsgBody valign='top' colspan="${needExtraCol ? 1 : 2}">
            <c:choose>
                <c:when test="${body.isTextHtml}">
                    <c:url var="iframeUrl" value="/h/imessage">
                        <c:param name="id" value="${message.id}"/>
                        <c:param name="part" value="${message.partName}"/>
                        <c:param name="xim" value="${param.xim}"/>
                    </c:url>
                    <noscript>
                        <iframe style="width:100%; height:600px" scrolling="auto" marginWidth="0" marginHeight="0" border="0" frameBorder="0" src="${iframeUrl}"></iframe>
                    </noscript>
                    <script type="text/javascript">
                        (function() {
                            var iframe = document.createElement("iframe");
                            iframe.style.width = "100%";
                            iframe.style.height = "20px";
                            iframe.scrolling = "no";
                            iframe.marginWidth = 0;
                            iframe.marginHeight = 0;
                            iframe.border = 0;
                            iframe.frameBorder = 0;
                            iframe.style.border = "none";
                            function resizeIframe() { iframe.style.height = iframe.contentWindow.document.body.scrollHeight + "px"; iframe = null; };
                            document.getElementById("iframeBody").appendChild(iframe);
                            var doc = iframe.contentWindow ? iframe.contentWindow.document : iframe.contentDocument;
                            doc.open();
                            doc.write("${zm:jsEncode(theBody)}");
                            doc.close();
                            if (YAHOO && keydownH && keypressH) {
                                YAHOO.util.Event.addListener(doc, "keydown", keydownH);
                                YAHOO.util.Event.addListener(doc, "keypress", keypressH);
                            }
                            //if (keydownH) doc.onkeydown = keydownH;
                            //if (keypressH) doc.onkeypress = keypressH;
                            setTimeout(resizeIframe, 0);
                        })();
                    </script>
                </c:when>
                <c:otherwise>
                    ${theBody}
                </c:otherwise>
            </c:choose>
            <c:if test="${not empty message.attachments}">
                <hr/>
                <a name="attachments${message.partName}"></a>
                <app:attachments mailbox="${mailbox}" message="${message}" composeUrl="${composeUrl}"/>
            </c:if>
                <c:if test="${not empty param.debug}">
                    <pre>${fn:escapeXml(message)}</pre>
                </c:if>
        </td>
        <c:if test="${needExtraCol}">
            <c:choose>
                <c:when test="${showInviteReply}">
                    <td width=25% valign=top  class='ZhAppContent2'>
                        <c:catch>
                            <app:multiDay selectedId="${message.id}" date="${appt.start.calendar}" numdays="1" view="day" timezone="${mailbox.prefs.timeZone}"/>
                        </c:catch>
                    </td>
                </c:when>
                <c:when test="${showShareInfo}">
                    <td width=45% valign=top  class='ZhAppContent2'>
                        <app:shareInfo message="${message}"/>
                    </td>
                </c:when>
            </c:choose>
        </c:if>
    </tr>
</table>
