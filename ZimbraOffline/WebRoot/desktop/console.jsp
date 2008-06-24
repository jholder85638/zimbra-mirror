<%@ page contentType="text/html;charset=UTF-8" language="java" %>
<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>
<%@ taglib prefix="fn" uri="http://java.sun.com/jsp/jstl/functions" %>
<%@ taglib prefix="fmt" uri="com.zimbra.i18n" %>

<fmt:setBundle basename="/desktop/ZdMsg" scope="request"/>

<jsp:useBean id="bean" class="com.zimbra.cs.offline.jsp.ConsoleBean"/>
<jsp:setProperty name="bean" property="*"/>

<c:set var="accounts" value="${bean.accounts}"/>

<c:if test="${param.loginOp != 'logout' && (param.client == 'advanced' || (param.client == 'standard' && fn:length(accounts) == 1))}">
    <jsp:forward page="/desktop/login.jsp"/>
</c:if>

<html>
<head>
<meta http-equiv="refresh" content="15" >
<meta http-equiv="CACHE-CONTROL" content="NO-CACHE">
<link rel="shortcut icon" href="/zimbra/favicon.ico" type="image/vnd.microsoft.icon">
<title><fmt:message key='ZimbraDesktop'/> &#32; ${bean.appVersion} &#40;<c:out value="${pageContext.request.locale.language}" />_<c:out value="${pageContext.request.locale.country}" />&#41; </title>

<style type="text/css">
    @import url(/zimbra/desktop/css/offline.css);
</style>
<script type="text/javascript" src="js/desktop.js"></script>
<script type="text/javascript">

function OnAccount(id, zmail) {
    hidden_form.accountId.value = id;
    if (zmail)
        hidden_form.action = "/zimbra/desktop/zmail.jsp";
    else
        hidden_form.action = "/zimbra/desktop/xmail.jsp";
    hidden_form.submit();
}

function OnPromote(id) {
    hidden_form.accountId.value = id;
    hidden_form.action = "/zimbra/desktop/console.jsp";
    hidden_form.submit();
}

function OnNew() {
    window.location = "/zimbra/desktop/new.jsp";
}

function OnLogin() {
    window.location = "/zimbra/desktop/login.jsp";
}

function OnLoginTo(username) {
    hidden_form.username.value = username;
    hidden_form.action = "/zimbra/desktop/login.jsp";
    hidden_form.submit();
}

</script>
</head>

<body>
<c:set var='moveup' scope='application'><fmt:message key='MoveUp'/></c:set>

<br><br><br><br><br><br>
<div align="center">
<c:choose>
<c:when test="${empty accounts}">

<div id="welcome" class='ZWizardPage ZWizardPageBig'>
    <div class='ZWizardPageTitle'>
        <fmt:message key='WizardTitle'/>
    </div>
<span class="padding">
    <p><fmt:message key='WizardDescP1'/>

    </p>

    <p><fmt:message key='WizardDescP2'/></p>

    <p><fmt:message key='WizardDescP3'/>
    </p>
    </span>
    <table class="ZWizardButtonBar" width="100%">
        <tr>
            <td class="ZWizardButtonSpacer">
                <div></div>
            </td>
            <td class="ZWizardButton" width="1%">
                <button class='DwtButton-focused' onclick="OnNew()"><fmt:message key='SetupAnAccount'/></button>
            </td>
    </table>

</div>

</c:when>
<c:otherwise>


<form name="hidden_form" method="POST">
    <input type="hidden" name="accountId">
    <input type="hidden" name="username">
</form>

<div id="console" class="ZWizardPage">

		<table border=0 cellpadding=0 cellspacing=0 class="ZWizardPageTitle" width="100%">
			<tr>
				<td class='ZHeadTitle'>
					<fmt:message key='HeadTitle' />
				</td>
				<td class='ZHeadHint'>
					<fmt:message key='HeadHint'>
						<fmt:param>
							<b><img src='/zimbra/img/startup/ImgLogoff.gif' width=16px height=16px align=top> <fmt:message key='Setup'/></b>
						</fmt:param>
					</fmt:message> 
				</td>
			</tr>
		</table>

<span class="padding">
	<p><fmt:message key='Instruction' /></p>
	
    <table class="ZWizardTable" cellpadding=5 border=0 align="center">
    	<tr><th><fmt:message key='AccountName'/></th><th><fmt:message key='EmailAddress'/></th><th><fmt:message key='LastSync'/></th><th><fmt:message key='Status'/></th><th><fmt:message key='Order'/></th></tr>
    	
    	<c:forEach items="${accounts}" var="account">			
	        <tr><td><a href="javascript:OnAccount('${account.id}', ${account.zmail})">${account.name}</a></td>
	            <td>${account.email}</td>
				<td>
					<c:choose>
						<c:when test='${account.lastSync == "not yet complete"}'>
							<fmt:message key='SyncNotYetComplete'/>
						</c:when>
						<c:otherwise>
							<fmt:parseDate value="${account.lastSync}" pattern="MM/dd/yyyy 'at' h:mma" var="syncdate"/>
							<fmt:formatDate value="${syncdate}" type="both" dateStyle="short" timeStyle="short"/>
						</c:otherwise>
					</c:choose>
				</td>
	            <td><table border="0" cellspacing="0" cellpadding="0"><tr><td class="noborder">
		            <c:choose>
	                   <c:when test="${account.statusUnknown}">
	                      <img src="/zimbra/img/im/ImgOffline.gif">
	                   </c:when>
	                   <c:when test="${account.statusOffline}">
	                       <img src="/zimbra/img/im/ImgImAway.gif">
	                   </c:when>
	                   <c:when test="${account.statusOnline}">
	                       <img src="/zimbra/img/im/ImgImAvailable.gif">
	                   </c:when>
	                   <c:when test="${account.statusRunning}">
	                       <img src="/zimbra/img/animated/Imgwait_16.gif">
	                   </c:when>
	                   <c:when test="${account.statusAuthFailed}">
	                       <img src="/zimbra/img/im/ImgImDnd.gif">
	                   </c:when>
	                   <c:when test="${account.statusError}">
	                       <img height="14" width="14" src="/zimbra/img/dwt/ImgCritical.gif">
	                   </c:when>
		           </c:choose>
		       </td>
		       <td class="noborder">&nbsp;</td>
		       <td class="noborder">     
		           <c:choose>
                       <c:when test="${account.statusUnknown}">
                           unknown
                       </c:when>
                       <c:when test="${account.statusOffline}">
                           offline
                       </c:when>
                       <c:when test="${account.statusOnline}">
                           online
                       </c:when>
                       <c:when test="${account.statusRunning}">
                           in progress
                       </c:when>
                       <c:when test="${account.statusAuthFailed}">
                           can't login
                       </c:when>
                       <c:when test="${account.statusError}">
                           error
                       </c:when>
                   </c:choose>
		       </td></tr></table>
	           </td>
		       <td align="center">
		           <c:if test="${not account.first}">
		               <a href="javascript:OnPromote('${account.id}')"><img src="/zimbra/img/arrows/ImgUpArrow.gif" border="0" alt="${moveup}"></a>
		           </c:if>
		       </td>
	        </tr>
    	</c:forEach>
    </table>

</span>
<br>
    <table class="ZWizardButtonBar" width="100%" border="0">
        <tr>
            <td class="ZWizardButton">
                <button class='DwtButton' onclick="OnNew()"><fmt:message key='SetupAnotherAcct'/></button>
            </td>
            <td class="ZWizardButtonSpacer">
                <div></div>
            </td>
            <td class="ZWizardButton" width="1%">
                <button class='DwtButton-focused' onclick="OnLogin()"><fmt:message key='GotoDesktop'/></button>
            </td>
         </tr>
    </table>
</div>

</c:otherwise>
</c:choose>
</div>
</body>
</html>

