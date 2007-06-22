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
 * Portions created by Zimbra are Copyright (C) 2004, 2005, 2006 Zimbra, Inc.
 * All Rights Reserved.
 * 
 * Contributor(s): 
 * 
 * ***** END LICENSE BLOCK *****
 */

/*
 * Created on Apr 7, 2004
 */
package com.zimbra.cs.db;

import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.Iterator;
import java.util.Properties;

import org.apache.commons.dbcp.ConnectionFactory;
import org.apache.commons.dbcp.DriverManagerConnectionFactory;
import org.apache.commons.dbcp.PoolableConnectionFactory;
import org.apache.commons.dbcp.PoolingDataSource;
import org.apache.commons.pool.impl.GenericObjectPool;

import com.zimbra.common.localconfig.LC;
import com.zimbra.common.service.ServiceException;
import com.zimbra.common.util.SystemUtil;
import com.zimbra.common.util.ValueCounter;
import com.zimbra.common.util.ZimbraLog;
import com.zimbra.cs.stats.ZimbraPerf;

/**
 * @author schemers
 */
public class DbPool {

    private static int sConnectionPoolSize;
    private static PoolingDataSource sPoolingDataSource;
    private static String sRootUrl;
    private static String sLoggerRootUrl;
    private static GenericObjectPool sConnectionPool;

    static ValueCounter sConnectionStackCounter = new ValueCounter();
    
	public static class Connection {
		private java.sql.Connection mConnection;
        private Throwable mStackTrace;

		Connection(java.sql.Connection conn)  { mConnection = conn; }

		public java.sql.Connection getConnection()  { return mConnection; }

		public void setTransactionIsolation(int level) throws ServiceException {
            try {
            	mConnection.setTransactionIsolation(level);
            } catch (SQLException e) {
            	throw ServiceException.FAILURE("setting database connection isolation level", e);
            }
		}

        /**
         * Disable foreign key constraint checking for this Connection.  Used by the mailbox restore code
         * so that it can do a LOAD DATA INFILE without hitting foreign key constraint troubles.
         *   
         * @throws ServiceException
         */
        public void disableForeignKeyConstraints() throws ServiceException {
            PreparedStatement stmt = null;
            try {
                stmt = mConnection.prepareStatement("SET FOREIGN_KEY_CHECKS=0");
                stmt.execute();
            } catch (SQLException e) {
                throw ServiceException.FAILURE("disabling foreign key constraints", e);
            } finally {
                DbPool.closeStatement(stmt);
            }
        }

        public void enableForeignKeyConstraints() throws ServiceException {
            PreparedStatement stmt = null;
            try {
                stmt = mConnection.prepareStatement("SET FOREIGN_KEY_CHECKS=1");
                stmt.execute();
            } catch (SQLException e) {
                throw ServiceException.FAILURE("disabling foreign key constraints", e);
            } finally {
                DbPool.closeStatement(stmt);
            }
        }

		public PreparedStatement prepareStatement(String sql) throws SQLException {
            ZimbraPerf.incrementPrepareCount();
            return mConnection.prepareStatement(sql);
		}

        public PreparedStatement prepareStatement(String sql, int autoGeneratedKeys) throws SQLException {
            ZimbraPerf.incrementPrepareCount();
            return mConnection.prepareStatement(sql, autoGeneratedKeys);
		}

		public void close() throws ServiceException {
            try {
                mConnection.close();
            } catch (SQLException e) {
            	throw ServiceException.FAILURE("closing database connection", e);
            } finally {
                // Connection is being returned to the pool.  Decrement its stack
                // trace counter.  Null check is required for the stack trace in
                // case this is a maintenance/logger connection, or if dbconn
                // debug logging was turned on between the getConnection() and
                // close() calls.
                if (mStackTrace != null && ZimbraLog.dbconn.isDebugEnabled()) {
                    String stackTrace = SystemUtil.getStackTrace(mStackTrace);
                    synchronized(sConnectionStackCounter) {
                        sConnectionStackCounter.decrement(stackTrace);
                    }
                }
            }
		}

		public void rollback() throws ServiceException {
            try {
                mConnection.rollback();
            } catch (SQLException e) {
            	throw ServiceException.FAILURE("rolling back database transaction", e);
            }
		}
		
		public void commit() throws ServiceException {
			try {
				mConnection.commit();
            } catch (SQLException e) {
            	throw ServiceException.FAILURE("committing database transaction", e);
            }
		}
        
        /**
         * Sets the stack trace used for detecting connection leaks.
         */
        void setStackTrace(Throwable t) {
            mStackTrace = t;
        }
	}

    static abstract class PoolConfig {
        String mDriverClassName;
        int mPoolSize;
        String mRootUrl;
        String mConnectionUrl;
        String mLoggerUrl;
        boolean mSupportsStatsCallback;
        Properties mDatabaseProperties;
    }

    /**
     * Initializes the connection pool.
     */
    private static synchronized PoolingDataSource getPool() {
        if (sPoolingDataSource != null)
            return sPoolingDataSource;

        PoolConfig pconfig = Db.getInstance().getPoolConfig();

	    String drivers = System.getProperty("jdbc.drivers");
	    if (drivers == null)
	        System.setProperty("jdbc.drivers", pconfig.mDriverClassName);

        sRootUrl = pconfig.mRootUrl;
        sLoggerRootUrl = pconfig.mLoggerUrl;
        sConnectionPoolSize = pconfig.mPoolSize;
	    sConnectionPool = new GenericObjectPool(null, sConnectionPoolSize, GenericObjectPool.WHEN_EXHAUSTED_BLOCK, -1, sConnectionPoolSize);
	    ConnectionFactory cfac = new DriverManagerConnectionFactory(pconfig.mConnectionUrl, pconfig.mDatabaseProperties);

	    boolean defAutoCommit = false, defReadOnly = false;
	    new PoolableConnectionFactory(cfac, sConnectionPool, null, null, defReadOnly, defAutoCommit);

	    try {
	        Class.forName(pconfig.mDriverClassName);
	        Class.forName("org.apache.commons.dbcp.PoolingDriver");
	        sPoolingDataSource = new PoolingDataSource(sConnectionPool);
	    } catch (ClassNotFoundException e) {
	        ZimbraLog.system.fatal("can't init Pool", e);
	        System.exit(1);
	    }

        if (pconfig.mSupportsStatsCallback)
            ZimbraPerf.addStatsCallback(new DbStats());

        return sPoolingDataSource;
	}
    
    /**
     * return a connection to use for the zimbra database.
     * @param 
     * @return
     * @throws ServiceException
     */
    public static Connection getConnection() throws ServiceException {

        long start = ZimbraPerf.STOPWATCH_DB_CONN.start();

        // If the connection pool is overutilized, warn about potential leaks
        PoolingDataSource pool = getPool();
        checkPoolUsage();

        java.sql.Connection conn = null;
        try {
            conn = pool.getConnection();

            if (conn.getAutoCommit() != false)
                conn.setAutoCommit(false);

            // We want READ COMMITTED transaction isolation level for duplicate
            // handling code in BucketBlobStore.newBlobInfo().
            conn.setTransactionIsolation(java.sql.Connection.TRANSACTION_READ_COMMITTED);
        } catch (SQLException e) {
            throw ServiceException.FAILURE("getting database connection", e);
        }

        if (ZimbraLog.sqltrace.isDebugEnabled())
            conn = new DebugConnection(conn);

        Connection zimbraConn = new Connection(conn);

        // If we're debugging, update the counter with the current stack trace
        if (ZimbraLog.dbconn.isDebugEnabled()) {
            Throwable t = new Throwable();
            zimbraConn.setStackTrace(t);

            String stackTrace = SystemUtil.getStackTrace(t);
            synchronized (sConnectionStackCounter) {
                sConnectionStackCounter.increment(stackTrace);
            }
        }

        ZimbraPerf.STOPWATCH_DB_CONN.stop(start);
        return zimbraConn;
    }

    private static void checkPoolUsage() {
        int numActive = sConnectionPool.getNumActive();
        int maxActive = sConnectionPool.getMaxActive();

        if (numActive <= maxActive * 0.75)
            return;

        String stackTraceMsg = "Turn on debug logging for zimbra.dbconn to see stack traces of connections not returned to the pool.";
        if (ZimbraLog.dbconn.isDebugEnabled()) {
            StringBuilder buf = new StringBuilder();
            synchronized (sConnectionStackCounter) {
                Iterator i = sConnectionStackCounter.iterator();
                while (i.hasNext()) {
                    String stackTrace = (String) i.next();
                    int count = sConnectionStackCounter.getCount(stackTrace);
                    if (count == 0) {
                        i.remove();
                    } else {
                        buf.append(count + " connections allocated at " + stackTrace + "\n");
                    }
                }
            }
            stackTraceMsg = buf.toString();
        }
        ZimbraLog.dbconn.warn(
            "Connection pool is 75%% utilized (%d connections out of a maximum of %d in use).  %s",
            numActive, maxActive, stackTraceMsg);
    }

    /**
     * Returns a new database connection for maintenance operations, such as
     * restore. Does not specify the name of the default database. This
     * connection is created outside the context of the database connection
     * pool.
     */
    public static Connection getMaintenanceConnection() throws ServiceException {
        try {
            String user = LC.zimbra_mysql_user.value();
            String pwd = LC.zimbra_mysql_password.value();
            java.sql.Connection conn = DriverManager.getConnection(sRootUrl + "?user=" + user + "&password=" + pwd);
            conn.setAutoCommit(false);
            return new Connection(conn);
        } catch (SQLException e) {
            throw ServiceException.FAILURE("getting database maintenance connection", e);
        }
    }
    
    /**
     * Returns a new database connection for logger use.
     * Does not specify the name of the default database. This
     * connection is created outside the context of the database connection
     * pool.
     */
    public static Connection getLoggerConnection() throws ServiceException {
        try {
            String user = LC.zimbra_mysql_user.value();
            String pwd = LC.zimbra_logger_mysql_password.value();
            java.sql.Connection conn = DriverManager.getConnection(sLoggerRootUrl + "?user=" + user + "&password=" + pwd);
            return new Connection(conn);
        } catch (SQLException e) {
            throw ServiceException.FAILURE("getting database logger connection", e);
        }
    }

    /**
     * Closes the specified connection (if not <code>null</code>), catches any
     * exceptions, and logs them.
     */
    public static void quietClose(Connection conn) {
        if (conn != null) {
            try {
                if (conn.getConnection() != null && !conn.getConnection().isClosed()) {
                    conn.close();
                }
            } catch (SQLException e) {
                ZimbraLog.sqltrace.warn("quietClose caught exception", e);
            }
            catch (ServiceException e) {
                ZimbraLog.sqltrace.warn("quietClose caught exception", e);
            }
        }
    }
    
    /**
     * Does a rollback on the specified connection (if not <code>null</code>),
     * catches any exceptions, and logs them.
     */
    public static void quietRollback(Connection conn) {
        if (conn != null) {
            try {
                if (conn.getConnection() != null && !conn.getConnection().isClosed()) {
                    conn.rollback();
                }
            } catch (SQLException e) {
                ZimbraLog.sqltrace.warn("quietRollback caught exception", e);
            }
            catch (ServiceException e) {
                ZimbraLog.sqltrace.warn("quietRollback caught exception", e);
            }
        }
    }

    /**
     * Closes a statement and wraps any resulting exception in a ServiceException.
     * @param stmt
     * @throws ServiceException
     */
    public static void closeStatement(Statement stmt) throws ServiceException {
        if (stmt != null) {
            try {
                stmt.close();
            } catch (SQLException e) {
                throw ServiceException.FAILURE("closing statement", e);
            }
        }
    }

    /**
     * Closes a ResultSet and wraps any resulting exception in a ServiceException.
     * @param rs
     * @throws ServiceException
     */
    public static void closeResults(ResultSet rs) throws ServiceException {
        if (rs != null) {
            try {
                rs.close();
            } catch (SQLException e) {
                throw ServiceException.FAILURE("closing statement", e);
            }
        }
    }
    
    /**
     * Returns the number of connections currently in use.
     */
    public static int getSize() {
        return sConnectionPool.getNumActive();
    }
}
