<%@ page contentType="text/html;charset=UTF-8" language="java" %>
<%@taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>
<%@taglib prefix="zd" tagdir="/WEB-INF/tags/desktop" %>
<%@taglib prefix="zdf" uri="com.zimbra.cs.offline.jsp" %>

<jsp:useBean id="bean" class="com.zimbra.cs.offline.jsp.YmailBean" scope="request"/>
<jsp:setProperty name="bean" property="*"/>

<c:set var="uri" value="/zimbra/desktop/ymail.jsp"/>

${zdf:doRequest(bean)}

<html>
<head>
<meta http-equiv="CACHE-CONTROL" content="NO-CACHE">
<link rel="shortcut icon" href="/zimbra/favicon.ico" type="image/vnd.microsoft.icon">
<title>Zimbra Desktop ${bean.appVersion}</title>
<style type="text/css">
    @import url(/zimbra/desktop/css/offline.css);
    @import url(/zimbra/desktop/css/desktop.css);
</style>
<script type="text/javascript" src="js/desktop.js"></script>
</head>

<body onload="InitScreen()">

<c:choose>
    <c:when test="${(bean.noVerb && empty bean.accountId) || (bean.add && not bean.allOK)}">
        <zd:ymailNew uri="${uri}"/>
    </c:when>
    
    <c:when test="${bean.modify && not bean.allOK}">
        <zd:xmailManage uri="${uri}"/>
    </c:when>
    
    <c:when test="${(bean.noVerb && not empty bean.accountId) || ((bean.reset || bean.delete) && not bean.allOK)}">
        ${zdf:reload(bean)}
        <zd:xmailManage uri="${uri}"/>
    </c:when>
    
    <c:when test="${not bean.noVerb && bean.allOK}">
        <zd:xmailDone uri="${uri}" name="${bean.dataSourceName}"/>
    </c:when>
    
    <c:otherwise>
        <p class='ZOfflineError'>Unexpected error!</p>
    </c:otherwise>
</c:choose>

</body>
</html>
