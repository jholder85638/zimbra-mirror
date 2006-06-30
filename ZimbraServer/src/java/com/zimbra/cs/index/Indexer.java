/*
 * ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1
 * 
 * The contents of this file are subject to the Mozilla Public License
 * Version 1.1 ("License"); you may not use this file except in
 * compliance with the License. You may obtain a copy of the License at
 * http://www.zimbra.com/license
 * 
 * Software distributed under the License is distributed on an "AS IS"
 * basis, WITHOUT WARRANTY OF ANY KIND, either express or implied. See
 * the License for the specific language governing rights and limitations
 * under the License.
 * 
 * The Original Code is: Zimbra Collaboration Suite Server.
 * 
 * The Initial Developer of the Original Code is Zimbra, Inc.
 * Portions created by Zimbra are Copyright (C) 2005, 2006 Zimbra, Inc.
 * All Rights Reserved.
 * 
 * Contributor(s): 
 * 
 * ***** END LICENSE BLOCK *****
 */

/*
 * Created on Apr 10, 2004
 */
package com.zimbra.cs.index;

import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.util.Iterator;
import java.util.List;
import java.util.Map;

import javax.mail.internet.MimeMessage;

import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;
import org.apache.lucene.document.Document;
import org.apache.lucene.document.Field;

import com.zimbra.cs.mailbox.Contact;
import com.zimbra.cs.mailbox.MailItem;
import com.zimbra.cs.mailbox.MailServiceException;
import com.zimbra.cs.mailbox.Mailbox;
import com.zimbra.cs.mailbox.Note;
import com.zimbra.cs.mime.Mime;
import com.zimbra.cs.mime.ParsedDocument;
import com.zimbra.cs.mime.ParsedMessage;
import com.zimbra.cs.redolog.op.IndexItem;
import com.zimbra.cs.service.ServiceException;
import com.zimbra.cs.util.JMSession;
import com.zimbra.cs.util.Zimbra;


public class Indexer 
{
    private static Log mLog = LogFactory.getLog(Indexer.class);

    private static Indexer sInstance = new Indexer();

    public static Indexer GetInstance() {
        return sInstance;
    }

    private Indexer() 
    {
        sInstance = this;
    }

    public MailboxIndex.AdminInterface getAdminInterface(int mailboxId) throws ServiceException
    {
        return new MailboxIndex.AdminInterface(Mailbox.getMailboxById(mailboxId).getMailboxIndex());
    }

    public void indexItem(Mailbox mbox, int itemId, byte itemType, long timestamp)
    throws IOException, ServiceException {
        int mboxId = mbox.getId();
        MailboxIndex idx = mbox.getMailboxIndex();
        MailItem item;
        try {
            item = mbox.getItemById(null, itemId, itemType);
        } catch (MailServiceException.NoSuchItemException e) {
            // Because index commits are batched, during mailbox restore
            // it's possible to see the commit record of indexing operation
            // after the delete operation on the item being indexed.
            // (delete followed by edit, for example)
            // We can't distinguish this legitimate case from a case of
            // really missing the item being indexed due to unexpected
            // problem.  So just ignore the NoSuchItemException.
            return;
        }

        IndexItem redo = new IndexItem(mboxId, item.getId(), itemType);
        redo.start(System.currentTimeMillis());
        redo.log();
        redo.allowCommit();
        switch (itemType) {
            case MailItem.TYPE_APPOINTMENT:
                break;
            case MailItem.TYPE_DOCUMENT:
            case MailItem.TYPE_WIKI:
                indexDocument(redo, idx, itemId, (com.zimbra.cs.mailbox.Document) item, timestamp);
                break;
            case MailItem.TYPE_MESSAGE:
                InputStream is = mbox.getMessageById(null, itemId).getRawMessage();
                MimeMessage mm;
                try {
                    mm = new Mime.FixedMimeMessage(JMSession.getSession(), is);
                    ParsedMessage pm = new ParsedMessage(mm, timestamp, mbox.attachmentsIndexingEnabled());
                    indexMessage(redo, idx, itemId, pm);
                } catch (Throwable e) {
                    mLog.warn("Skipping indexing; Unable to parse message " + itemId + ": " + e.toString(), e);
                    // Eat up all errors during message analysis.  Throwing
                    // anything here will force server halt during crash
                    // recovery.  Because we can't possibly predict all
                    // data-dependent message parse problems, we opt to live
                    // with unindexed messages rather than P1 support calls.

                    // Write abort record for this item, to prevent repeat calls
                    // to index this unindexable item.
                    redo.abort();
                } finally {
                    is.close();
                }
                break;
            case MailItem.TYPE_CONTACT:
                indexContact(redo, idx, itemId, (Contact) item);
                break;
            case MailItem.TYPE_NOTE:
                indexNote(redo, idx, itemId, (Note) item);
                break;
            default:
                redo.abort();
            throw ServiceException.FAILURE("Invalid item type for indexing: type=" + itemType, null);
        }
    }

    /**
     * Index a message in the specified mailbox.
     * @param mailboxId
     * @param messageId
     * @param pm
     * @throws ServiceException
     */
    public void indexMessage(IndexItem redo, MailboxIndex idx, int messageId, ParsedMessage pm)
    throws ServiceException {
        try {
            int numDocsAdded = 0;
            for (Iterator it = pm.getLuceneDocuments().iterator(); it.hasNext(); ) {
                Document doc = (Document) it.next();
                if (doc != null) {
                    addDocument(redo, doc, idx, messageId, pm.getReceivedDate());
                    numDocsAdded++;
                }
            }
        } catch (IOException e) {
            throw ServiceException.FAILURE("indexMessage caught IOException", e);
        }
    }

    /**
     * Index a Contact in the specified mailbox.
     * @param mailboxId
     * @param mailItemId
     * @param contact
     * @throws ServiceException
     */
    public void indexContact(IndexItem redo, MailboxIndex idx, int mailItemId, Contact contact)
    throws ServiceException {
        mLog.info("indexContact("+contact+")");
        try {
            StringBuffer contentText = new StringBuffer();
            Map m = contact.getFields();
            for (Iterator it = m.values().iterator(); it.hasNext(); )
            {
                String cur = (String)it.next();

                contentText.append(cur);
                contentText.append(' ');
            }


            // FIXME: this is very slow, and unnecessary in many instances (e.g. a contact is new).  Create some kind of a flag
            // so we don't try to do this when a contact is known to be new -- such as when re-indexing.
            try {
                idx.deleteDocuments(new int[] { mailItemId });
            } catch(IOException e) {
                mLog.debug("indexContact ignored IOException deleting documents (index does not exist yet)");
            }

            Document doc = new Document();
            String subj = contact.getFileAsString().toLowerCase();
            String name = subj;

            StringBuffer emailStrBuf = new StringBuffer();
            List emailList = contact.getEmailAddresses();
            for (Iterator iter = emailList.iterator(); iter.hasNext();) {
                String cur = (String)(iter.next());
                emailStrBuf.append(cur);
                emailStrBuf.append(' ');
            }

            String emailStr = emailStrBuf.toString();

            contentText.append(ZimbraAnalyzer.getAllTokensConcatenated(LuceneFields.L_H_TO, emailStr));

            /* put the email addresses in the "To" field so they can be more easily searched */
            doc.add(Field.UnStored(LuceneFields.L_H_TO, emailStr));

            doc.add(Field.UnStored(LuceneFields.L_CONTENT, contentText.toString()));
            doc.add(Field.UnStored(LuceneFields.L_H_SUBJECT, subj));
            doc.add(Field.Keyword(LuceneFields.L_MAILBOX_BLOB_ID, Integer.toString(mailItemId)));
            doc.add(Field.Text(LuceneFields.L_PARTNAME, LuceneFields.L_PARTNAME_CONTACT));
            doc.add(new Field(LuceneFields.L_SORT_SUBJECT, subj.toUpperCase(), true/*store*/, true/*index*/, false /*token*/));
            doc.add(new Field(LuceneFields.L_SORT_NAME, name.toUpperCase(), false/*store*/, true/*index*/, false /*token*/));

            addDocument(redo, doc, idx, mailItemId, contact.getDate());

        } catch (IOException e) {
            throw ServiceException.FAILURE("indexContact caught IOException", e);
        }
    }

    /**
     * Index a Note in the specified mailbox.
     * @param mailboxId
     * @param mailItemId
     * @param note
     * @throws ServiceException
     */
    public void indexNote(IndexItem redo, MailboxIndex idx, int mailItemId, Note note)
    throws ServiceException {
        mLog.info("indexNote("+note+")");
        try {
            String toIndex = note.getContent();

            if (mLog.isDebugEnabled()) {
                mLog.debug("Note value=\""+toIndex+"\"");
            }

            try {
                idx.deleteDocuments(new int[] { mailItemId });
            } catch(IOException e) {
                mLog.debug("indexNote ignored IOException deleting documents (index does not exist yet)");
            }

            Document doc = new Document();
            doc.add(Field.UnStored(LuceneFields.L_CONTENT, toIndex));

            String subj = toIndex.toLowerCase();
            String name = subj;

            doc.add(Field.UnStored(LuceneFields.L_H_SUBJECT, subj));
            doc.add(Field.Keyword(LuceneFields.L_MAILBOX_BLOB_ID, Integer.toString(mailItemId)));
            doc.add(Field.Text(LuceneFields.L_PARTNAME, LuceneFields.L_PARTNAME_NOTE));

            doc.add(new Field(LuceneFields.L_SORT_SUBJECT, subj.toUpperCase(), true/*store*/, true/*index*/, false /*token*/));
            doc.add(new Field(LuceneFields.L_SORT_NAME, name.toUpperCase(), false/*store*/, true/*index*/, false /*token*/));

//          String dateString = DateField.timeToString(note.getDate());
//          mLog.debug("Note date is: "+dateString);
//          doc.add(Field.Text(LuceneFields.L_DATE, dateString));

            addDocument(redo, doc, idx, mailItemId, note.getDate());
            
        } catch (IOException e) {
            throw ServiceException.FAILURE("indexNote caught IOException", e);
        }
    }


    /**
     * Index a Document/WikiItem in the specified mailbox.
     * @param mailboxId
     * @param mailItemId
     * @param document
     * @throws ServiceException
     */
    public void indexDocument(IndexItem redo, MailboxIndex idx, int mailItemId, com.zimbra.cs.mailbox.Document document, long timestamp)
    throws ServiceException {
        try {
            ParsedDocument pd = new ParsedDocument(document.getBlob().getBlob().getFile(),
                        document.getFilename(), 
                        document.getContentType(),
                        timestamp);
            indexDocument(redo, idx, mailItemId, pd);
        } catch (IOException e) {
            throw ServiceException.FAILURE("indexDocument caught Exception", e);
        }
    }
    public void indexDocument(IndexItem redo, MailboxIndex idx, int mailItemId, ParsedDocument pd)
    throws ServiceException {
        try {
            try {
                idx.deleteDocuments(new int[] { mailItemId });
            } catch(IOException e) {
                mLog.debug("indexDocument ignored IOException deleting documents (index does not exist yet)");
            }
            addDocument(redo, pd.getDocument(), idx, mailItemId, pd.getCreatedDate());
        } catch (IOException e) {
            throw ServiceException.FAILURE("indexDocument caught Exception", e);
        }
    }


    boolean checkForExistence(MailboxIndex idx, int mailItemId) {
        return idx.checkMailItemExists(mailItemId);
    }

    /**
     * add the document to the mailbox specified by mailboxId
     * 
     * note that this API can get called from any of the thread pool threads, and so must be thread safe
     * @throws IOException
     * @throws ServiceException
     */
    public void addDocument(IndexItem redoOp, Document doc, MailboxIndex idx, 
                int mailboxBlobId, long receivedDate) throws IOException
                {
        addDocument(redoOp, doc, idx, mailboxBlobId, receivedDate, false);
                }

    /**
     * add the document to the mailbox specified by mailboxId
     * 
     * Note that this API can get called from any of the thread pool threads, and so must be thread safe.
     * If checkExisting is true, it will be first checked to see if the mailboxId/mailboxBlobId
     * combination is already indexed.  This is useful for retry/redo attempts.
     * @param idx TODO
     * @throws ServiceException
     */
    public void addDocument(IndexItem redoOp, Document doc, MailboxIndex idx, int mailboxBlobId, 
                long receivedDate, boolean checkExisting) throws IOException {
        long start = System.currentTimeMillis();
        String mailboxBlobIdStr = Integer.toString(mailboxBlobId);

        boolean doit = true;
        if (checkExisting) {
            boolean exists = checkForExistence(idx, mailboxBlobId);

            if (exists) {
                doit = false;
                if (mLog.isDebugEnabled()) {
                    mLog.debug("Already indexed: mailbox=" + idx + ", mailboxBlob=" + mailboxBlobId);
                }
            }
        }

        if (doit) {
            idx.addDocument(redoOp, doc, mailboxBlobIdStr, receivedDate);
        }

        if (mLog.isDebugEnabled()) {
            long end = System.currentTimeMillis();
            long elapsed = end-start; 

            mLog.debug("Indexer.addDocument took " + elapsed + "ms" );
        }
    }

    /**
     * Server startup-time initialization
     */
    public void startup() {
        // Lucene creates lock files for index update.  When server crashes,
        // these lock files are not deleted and their presence causes all
        // index writes to fail for the affected mailboxes.  So delete them.
        // ("*-write.lock" and "*-commit.lock" files)

        // same lock directory search order as in org.apache.lucene.store.FSDirectory.java
        String luceneTmpDir =
            System.getProperty("org.apache.lucene.lockdir", System.getProperty("java.io.tmpdir"));

        String lockFileSuffix = ".lock";
        File lockFilePath = new File(luceneTmpDir);
        File lockFiles[] = lockFilePath.listFiles();
        if (lockFiles != null && lockFiles.length > 0) {
            for (int i = 0; i < lockFiles.length; i++) {
                File lock = lockFiles[i];
                if (lock != null && lock.isFile() && lock.getName().endsWith(lockFileSuffix)) {
                    mLog.info("Found index lock file " + lock.getName() + " from previous crash.  Deleting...");
                    boolean deleted = lock.delete();
                    if (!deleted) {
                        String message = "Unable to delete index lock file " + lock.getAbsolutePath() + "; Aborting.";
                        Zimbra.halt(message);
                    }
                }
            }
        }

        MailboxIndex.startup();
    }

    public void shutdown() {
        MailboxIndex.shutdown();
    }

    public void flush() {
        MailboxIndex.flushAllWriters();
    }
}
