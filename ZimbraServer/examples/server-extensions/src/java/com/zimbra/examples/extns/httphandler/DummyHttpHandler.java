/*
 * ***** BEGIN LICENSE BLOCK *****
 * Zimbra Collaboration Suite Server
 * Copyright (C) 2010, 2013 Zimbra Software, LLC.
 * 
 * The contents of this file are subject to the Zimbra Public License
 * Version 1.4 ("License"); you may not use this file except in
 * compliance with the License.  You may obtain a copy of the License at
 * http://www.zimbra.com/license.
 * 
 * Software distributed under the License is distributed on an "AS IS"
 * basis, WITHOUT WARRANTY OF ANY KIND, either express or implied.
 * ***** END LICENSE BLOCK *****
 */
package com.zimbra.examples.extns.httphandler;

import com.zimbra.cs.extension.ExtensionHttpHandler;

import javax.servlet.ServletException;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.io.IOException;

/**
 * This HTTP handler handles GET requests at "/service/extension/dummyHandler" custom URI.
 *
 * @author vmahajan
 */
public class DummyHttpHandler extends ExtensionHttpHandler {

    /**
     * The path under which the handler is registered for an extension.
     *
     * @return path
     */
    @Override
    public String getPath() {
        return "/dummyHandler";
    }

    /**
     * Processes HTTP GET requests.
     *
     * @param req request message
     * @param resp response message
     * @throws java.io.IOException
     * @throws javax.servlet.ServletException
     */
    @Override
    public void doGet(HttpServletRequest req, HttpServletResponse resp) throws IOException, ServletException {
        resp.getOutputStream().print("This is a dummy http handler!");
    }
}
