-- 
-- ***** BEGIN LICENSE BLOCK *****
-- Zimbra Collaboration Suite Server
-- Copyright (C) 2012, 2013 Zimbra Software, LLC.
-- 
-- The contents of this file are subject to the Zimbra Public License
-- Version 1.4 ("License"); you may not use this file except in
-- compliance with the License.  You may obtain a copy of the License at
-- http://www.zimbra.com/license.
-- 
-- Software distributed under the License is distributed on an "AS IS"
-- basis, WITHOUT WARRANTY OF ANY KIND, either express or implied.
-- ***** END LICENSE BLOCK *****
-- 
create table milestones ( 
 id INT NOT NULL AUTO_INCREMENT PRIMARY KEY, 
 milestone VARCHAR(256) 
 );
insert into milestones (milestone) VALUES ('GunsNRoses');
insert into milestones (milestone) VALUES ('Helix');
insert into milestones (milestone) VALUES ('IronMaiden');
insert into milestones (milestone) VALUES ('JudasPriest');