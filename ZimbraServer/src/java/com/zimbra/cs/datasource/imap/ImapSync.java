/*
 * ***** BEGIN LICENSE BLOCK *****
 * Zimbra Collaboration Suite Server
 * Copyright (C) 2008, 2009, 2010 Zimbra, Inc.
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
package com.zimbra.cs.datasource.imap;
                             
import com.zimbra.cs.datasource.DataSourceManager;
import com.zimbra.cs.datasource.MailItemImport;
import com.zimbra.cs.datasource.SyncUtil;
import com.zimbra.cs.mailclient.auth.Authenticator;
import com.zimbra.cs.mailclient.imap.ImapConnection;
import com.zimbra.cs.mailclient.imap.ListData;
import com.zimbra.cs.mailclient.CommandFailedException;
import com.zimbra.cs.account.DataSource;
import com.zimbra.cs.mailbox.Folder;
import com.zimbra.cs.mailbox.MailItem;
import com.zimbra.cs.mailbox.MailServiceException;
import com.zimbra.cs.mailbox.Mailbox;
import com.zimbra.common.service.ServiceException;
import com.zimbra.common.service.RemoteServiceException;
import com.zimbra.common.util.ZimbraLog;
import com.zimbra.common.util.Log;
import com.zimbra.common.util.StringUtil;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.regex.Pattern;

public class ImapSync extends MailItemImport {
    private final Folder localRootFolder;
    private final SyncStateManager syncStateManager;
    private ImapConnection connection;
    private char delimiter; // Default IMAP hierarchy delimiter (0 if flat)
    private final Map<Integer, ImapFolderSync> syncedFolders;
    private ImapFolderCollection trackedFolders;
    private Pattern ILLEGAL_FOLDER_CHARS = Pattern.compile("[:\\*\\?\"<>\\|]");
    private boolean fullSync;
    private Authenticator authenticator;
    private boolean reuseConnections;

    private static final Log LOG = ZimbraLog.datasource;

    public ImapSync(DataSource ds) throws ServiceException {
        super(ds);
        validateDataSource();
        localRootFolder = getMailbox().getFolderById(ds.getFolderId());
        syncStateManager = SyncStateManager.getInstance(ds);
        syncedFolders = new LinkedHashMap<Integer, ImapFolderSync>();
        reuseConnections = ds.isOffline();
    }

    public synchronized void test() throws ServiceException {
        // In case datasource was modified, make sure we close any open
        // connection as well as remove cached synchronization state
        ConnectionManager.getInstance().closeConnection(dataSource);
        SyncStateManager.removeInstance(dataSource);
        connect();
        if (reuseConnections) {
            releaseConnection();
        } else {
            closeConnection();
        }
    }

    protected void setAuthenticator(Authenticator auth) {
        authenticator = auth;
    }

    protected void setReuseConnections(boolean reuseConnections) {
        this.reuseConnections = reuseConnections;
    }

    protected void connect() throws ServiceException {
        if (connection == null) {
            // A full sync always refreshes the IMAP connection
            if (isFullSync()) {
                ConnectionManager.getInstance().closeConnection(dataSource);
            }
            connection = ConnectionManager.getInstance().openConnection(dataSource, authenticator);
        }
    }

    private void releaseConnection() {
        if (connection != null) {
            LOG.debug("Releasing connection");
            ConnectionManager.getInstance().releaseConnection(dataSource, connection);
            connection = null;
        }
    }

    private void closeConnection() {
        if (connection != null) {
            LOG.debug("Closing connection");
            connection.close();
            connection = null;
        }
    }

    // TODO Deprecate folderIds - it's better to determine which folders to sync here
    public void importData(List<Integer> folderIds, boolean fullSync)
        throws ServiceException {
        importData(fullSync);
    }

    public synchronized void importData(boolean fullSync) throws ServiceException {
        fullSync |= forceFullSync();
        this.fullSync = fullSync;
        List<Integer> folderIds = null;
        if (!fullSync) {
            // If not full sync, then only sync INBOX and possibly SENT folder
            // if server saves sent messages to SENT folder automatically.
            folderIds = new ArrayList<Integer>(2);
            folderIds.add(Mailbox.ID_FOLDER_INBOX);
            if (!dataSource.isSaveToSent()) {
                folderIds.add(Mailbox.ID_FOLDER_SENT);
            }
        }
        connect();
        try {
            syncFolders(folderIds);
            if (reuseConnections) {
                releaseConnection();
            }
        } catch (Exception e) {
            throw ServiceException.FAILURE("Folder sync failed", e);
        } finally {
            closeConnection();
        }
    }

    public ImapFolderSync getInboxFolderSync() {
        return syncedFolders.get(Mailbox.ID_FOLDER_INBOX);
    }
    
    /*
     * For ZDesktop, force a full sync of all folders if requested or INBOX
     * not yet fully sync'd. For ZCS import we always do a full sync.
     */
    private boolean forceFullSync() throws ServiceException {
        if (!dataSource.isOffline()) {
            return true; // Always force full sync for ZCS import
        }
        DataSourceManager dsm = DataSourceManager.getInstance();
        Folder inbox = dsm.getMailbox(dataSource).getFolderById(Mailbox.ID_FOLDER_INBOX);
        return dsm.isSyncEnabled(dataSource, inbox) && getSyncState(inbox.getId()) == null;
    }

    public ImapConnection getConnection() {
        return connection;
    }

    public ImapFolderCollection getTrackedFolders() {
        return trackedFolders;
    }

    public ImapFolder createFolderTracker(int itemId, String localPath,
                                          String remotePath, long uidValidity)
        throws ServiceException {
        ImapFolder tracker = new ImapFolder(dataSource, itemId, remotePath,
            localPath, uidValidity);
        tracker.add();
        trackedFolders.add(tracker);
        removeSyncState(itemId);
        return tracker;
    }

    public void deleteFolderTracker(ImapFolder tracker) throws ServiceException {
        tracker.delete();
        trackedFolders.remove(tracker);
    }

    public ImapFolderSync getSyncedFolder(int folderId) {
        return syncedFolders.get(folderId);
    }


    public void checkIsEnabled() throws ServiceException {
        if (!getDataSource().isManaged()) {
            throw ServiceException.FAILURE(
                "Import aborted because data source has been deleted or disabled", null);
        }
    }
    
    private void syncFolders(List<Integer> folderIds) throws ServiceException, IOException {
        if (dataSource.isOffline()) {
            getMailbox().beginTrackingSync();
        }
        // For offline if full sync then automatically re-enable sync on Inbox
        if (dataSource.isOffline() && fullSync) {
            SyncUtil.setSyncEnabled(mbox, Mailbox.ID_FOLDER_INBOX, true);
        }
        trackedFolders = ImapFolder.getFolders(dataSource);
        delimiter = connection.getDelimiter();
        syncRemoteFolders(ImapUtil.listFolders(connection, "*"));
        syncLocalFolders(getLocalFolders());
        syncMessages(folderIds);
        finishSync();
    }

    private List<Folder> getLocalFolders() {
        List<Folder> folders = localRootFolder.getSubfolderHierarchy();
        List<Folder> mailFolders = new ArrayList<Folder>(folders.size());
        for (Folder f : folders)
            if (f.getDefaultView() == MailItem.TYPE_MESSAGE)
                mailFolders.add(f);
        // Reverse order of local folders to ensure that children are
        // processed before parent folders. This avoids problems when
        // deleting folders.
        Collections.reverse(mailFolders);
        return mailFolders;
    }

    public boolean isFullSync() {
        return fullSync;
    }
    
    private void syncRemoteFolders(List<ListData> folders) throws ServiceException {
        for (ListData ld : folders) {
            checkIsEnabled();
            try {
                ImapFolderSync ifs = new ImapFolderSync(this);
                ImapFolder tracker = ifs.syncFolder(ld);
                if (tracker != null) {
                    syncedFolders.put(tracker.getItemId(), ifs);
                }
            } catch (Exception e) {
                syncFailed(ld.getMailbox(), e);
            }
        }
    }

    private void syncLocalFolders(List<Folder> folders) throws ServiceException {
        for (Folder folder : folders) {
            checkIsEnabled();
            int id = folder.getId();
            if (id != localRootFolder.getId() && !syncedFolders.containsKey(id)) {
                try {
                    folder = getFolder(id);
                    if (folder != null) {
                        ImapFolderSync ifs = new ImapFolderSync(this);
                        ImapFolder tracker = ifs.syncFolder(folder);
                        if (tracker != null) {
                            syncedFolders.put(tracker.getItemId(), ifs);
                        }
                    }
                } catch (Exception e) {
                    syncFailed(folder.getPath(), e);
                }
            }
        }
    }

    private void syncMessages(List<Integer> folderIds) throws ServiceException {
        // If folder ids specified, then only sync messages for specified
        // folders, otherwise sync messages for all folders.
        for (ImapFolderSync ifs : syncedFolders.values()) {
            checkIsEnabled();
            LocalFolder folder = ifs.getLocalFolder();
            int folderId = folder.getId();
            try {
                if (ifs.isSyncNeeded() || folderIds.contains(folderId)) {
                    ifs.syncMessages();
                }
            } catch (Exception e) {
                syncFailed(folder.getPath(), e);
            }
        }
    }

    public SyncState getSyncState(int folderId) {
        if (syncStateManager != null) {
            SyncState ss = syncStateManager.get(folderId);
            LOG.debug("getSyncState: fid = %d, state = %s", folderId, ss);
            return ss;
        }
        return null;
    }

    public SyncState removeSyncState(int folderId) {
        if (syncStateManager != null) {
            SyncState ss = syncStateManager.remove(folderId);
            LOG.debug("removeSyncState: fid = %d, state = %s", folderId, ss);
            return ss;
        }
        return null;
    }

    public SyncState putSyncState(int folderId, SyncState ss) {
        if (syncStateManager != null) {
            LOG.debug("putSyncState: fid = %d, state = %s", folderId, ss);
            return syncStateManager.put(folderId, ss);
        }
        return null;
    }

    private void finishSync() throws ServiceException {
        // Append new IMAP messages for folders which have been synchronized.
        // This is done after IMAP messages have been deleted in order to
        // avoid problems when local messages are moved between folders
        // (see bug 27924).
        for (ImapFolderSync ifs : syncedFolders.values()) {
            try {
                ifs.finishSync();
            } catch (Exception e) {
                LocalFolder folder = ifs.getLocalFolder();
                syncFailed(folder.getPath(), e);
            }
        }
    }

    public Folder getFolder(int id) throws ServiceException {
        try {
            return localRootFolder.getMailbox().getFolderById(null, id);
        } catch (MailServiceException.NoSuchItemException e) {
            return null;
        }
    }

    private void syncFailed(String path, Exception e)
        throws ServiceException {
        String error = String.format("Synchronization of folder '%s' failed", path);
        LOG.error(error, e);
        if (!canContinue(e)) {
            throw ServiceException.FAILURE(error, e);
        }
    }

    /*
     * Returns true if synchronization of other folders can continue following
     * the specified sync error.
     */
    private boolean canContinue(Throwable e) {
        if (!dataSource.isOffline()) {
            return false;
        } else if (e instanceof RemoteServiceException) {
            return false;
        } else if (e instanceof ServiceException) {
            Throwable cause = e.getCause();
            return cause == null || canContinue(cause);
        } else {
            return e instanceof CommandFailedException;
        }
    }
    
    /*
     * Returns the path to the Zimbra folder that stores messages for the given
     * IMAP folder. The Zimbra folder has the same path as the IMAP folder,
     * but is relative to the root folder specified by the DataSource.
     */
    String getLocalPath(ListData ld) throws ServiceException {
        String remotePath = ld.getMailbox();
        char localDelimiter = ld.getDelimiter();
        String relativePath = ld.getMailbox();
        
        if (localDelimiter != '/' && (remotePath.indexOf(localDelimiter) >= 0 ||
                                 remotePath.indexOf('/') >= 0)) {
            // Change remote path to use our separator
            String[] parts = remotePath.split("\\" + localDelimiter);
            for (int i = 0; i < parts.length; i++) {
                // TODO Handle case where separator is not valid in Zimbra folder name
                parts[i] = parts[i].replace('/', localDelimiter);
            }
            relativePath = StringUtil.join("/", parts);
        }
        relativePath = ILLEGAL_FOLDER_CHARS.matcher(relativePath).replaceAll("_");

        if (dataSource.ignoreRemotePath(relativePath)) {
            return null; // Do not synchronize folder
        }

        String localPath = dataSource.mapRemoteToLocalPath(relativePath);
        if (localPath == null) {
            // Remove leading slashes and append to root folder
            while (relativePath.startsWith("/")) {
                relativePath = relativePath.substring(1);
            }
            if (localRootFolder.getId() == com.zimbra.cs.mailbox.Mailbox.ID_FOLDER_USER_ROOT) {
                localPath = "/" + relativePath;
            } else {
                localPath = localRootFolder.getPath() + "/" + relativePath;
            }
        }

        if (isUniqueLocalPathNeeded(localPath)) {
            int count = 1;
            for (;;) {
                String path = String.format("%s-%d", localPath, count++);
                if (LocalFolder.fromPath(mbox, path) == null) {
                    return path;
                }
            }
        } else {
            return localPath;
        }
    }

    /*
     * When mapping a new remote folder, check if original local path can be
     * used or a new unique name must be generated. A unique name must be
     * generated if the local path is already associated with a tracked
     * folder, or the local path refers to a system folder that is not one
     * of the known IMAP folders (e.g. INBOX, Sent). This ensures that a
     * remote folder named 'Contacts', for example, will get mapped to a unique
     * name since a local non-IMAP system folder already exists with the same
     * name.
     */
    private boolean isUniqueLocalPathNeeded(String localPath) throws ServiceException {
        LocalFolder lf = LocalFolder.fromPath(mbox, localPath);
        return lf != null && (
            trackedFolders.getByItemId(lf.getId()) != null ||
            lf.isSystem() && !lf.isKnown());
    }

    /*
     * Returns the IMAP path name for the specified local folder. Returns null
     * if the folder should not be imported.
     */
    String getRemotePath(Folder folder) throws ServiceException {
        if (!localRootFolder.isDescendant(folder)) {
            return null;
        }
        String imapPath = dataSource.mapLocalToRemotePath(folder.getPath());
        if (imapPath == null) {
            if (folder.getId() < com.zimbra.cs.mailbox.Mailbox.FIRST_USER_ID) {
                return null;
            }
            // Determine imap path from folder path
            imapPath = folder.getPath();
            // Strip root path from folder path
            String rootPath = localRootFolder.getPath();
            if (!rootPath.endsWith("/")) {
                rootPath += "/";
            }
            if (!imapPath.startsWith(rootPath)) {
                return null; // Folder no longer data source root
            }
            imapPath = imapPath.substring(rootPath.length());
        }
        // Handling for IMAP folder delimiter different from Zimbra's
        if (delimiter != 0 && delimiter != '/') {
            String[] parts = imapPath.split("/");
            for (int i = 0; i < parts.length; i++) {
                parts[i] = parts[i].replace(delimiter, '/');
            }
            imapPath = StringUtil.join(String.valueOf(delimiter), parts);
        }
        return imapPath;
    }
}
