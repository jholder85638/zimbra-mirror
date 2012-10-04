/*
 * ***** BEGIN LICENSE BLOCK *****
 * Zimbra Collaboration Suite Server
 * Copyright (C) 2012 Zimbra, Inc.
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

package com.zimbra.cs.store.file;

import java.io.File;
import java.io.IOException;
import java.util.Collection;
import java.util.Iterator;
import java.util.List;
import java.util.Map;

import org.apache.commons.collections.MultiMap;
import org.apache.commons.collections.map.MultiValueMap;

import com.zimbra.common.service.ServiceException;
import com.zimbra.common.util.Pair;
import com.zimbra.common.util.SpoolingCache;
import com.zimbra.common.util.ZimbraLog;
import com.zimbra.cs.db.DbPool;
import com.zimbra.cs.db.DbPool.DbConnection;
import com.zimbra.cs.db.DbVolumeBlobs;
import com.zimbra.cs.mailbox.MailServiceException;
import com.zimbra.cs.volume.Volume;
import com.zimbra.cs.volume.VolumeManager;
import com.zimbra.znative.IO;

public class BlobDeduper {
    
    private boolean inProgress = false;
    private boolean stopProcessing = false;
    private int totalLinksCreated = 0;
    private long totalSizeSaved = 0;
    
    private static BlobDeduper SINGLETON = new BlobDeduper();

    private BlobDeduper() {
    }
    
    public static BlobDeduper getInstance() {
        return SINGLETON;
    }

    private Pair<Integer, Long> processDigest(String digest, Volume volume) throws ServiceException {
        // get the blobs
        DbConnection conn = null;
        List<BlobReference> blobs;
        try {
            conn = DbPool.getConnection();
            blobs = DbVolumeBlobs.getBlobReferences(conn, digest, volume);
        } finally {
            DbPool.quietClose(conn);
        }
        // dedupe the paths
        if (blobs.size() > 1) {
            ZimbraLog.misc.debug("Deduping " + blobs.size() + " files for digest " + digest + " volume " + volume.getId());
            return deDupe(blobs);
        } else if (blobs.size() == 1) { 
            // mark the blob as processed if there is only one blob for given digest.
            markBlobAsProcessed(blobs.get(0));
        }
        return new Pair<Integer,Long>(0, Long.valueOf(0));
    }

    private Pair<Integer, Long> deDupe(List<BlobReference> blobs) throws ServiceException {
        int linksCreated = 0;
        long sizeSaved = 0;
        long srcInodeNum = 0;
        String srcPath = null;
        // check if there is any processed blob
        for (BlobReference blob : blobs) {
            if (blob.isProcessed()) {
                String path = FileBlobStore.getBlobPath(blob.getMailboxId(),
                        blob.getItemId(), blob.getRevision(),
                        blob.getVolumeId());
                try {
                    IO.FileInfo fileInfo = IO.fileInfo(path);
                    if (fileInfo != null) {
                        srcInodeNum = fileInfo.getInodeNum();
                        srcPath = path;
                        break;
                    }
                } catch (IOException e) {
                    // ignore
                }
            }
        }
        if (srcInodeNum == 0) {
            // check the path with maximum links
            // organize the paths based on inode
            MultiMap inodeMap = new MultiValueMap();
            for (BlobReference blob : blobs) {
                String path = FileBlobStore.getBlobPath(blob.getMailboxId(),
                        blob.getItemId(), blob.getRevision(),
                        blob.getVolumeId());
                try {
                    IO.FileInfo fileInfo = IO.fileInfo(path);
                    if (fileInfo != null) {
                        inodeMap.put(fileInfo.getInodeNum(), path);
                        blob.setFileInfo(fileInfo);
                    }
                } catch (IOException e) {
                    // ignore
                }
            }
            // find inode which has maximum paths
            int maxPaths = 0;
            @SuppressWarnings("unchecked")
            Iterator<Map.Entry<Long, Collection<String>>> iter = inodeMap.entrySet().iterator();
            while (iter.hasNext()) {
                Map.Entry<Long, Collection<String>> entry = iter.next();
                if (entry.getValue().size() > maxPaths) {
                    maxPaths = entry.getValue().size();
                    srcInodeNum = entry.getKey();
                    srcPath = entry.getValue().iterator().next();
                }
            }
        }
        if (srcInodeNum == 0) {
            return new Pair<Integer,Long>(0, Long.valueOf(0));
        }
        // First create a hard link for the source path, so that the file
        // doesn't get deleted in the middle.
        String holdPath = srcPath + "_HOLD";
        File holdFile = new File(holdPath);
        try {
            IO.link(srcPath, holdPath);
            // Now link the other paths to source path
            for (BlobReference blob : blobs) {
                if (blob.isProcessed()) {
                    continue;
                }
                String path = FileBlobStore.getBlobPath(blob.getMailboxId(),
                        blob.getItemId(), blob.getRevision(),
                        blob.getVolumeId());
                try {
                    if (blob.getFileInfo() == null) {
                        blob.setFileInfo(IO.fileInfo(path));
                    }
                } catch (IOException e) {
                    // ignore
                }
                if (blob.getFileInfo() == null) {
                    continue;
                }
                if (srcInodeNum == blob.getFileInfo().getInodeNum()) {
                    markBlobAsProcessed(blob);
                    continue;
                }
                // create the links for paths in two steps.
                // first create a temp link and then rename it to actual path
                // this guarantees that the file is always available.
                String tempPath = path + "_TEMP";
                File tempFile = new File(tempPath);
                try {
                    IO.link(holdPath, tempPath);
                    File destFile = new File(path);
                    tempFile.renameTo(destFile);
                    markBlobAsProcessed(blob);
                    linksCreated++;
                    sizeSaved += blob.getFileInfo().getSize();
                } catch (IOException e) {
                    ZimbraLog.misc.warn("Ignoring the error while deduping " + path, e);
                } finally {
                    if (tempFile.exists()) {
                        tempFile.delete();
                    }
                }
            }
        } catch (IOException e) {
            ZimbraLog.misc.warn("Ignoring the error while creating a link for " + srcPath, e);
        } finally { // delete the hold file
            if (holdFile.exists()) {
                holdFile.delete();
            }
        }
        return new Pair<Integer,Long>(linksCreated, sizeSaved);
    }
        
    private void markBlobAsProcessed(BlobReference blob) throws ServiceException {
        DbConnection conn = null;
        try {
            conn = DbPool.getConnection();
            DbVolumeBlobs.updateProcessed(conn, blob.getId(), true);
            conn.commit();
        } finally {
            DbPool.quietClose(conn);
        }
    }
    
    public synchronized void stopProcessing() {
        stopProcessing = true;
    }
    
    private synchronized boolean isStopProcessing() {
        return stopProcessing;
    }
    
    public synchronized boolean isRunning() {
        return inProgress;
    }
    
    private synchronized void resetProgress() {
        inProgress = false;
        stopProcessing = false;
    }
    
    private synchronized void incrementCountAndSize(int count, long size) {
        totalLinksCreated += count;
        totalSizeSaved += size;
    }

    public synchronized Pair<Integer, Long> getCountAndSize() {
        return new Pair<Integer,Long>(totalLinksCreated, totalSizeSaved);
    }

    public void process(List<Short> volumeIds) throws ServiceException, IOException {
        synchronized (this) {
            if (inProgress) {
                throw MailServiceException.TRY_AGAIN("Dedeupe is already in prgoress. Only one request can be run at a time.");
            }
            inProgress = true;
            totalLinksCreated = 0;
            totalSizeSaved = 0;
        }
        Thread thread = new BlobDeduperThread(volumeIds);
        thread.start();
    }
    
    private class BlobDeduperThread extends Thread {
        List<Short> volumeIds;

        public BlobDeduperThread(List<Short> volumeIds) {
            this.volumeIds = volumeIds;
        }
        
        public void run() {   
            for (short volumeId : volumeIds) {
                try {
                    Volume vol = VolumeManager.getInstance().getVolume(volumeId);
                    SpoolingCache<String> digests;
                    DbConnection conn = null;
                    try {
                        conn = DbPool.getConnection();
                        digests = DbVolumeBlobs.getUniqueDigests(conn, vol);
                    } finally {
                        DbPool.quietClose(conn);
                    }
                    for (String digest : digests) {
                        Pair<Integer, Long> pair = processDigest(digest, vol);
                        incrementCountAndSize(pair.getFirst(), pair.getSecond());
                        if (isStopProcessing()) {
                            ZimbraLog.misc.info("Recieved the stop signal. Stopping the deduplication process.");
                            break;
                        }
                    }
                } catch (ServiceException e) {
                    ZimbraLog.misc.error("error while performing deduplication", e);
                } catch (IOException e) {
                    ZimbraLog.misc.error("error while performing deduplication", e);
                } finally {
                    resetProgress();
                }
            }
            ZimbraLog.misc.info("Deduping done. Total of " + totalLinksCreated
                    + " links created and saved approximately " + totalSizeSaved + " bytes.");
        }
    }
}
