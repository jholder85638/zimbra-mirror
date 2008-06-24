<%@ tag body-content="empty" %>
<%@ attribute name="uri" required="true" %>

<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>
<%@ taglib prefix="zdf" uri="com.zimbra.cs.offline.jsp" %>
<%@ taglib prefix="fmt" uri="com.zimbra.i18n" %>

<fmt:setBundle basename="/desktop/ZdMsg" scope="request"/>

<c:set var='onResetWarn'><fmt:message key='OnResetWarn'/></c:set>
<c:set var='onDeleteWarn'><fmt:message key='OnDeleteWarn'/></c:set>

<script type="text/javascript">
<!--
function InitScreen() {
    zd.hide("imapSettingsRow");
    zd.hide("popSettingsRow");

	<c:choose>
	    <c:when test="${bean.pop}" >
	        zd.show("popSettingsRow");
	    </c:when>
	    <c:when test="${bean.syncAllServerFolders}">
	        zd.show("imapSettingsRow");
	    </c:when>
	</c:choose>

    if (!zd.isChecked("smtpAuth")) {
        zd.hide("smtpAuthSettingsRow");
    }
}

function OnCancel() {
    window.location = '/zimbra/desktop/console.jsp';
}

function OnSubmit() {
    beforeSubmit();
    xmailManage.submit();
}

function OnReset() {
    if (confirm("${onResetWarn}")) {
        beforeSubmit();
        hidden_form.verb.value = "rst";
        hidden_form.submit();
    }
}

function OnDelete() {
    if (confirm("${onDeleteWarn}")) {
        beforeSubmit();
        hidden_form.verb.value = "del";
        hidden_form.submit();
    }
}

function beforeSubmit() {
    disableButtons();
    zd.set("whattodo", "<span class='ZOfflineNotice'><fmt:message key='Processing'/></span>");
}

function disableButtons() {
    zd.disable("resetButton");
    zd.disable("deleteButton");
    zd.disable("cancelButton");
    zd.disable("saveButton");
}
//-->
</script>


<div id="newService" class="ZWizardPage">

<div class="ZWizardPageTitle">
    <div id='settings_hint' class='ZFloatInHead'></div>
    <span id='pageTitle'><fmt:message key='OtherChgSetup'/></span>
</div>

<form name="hidden_form" action="${uri}" method="POST">
    <input type="hidden" name="verb">
    <input type="hidden" name="accountId" value="${bean.accountId}">
    <input type="hidden" name="dataSourceName" value="${bean.dataSourceName}">
</form>
		<span class="padding">
<c:choose>
    <c:when test="${not empty bean.error}" >
        <p class='ZOfflineError'>${bean.error}</p>
    </c:when>
    <c:when test="${not bean.allValid}" >
        <p class='ZOfflineError'><fmt:message key='PlsCorrectInput'/></p>
    </c:when>
    <c:otherwise>
        <p id='instructions'>* <fmt:message key='RequiredField'/><br><fmt:message key='WhatToChange'/></p>
    </c:otherwise>
</c:choose>

<form name="xmailManage" action="${uri}" method="POST">

    <input type="hidden" name="verb" value="mod">
    <input type="hidden" name="accountId" value="${bean.accountId}">
    <c:if test="${not empty bean.domain}">
        <input type="hidden" name="domain" value="${bean.domain}">
    </c:if>
    
    <input type="hidden" name="protocol" value="${bean.pop ? 'pop3' : 'imap'}">
    <input type="hidden" name="dataSourceName" value="${bean.dataSourceName}">
    <input type="hidden" name="username" value="${bean.username}">
    <input type="hidden" name="email" value="${bean.email}">

    <table class="ZWizardForm" style='width:90%'>
        <tr id='accountTypeRow'>
            <td class="ZFieldLabel">*<fmt:message key='AccountType'/>:</td>
            <td><input style='width:200px' class="ZField" type="text" id="protocol" value="${bean.pop ? 'POP3' : 'IMAP4'}" disabled></td>
        </tr>
        <tr>
            <td class="ZFieldLabel">*<fmt:message key='Description'/>:</td>
            <td><input style='width:200px' class="ZField" type="text" id="dataSourceName" value="${bean.dataSourceName}" disabled></td>
        </tr>
        <tr id='usernameRow'>
            <td class="ZFieldLabel">*<fmt:message key='UserName'/>:</td>
            <td><input style='width:200px' class="ZField" type="text" id="username" value="${bean.username}" disabled></td>
        </tr>
        <tr id='passwordRow'>
            <td class="${zdf:isValid(bean, 'password') ? 'ZFieldLabel' : 'ZFieldError'}">*<fmt:message key='Password'/>:</td>
            <td><input style='width:100px' class="ZField" type="password" id="password" name="password" value="${bean.password}"
                    onkeypress='zd.syncIdsOnTimer(this, "smtpPassword")'>
            </td>
        </tr>
        
        <tr><td class="ZFieldLabel"><fmt:message key='FullName'/>:</td>
            <td><input style='width:200px' class="ZField" type="text" id="fromDisplay" name="fromDisplay" value="${bean.fromDisplay}"></td>
        </tr>
        <tr id='emailRow'>
            <td class="ZFieldLabel">*<fmt:message key='EmailAddr'/>:</td>
            <td><input style='width:200px' class="ZField" type="text" id="email" name="email" value="${bean.email}" disabled>
                <span id='email_hint' class='ZHint'>
            </td>
        </tr>
        
        <tr id='receivingMailRow'><td colspan=2><div class='ZOfflineHeader'><fmt:message key='ReceivingMail'/></div></td></tr>
        
        <tr id='mailServerRow'>
            <td class="${zdf:isValid(bean, 'host') ? 'ZFieldLabel' : 'ZFieldError'}">*<fmt:message key='InMailServer'/>:</td>
            <td>
                <table cellspacing=0 cellpadding=0>
                    <tr>
                        <td><input style='width:200px' class="ZField" type="text" id="host" name="host" value="${bean.host}">
                        </td>
                        <td>&nbsp;&nbsp;&nbsp;</td>
                        <td class="${zdf:isValid(bean, 'port') ? 'ZFieldLabel' : 'ZFieldError'}">*<fmt:message key='Port'/>:</td>
                        <td width=100%><input style='width:50px' class="ZField" type="text" id="port" name="port" value="${bean.port}">
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
        <tr id='mailSecureRow'>
            <td class='ZCheckboxCell'><input type="checkbox" id="ssl" name="ssl" ${bean.ssl ? 'checked' : ''}></td>
            <td class="ZCheckboxLabel"><fmt:message key='UseSSL'/></td>
        </tr>

        <tr id='sendingMailRow'><td colspan=2><div class='ZOfflineHeader'><fmt:message key='SendingMail'/></div></td></tr>
        
        <tr id='smtpServerRow'>
            <td class="${zdf:isValid(bean, 'smtpHost') ? 'ZFieldLabel' : 'ZFieldError'}">*<fmt:message key='OutMailServer'/>:</td>
            <td>
                <table cellspacing=0 cellpadding=0>
                    <tr>
                        <td><input style='width:200px' class="ZField" type="text" id=smtpHost name="smtpHost" value="${bean.smtpHost}">
                        </td>
                        <td>&nbsp;&nbsp;&nbsp;</td>
                        <td class="${zdf:isValid(bean, 'smtpPort') ? 'ZFieldLabel' : 'ZFieldError'}">*<fmt:message key='Port'/>:</td>
                        <td width=100%><input style='width:50px' class="ZField" type="text" id="smtpPort" name="smtpPort" value="${bean.smtpPort}">
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
        <tr id='smtpSecureRow'>
            <td class='ZCheckboxCell'><input type="checkbox" id="smtpSsl" name="smtpSsl" ${bean.smtpSsl ? 'checked' : ''}></td>
            <td class="ZCheckboxLabel"><fmt:message key='UseSSL'/></td>
        </tr>
        <tr id='smtpAuthRow'>
            <td class='ZCheckboxCell'><input type="checkbox" id="smtpAuth" name="smtpAuth" ${bean.smtpAuth ? 'checked' : ''}
                                        onclick='zd.toggle("smtpAuthSettingsRow", this.checked)'
                                    ></td>
            <td class="ZCheckboxLabel"><fmt:message key='UsrPassForSend'/></td>
        </tr>
        <tr id='smtpAuthSettingsRow'>
            <td></td>
            <td>
                <table>
                    <tr>
                        <td class="${zdf:isValid(bean, 'smtpUsername') ? 'ZFieldLabel' : 'ZFieldError'}">*<fmt:message key='UserName'/>:</td>
                        <td><input style='width:200px' class="ZField" type="text" id="smtpUsername" name="smtpUsername" value="${bean.smtpUsername}"></td>
                    </tr>
                    <tr>
                        <td class="${zdf:isValid(bean, 'smtpPassword') ? 'ZFieldLabel' : 'ZFieldError'}">*<fmt:message key='Password'/>:</td>
                        <td><input style='width:100px' class="ZField" type="password" id="smtpPassword" name="smtpPassword" value="${bean.smtpPassword}"></td>
                    </tr>
                </table>
            </td>
        </tr>

        <tr id='replyToRow'>
            <td class="ZFieldLabel"><fmt:message key='ReplyTo'/>:</td>
            <td>
                <table>
                    <tr>
                        <td><fmt:message key='Name'/>:</td>
                        <td><fmt:message key='EmailAddress'/>:</td>
                    </tr>
                    <tr>
                        <td><input style='width:200px' class="ZField" type="text" id="replyToDisplay" name="replyToDisplay" value="${bean.replyToDisplay}"
                                onkeypress='zd.markElementAsManuallyChanged(this)'
                        ></td>
                        <td><input style='width:200px' class="ZField" type="text" id="replyTo" name="replyTo" value="${bean.replyTo}"
                                onkeypress='zd.markElementAsManuallyChanged(this)'
                        ></td>
                    </tr>
                </table>
            </td>
        </tr>       


        <tr><td colspan=2><div class='ZOfflineHeader'><fmt:message key='SendAndReceive'/></div></td></tr>

        <tr>
            <td class="ZFieldLabel"><fmt:message key='OtherSyncFrequency'/>:</td>
            <td>
                <select class="ZSelect" id="syncFreqSecs" name="syncFreqSecs">
                    <option value="-1" ${bean.syncFreqSecs == -1 ? 'selected' : ''}><fmt:message key='SyncManually'/></option>
                    <option value="60" ${bean.syncFreqSecs == 60 ? 'selected' : ''}><fmt:message key='SyncEveryMin'/></option>
                    <option value="300" ${bean.syncFreqSecs == 300 ? 'selected' : ''}><fmt:message key='SyncEvery5'/></option>
                    <option value="900" ${bean.syncFreqSecs == 900 ? 'selected' : ''}><fmt:message key='SyncEvery15'/></option>
                    <option value="1800" ${bean.syncFreqSecs == 1800 ? 'selected' : ''}><fmt:message key='SyncEvery30'/></option>
                    <option value="3600" ${bean.syncFreqSecs == 3600 ? 'selected' : ''}><fmt:message key='SyncEvery1Hr'/></option>
                    <option value="14400" ${bean.syncFreqSecs == 14400 ? 'selected' : ''}><fmt:message key='SyncEvery4Hr'/></option>
                    <option value="43200" ${bean.syncFreqSecs == 43200 ? 'selected' : ''}><fmt:message key='SyncEvery12Hr'/></option>
                </select>
            </td>
        </tr>
        
        <tr id='imapSettingsRow'>
            <td style='text-align:right'><input type="checkbox" id="syncAllServerFolders" name="syncAllServerFolders" ${bean.syncAllServerFolders ? 'checked' : ''} disabled></td>
            <td class="ZCheckboxLabel"><fmt:message key='SyncAllFolders'/></td>
        </tr>
        
        <tr id='popSettingsRow'>
            <td style='text-align:right'><input type="checkbox" id="leave_on_server" name="leave_on_server" disabled></td>
            <td class="ZCheckboxLabel ZHint"><fmt:message key='SyncDelAftDownload'/></td>
        </tr>
        
        <tr>
            <td style='text-align:right'><input type="checkbox" id="debugTraceEnabled" name="debugTraceEnabled" ${bean.debugTraceEnabled ? 'checked' : ''}></td>
            <td class="ZCheckboxLabel"><fmt:message key='EnableTrace'/></td>
        </tr>

    </table>

</form>

<p><span id="whattodo"><fmt:message key='PressToVerify'><fmt:param><span class="ZWizardButtonRef"><fmt:message key='SaveSettings'/></span></fmt:param></fmt:message></p>
</span>
<table class="ZWizardButtonBar" width="100%">
    <tr>
        <td class="ZWizardButton">
            <button id='resetButton' class='DwtButton' onclick="OnReset()"><fmt:message key='ResetData'/></button>
        </td>
        <td class="ZWizardButton" width="1%">
            <button id='deleteButton' class='DwtButton' onclick="OnDelete()"><fmt:message key='RemoveAccount'/></button>
        </td>
        <td class="ZWizardButtonSpacer">
            <div></div>
        </td>
        <td class="ZWizardButton" width="1%">
            <button id='cancelButton' class='DwtButton' onclick="OnCancel()"><fmt:message key='Cancel'/></button>
        </td>
        <td class="ZWizardButton" width="1%">
            <button id='saveButton' class='DwtButton-focused' onclick="OnSubmit()"><fmt:message key='SaveSettings'/></button>
        </td>
</table>
</div>
