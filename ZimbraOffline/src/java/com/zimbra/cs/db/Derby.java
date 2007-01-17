/*
 * ***** BEGIN LICENSE BLOCK *****
 * 
 * Portions created by Zimbra are Copyright (C) 2006 Zimbra, Inc.
 * All Rights Reserved.
 * 
 * The Original Code is: Zimbra Network
 * 
 * ***** END LICENSE BLOCK *****
 */
package com.zimbra.cs.db;

import java.io.BufferedWriter;
import java.io.File;
import java.io.FileWriter;
import java.io.IOException;
import java.io.Writer;
import java.sql.SQLException;
import java.util.HashMap;
import java.util.Map;
import java.util.Properties;

import org.apache.commons.cli.CommandLine;
import org.apache.commons.cli.Options;

import com.zimbra.common.localconfig.LC;
import com.zimbra.common.util.ZimbraLog;

public class Derby extends Db {

    private Map<Db.Error, String> mErrorCodes;
    private Map<String, String> mIndexNames;

    Derby() {
        mErrorCodes = new HashMap<Db.Error, String>(6);
        mErrorCodes.put(Db.Error.DEADLOCK_DETECTED,        "40000");
        mErrorCodes.put(Db.Error.DUPLICATE_ROW,            "23505");
        mErrorCodes.put(Db.Error.FOREIGN_KEY_NO_PARENT,    "23503");
        mErrorCodes.put(Db.Error.FOREIGN_KEY_CHILD_EXISTS, "23503");
        mErrorCodes.put(Db.Error.NO_SUCH_DATABASE,         "42Y07");
        mErrorCodes.put(Db.Error.NO_SUCH_TABLE,            "42X05");

        // indexes have different names under Derby
        mIndexNames = new HashMap<String, String>();
        mIndexNames.put("i_type",           "i_mail_item_type");
        mIndexNames.put("i_parent_id",      "i_mail_item_parent_id");
        mIndexNames.put("i_folder_id_date", "i_mail_item_folder_id_date");
        mIndexNames.put("i_index_id",       "i_mail_item_index_id");
        mIndexNames.put("i_unread",         "i_mail_item_unread");
        mIndexNames.put("i_date",           "i_mail_item_date");
        mIndexNames.put("i_mod_metadata",   "i_mail_item_mod_metadata");
        mIndexNames.put("i_tags_date",      "i_mail_item_tags_date");
        mIndexNames.put("i_flags_date",     "i_mail_item_flags_date");
        mIndexNames.put("i_volume_id",      "i_mail_item_volume_id");
        mIndexNames.put("i_change_mask",    "i_mail_item_change_mask");
        mIndexNames.put("i_name_folder_id", "i_mail_item_name_folder_id");
    }

    @Override
    boolean supportsCapability(Db.Capability capability) {
        switch (capability) {
            case BITWISE_OPERATIONS:         return false;
            case BOOLEAN_DATATYPE:           return false;
            case CASE_SENSITIVE_COMPARISON:  return true;
            case DISABLE_CONSTRAINT_CHECK:   return false;
            case LIMIT_CLAUSE:               return false;
            case MULTITABLE_UPDATE:          return false;
            case ON_DUPLICATE_KEY:           return false;
            case ON_UPDATE_CASCADE:          return false;
            case UNIQUE_NAME_INDEX:          return false;
        }
        return false;
    }

    @Override
    boolean compareError(SQLException e, Db.Error error) {
        String code = mErrorCodes.get(error);
        return (code != null && e.getSQLState().equals(code));
    }

    @Override
    String forceIndexClause(String index) {
        String localIndex = mIndexNames.get(index);
        return " -- DERBY-PROPERTIES index=" + (localIndex != null ? localIndex : index) + '\n';
    }

    @Override
    DbPool.PoolConfig getPoolConfig() {
        return new DerbyConfig();
    }

    static final class DerbyConfig extends DbPool.PoolConfig {
        DerbyConfig() {
            mDriverClassName = "org.apache.derby.jdbc.EmbeddedDriver";
            mPoolSize = 12;
            mRootUrl = null;
            mConnectionUrl = "jdbc:derby:" + System.getProperty("derby.system.home", LC.zimbra_home.value() + File.separator + "derby"); 
            mLoggerUrl = null;
            mSupportsStatsCallback = false;
            mDatabaseProperties = getDerbyProperties();

            ZimbraLog.misc.debug("Setting connection pool size to " + mPoolSize);
        }

        private static Properties getDerbyProperties() {
            Properties props = new Properties();

            props.put("cacheResultSetMetadata", "true");
            props.put("cachePrepStmts", "true");
            props.put("prepStmtCacheSize", "25");        
            props.put("autoReconnect", "true");
            props.put("useUnicode", "true");
            props.put("characterEncoding", "UTF-8");
            props.put("dumpQueriesOnException", "true");
            props.put("user", LC.zimbra_mysql_user.value());
            props.put("password", LC.zimbra_mysql_password.value());

            return props;
        }
    }

    public static void main(String args[]) {
        // command line argument parsing
        Options options = new Options();
        CommandLine cl = Versions.parseCmdlineArgs(args, options);

        String outputDir = cl.getOptionValue("o");
        File outFile = new File(outputDir, "versions-init.sql");
        
        outFile.delete();
        
        Writer output = null;
        
        try {
            output = new BufferedWriter( new FileWriter(outFile) );

            String redoVer = com.zimbra.cs.redolog.Version.latest().toString();
            String outStr = "-- AUTO-GENERATED .SQL FILE - Generated by the Derby versions tool\n" +
                "INSERT INTO zimbra.config(name, value, description) VALUES\n" +
                "\t('db.version', '" + Versions.DB_VERSION + "', 'db schema version'),\n" + 
                "\t('index.version', '" + Versions.INDEX_VERSION + "', 'index version'),\n" +
                "\t('redolog.version', '" + redoVer + "', 'redolog version');\n";

            output.write(outStr);
            
            if (output != null)
                output.close();
        } catch (IOException e){
            System.out.println("ERROR - caught exception at\n");
            e.printStackTrace();
            System.exit(-1);
        }
    }
}
