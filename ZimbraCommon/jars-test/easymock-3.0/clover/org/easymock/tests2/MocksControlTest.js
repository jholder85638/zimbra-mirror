/*
 * ***** BEGIN LICENSE BLOCK *****
 * 
 * Zimbra Collaboration Suite Server
 * Copyright (C) 2011 VMware, Inc.
 * 
 * The contents of this file are subject to the Zimbra Public License
 * Version 1.3 ("License"); you may not use this file except in
 * compliance with the License.  You may obtain a copy of the License at
 * http://www.zimbra.com/license.
 * 
 * Software distributed under the License is distributed on an "AS IS"
 * basis, WITHOUT WARRANTY OF ANY KIND, either express or implied.
 * 
 * ***** END LICENSE BLOCK *****
 */
var clover = new Object();

// JSON: {classes : [{name, id, sl, el,  methods : [{sl, el}, ...]}, ...]}
clover.pageData = {"classes":[{"el":186,"id":4159,"methods":[{"el":61,"sc":5,"sl":56},{"el":68,"sc":5,"sl":63},{"el":75,"sc":5,"sl":70},{"el":91,"sc":5,"sl":77},{"el":107,"sc":5,"sl":93},{"el":126,"sc":5,"sl":109},{"el":145,"sc":5,"sl":128},{"el":178,"sc":5,"sl":147},{"el":185,"sc":5,"sl":180}],"name":"MocksControlTest","sl":33},{"el":54,"id":4159,"methods":[{"el":40,"sc":9,"sl":38},{"el":44,"sc":9,"sl":42},{"el":48,"sc":9,"sl":46},{"el":53,"sc":9,"sl":50}],"name":"MocksControlTest.A","sl":35}]}

// JSON: {test_ID : {"methods": [ID1, ID2, ID3...], "name" : "testXXX() void"}, ...};
clover.testTargets = {"test_1050":{"methods":[{"sl":38}],"name":"testNiceMock","pass":true,"statements":[{"sl":39}]},"test_203":{"methods":[{"sl":38}],"name":"testCreateMockBuilder","pass":true,"statements":[{"sl":39}]},"test_218":{"methods":[{"sl":42},{"sl":77}],"name":"testMocksControl_PartialMock_NoConstructorCalled","pass":true,"statements":[{"sl":43},{"sl":80},{"sl":81},{"sl":84},{"sl":85},{"sl":86},{"sl":87},{"sl":88},{"sl":90}]},"test_305":{"methods":[{"sl":38}],"name":"testNiceMock","pass":true,"statements":[{"sl":39}]},"test_348":{"methods":[{"sl":63},{"sl":180}],"name":"testMocksControl_Class","pass":true,"statements":[{"sl":65},{"sl":66},{"sl":67},{"sl":181},{"sl":182},{"sl":183},{"sl":184}]},"test_369":{"methods":[{"sl":42},{"sl":93}],"name":"testMocksControl_NamedPartialMock_NoConstructorCalled","pass":true,"statements":[{"sl":43},{"sl":96},{"sl":97},{"sl":100},{"sl":101},{"sl":102},{"sl":103},{"sl":104},{"sl":106}]},"test_390":{"methods":[{"sl":38},{"sl":42},{"sl":128}],"name":"testMocksControl_NamedPartialMock_ConstructorCalled","pass":true,"statements":[{"sl":39},{"sl":43},{"sl":131},{"sl":133},{"sl":135},{"sl":138},{"sl":139},{"sl":140},{"sl":141},{"sl":142},{"sl":144}]},"test_430":{"methods":[{"sl":63},{"sl":180}],"name":"testMocksControl_Class","pass":true,"statements":[{"sl":65},{"sl":66},{"sl":67},{"sl":181},{"sl":182},{"sl":183},{"sl":184}]},"test_441":{"methods":[{"sl":56},{"sl":180}],"name":"testMocksControl_Interface","pass":true,"statements":[{"sl":58},{"sl":59},{"sl":60},{"sl":181},{"sl":182},{"sl":183},{"sl":184}]},"test_448":{"methods":[{"sl":38},{"sl":42},{"sl":128}],"name":"testMocksControl_NamedPartialMock_ConstructorCalled","pass":true,"statements":[{"sl":39},{"sl":43},{"sl":131},{"sl":133},{"sl":135},{"sl":138},{"sl":139},{"sl":140},{"sl":141},{"sl":142},{"sl":144}]},"test_451":{"methods":[{"sl":70},{"sl":180}],"name":"testMocksControl_Class_WithName","pass":true,"statements":[{"sl":72},{"sl":73},{"sl":74},{"sl":181},{"sl":182},{"sl":183},{"sl":184}]},"test_470":{"methods":[{"sl":38},{"sl":42},{"sl":109}],"name":"testMocksControl_PartialMock_ConstructorCalled","pass":true,"statements":[{"sl":39},{"sl":43},{"sl":112},{"sl":114},{"sl":116},{"sl":119},{"sl":120},{"sl":121},{"sl":122},{"sl":123},{"sl":125}]},"test_471":{"methods":[{"sl":70},{"sl":180}],"name":"testMocksControl_Class_WithName","pass":true,"statements":[{"sl":72},{"sl":73},{"sl":74},{"sl":181},{"sl":182},{"sl":183},{"sl":184}]},"test_472":{"methods":[{"sl":42},{"sl":77}],"name":"testMocksControl_PartialMock_NoConstructorCalled","pass":true,"statements":[{"sl":43},{"sl":80},{"sl":81},{"sl":84},{"sl":85},{"sl":86},{"sl":87},{"sl":88},{"sl":90}]},"test_49":{"methods":[{"sl":147}],"name":"testInterfaceForbidden_PartialMock","pass":true,"statements":[{"sl":150},{"sl":151},{"sl":153},{"sl":155},{"sl":156},{"sl":161},{"sl":162},{"sl":167},{"sl":168},{"sl":173},{"sl":174}]},"test_550":{"methods":[{"sl":56},{"sl":180}],"name":"testMocksControl_Interface","pass":true,"statements":[{"sl":58},{"sl":59},{"sl":60},{"sl":181},{"sl":182},{"sl":183},{"sl":184}]},"test_613":{"methods":[{"sl":38}],"name":"testNormalMock","pass":true,"statements":[{"sl":39}]},"test_614":{"methods":[{"sl":147}],"name":"testInterfaceForbidden_PartialMock","pass":true,"statements":[{"sl":150},{"sl":151},{"sl":153},{"sl":155},{"sl":156},{"sl":161},{"sl":162},{"sl":167},{"sl":168},{"sl":173},{"sl":174}]},"test_70":{"methods":[{"sl":38}],"name":"testStrictMock","pass":true,"statements":[{"sl":39}]},"test_773":{"methods":[{"sl":38}],"name":"testCreateMockBuilder","pass":true,"statements":[{"sl":39}]},"test_849":{"methods":[{"sl":42},{"sl":93}],"name":"testMocksControl_NamedPartialMock_NoConstructorCalled","pass":true,"statements":[{"sl":43},{"sl":96},{"sl":97},{"sl":100},{"sl":101},{"sl":102},{"sl":103},{"sl":104},{"sl":106}]},"test_868":{"methods":[{"sl":38}],"name":"testStrictMock","pass":true,"statements":[{"sl":39}]},"test_904":{"methods":[{"sl":38}],"name":"testNormalMock","pass":true,"statements":[{"sl":39}]},"test_944":{"methods":[{"sl":38},{"sl":42},{"sl":109}],"name":"testMocksControl_PartialMock_ConstructorCalled","pass":true,"statements":[{"sl":39},{"sl":43},{"sl":112},{"sl":114},{"sl":116},{"sl":119},{"sl":120},{"sl":121},{"sl":122},{"sl":123},{"sl":125}]}}

// JSON: { lines : [{tests : [testid1, testid2, testid3, ...]}, ...]};
clover.srcFileLines = [[], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [], [390, 613, 470, 448, 1050, 868, 70, 203, 305, 904, 944, 773], [390, 613, 470, 448, 1050, 868, 70, 203, 305, 904, 944, 773], [], [], [390, 218, 470, 448, 849, 369, 472, 944], [390, 218, 470, 448, 849, 369, 472, 944], [], [], [], [], [], [], [], [], [], [], [], [], [550, 441], [], [550, 441], [550, 441], [550, 441], [], [], [348, 430], [], [348, 430], [348, 430], [348, 430], [], [], [471, 451], [], [471, 451], [471, 451], [471, 451], [], [], [218, 472], [], [], [218, 472], [218, 472], [], [], [218, 472], [218, 472], [218, 472], [218, 472], [218, 472], [], [218, 472], [], [], [849, 369], [], [], [849, 369], [849, 369], [], [], [849, 369], [849, 369], [849, 369], [849, 369], [849, 369], [], [849, 369], [], [], [470, 944], [], [], [470, 944], [], [470, 944], [], [470, 944], [], [], [470, 944], [470, 944], [470, 944], [470, 944], [470, 944], [], [470, 944], [], [], [390, 448], [], [], [390, 448], [], [390, 448], [], [390, 448], [], [], [390, 448], [390, 448], [390, 448], [390, 448], [390, 448], [], [390, 448], [], [], [49, 614], [], [], [49, 614], [49, 614], [], [49, 614], [], [49, 614], [49, 614], [], [], [], [], [49, 614], [49, 614], [], [], [], [], [49, 614], [49, 614], [], [], [], [], [49, 614], [49, 614], [], [], [], [], [], [550, 441, 348, 471, 451, 430], [550, 441, 348, 471, 451, 430], [550, 441, 348, 471, 451, 430], [550, 441, 348, 471, 451, 430], [550, 441, 348, 471, 451, 430], [], []]
