<%@ tag body-content="empty" %>
<%@ attribute name="context" rtexprvalue="true" required="true" type="com.zimbra.cs.taglib.tag.SearchContext" %>
<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>
<%@ taglib prefix="fn" uri="http://java.sun.com/jsp/jstl/functions" %>
<%@ taglib prefix="fmt" uri="com.zimbra.i18n" %>
<%@ taglib prefix="mo" uri="com.zimbra.mobileclient" %>
<%@ taglib prefix="zm" uri="com.zimbra.zm" %>
<c:set var="context_url" value="${requestScope.baseURL!=null?requestScope.baseURL:'mosearch'}"/>
<mo:handleError>
    <zm:getMailbox var="mailbox"/>
    <zm:getMessage var="msg" id="${not empty param.id ? param.id : context.currentItem.id}" markread="true"
                   neuterimages="${empty param.xim}"/>
    <%--zm:computeNextPrevItem var="cursor" searchResult="${context.searchResult}" index="${context.currentItemIndex}"/--%>
    <c:set var="ads" value='${msg.subject} ${msg.fragment}'/>

    <%-- blah, optimize this later --%>
    <c:if test="${not empty requestScope.idsMarkedUnread and not msg.isUnread}">
        <c:forEach var="unreadid" items="${requestScope.idsMarkedUnread}">
            <c:if test="${unreadid eq msg.id}">
                <zm:markMessageRead var="mmrresult" id="${msg.id}" read="${false}"/>
                <c:set var="leaveunread" value="${true}"/>
            </c:if>
        </c:forEach>
    </c:if>

    <zm:currentResultUrl var="closeUrl" value="${context_url}" context="${context}"/>
</mo:handleError>

<mo:view mailbox="${mailbox}" title="${msg.subject}" context="${null}" scale="true">

<zm:currentResultUrl var="actionUrl" value="${context_url}" context="${context}" mview="1"
                     action="view" id="${msg.id}"/>
<form id="actions" action="${fn:escapeXml(actionUrl)}" method="post">
<input type="hidden" name="crumb" value="${fn:escapeXml(mailbox.accountInfo.crumb)}"/>
<input type="hidden" name="doMessageAction" value="1"/>
<script>document.write('<input name="moreActions" type="hidden" value="<fmt:message key="actionGo"/>"/>');</script>

<table width="100%" cellpadding="0" cellspacing="0" border="0">
<tr>
    <td>
        <mo:msgToolbar mid="${msg.id}" urlTarget="${context_url}" context="${context}" keys="false" isTop="${true}" msg="${msg}"/>
    </td>
</tr>
<tr class="Stripes">
    <td class='zo_appt_view'>
        <c:set var="extImageUrl" value=""/>
        <c:if test="${empty param.xim}">
            <zm:currentResultUrl var="extImageUrl" id="${msg.id}" value="${context_url}" action="view"
                                 context="${context}" xim="1"/>
        </c:if>
        <zm:currentResultUrl var="composeUrl" value="${context_url}" context="${context}"
                             action="compose" paction="view" id="${msg.id}"/>
        <zm:currentResultUrl var="newWindowUrl" value="message" context="${context}" id="${msg.id}"/>
        <mo:displayMessage mailbox="${mailbox}" message="${msg}" externalImageUrl="${extImageUrl}"
                           showconvlink="true" composeUrl="${composeUrl}" newWindowUrl="${newWindowUrl}"/>
    </td>
</tr>
<tr>
</tr>
<tr>
    <td>
        <mo:msgToolbar mid="${msg.id}" urlTarget="${context_url}" context="${context}" keys="false" isTop="${false}" msg="${msg}"/>
    </td>
</tr>

</table>
</form>
</mo:view>
