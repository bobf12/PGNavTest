/*
* Licensed to the Apache Software Foundation (ASF) under one
* or more contributor license agreements.  See the NOTICE file
* distributed with this work for additional information
* regarding copyright ownership.  The ASF licenses this file
* to you under the Apache License, Version 2.0 (the
* "License"); you may not use this file except in compliance
* with the License.  You may obtain a copy of the License at
*
* http://www.apache.org/licenses/LICENSE-2.0
*
* Unless required by applicable law or agreed to in writing,
* software distributed under the License is distributed on an
* "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
* KIND, either express or implied.  See the License for the
* specific language governing permissions and limitations
* under the License.
*/

var app = new Framework7({
theme:'ios'}
);

// If we need to use custom DOM library, let's save it to $$ variable:
var $$ = Dom7;

//var pageSeq=[ "#tab-1", "#tab-2", "#tab-3"];
var pageSeq=[ ];
var currentPage=0;

function doPrev(){
  console.log("Prev", currentPage, pageSeq,pageSeq.length);
  currentPage=currentPage-1;
  if(currentPage<0){currentPage=pageSeq.length-1;}
  app.tab.show(pageSeq[currentPage]);

}

function doNext(){
  console.log("Next", currentPage, pageSeq,pageSeq.length);
  currentPage=currentPage+1;
  if(currentPage>=pageSeq.length){currentPage=0;}
  app.tab.show(pageSeq[currentPage]);
}

$$(document).on('deviceready', function() {
  console.log("Device is ready!");

  getStudyFiles()
});



function getStudyFiles(){
  //var url='http://idc.mdx.ac.uk/insightgen/app-support/questionFiles/getStudyFiles.php?sid=300';
  var url='http://idc.mdx.ac.uk/insightgen/app-support/questionFiles/studies/199/questions.xml';
  //var downloader;
  console.log("Getting file ..."+url);

  var dl = new download();
  console.log("1  ...");
  dl.Initialize({
    fileSystem : cordova.file.dataDirectory,
    folder: "files",
    unzip: false,
    remove: false,
    timeout: 0,
    success: DownloaderSuccess,
    error: DownloaderError
  });

  console.log( "downloader initialised.");

  dl.Get(url);
  console.log("2 .... Listing:");

}

function processXML(){
  // read /files/questions.process.xml
  // parse
  // do something!
  var pathToXML=cordova.file.dataDirectory + "/files/";
  var fileName="questions.xml";
  console.log("pathToXML:", pathToXML);
  window.resolveLocalFileSystemURL(pathToXML,
    function (dirEntry) {

      console.log("dirEntry:", dirEntry);
      dirEntry.getFile(
        fileName, {create:false}, function(fileEntry){
          fileEntry.file(function(file){
            var reader = new FileReader();
            reader.onloadend = function(evt) {
              //console.log("read success");
              console.log(evt.target.result);
              //console.log(evt);
              parseXML(evt.target.result);
            };
            reader.readAsText(file);
          }
        );
      }
    );
  }
);

}
function parseXML(xmlText){
  console.log("Parsing xml...");
  parser = new DOMParser();
  xmlDoc = parser.parseFromString(xmlText,"text/xml");

  var qDiv=document.getElementById("questionnaire");

  var qs = xmlDoc.getElementsByTagName("Questionnaire")[0];
  var qps = qs.getElementsByTagName("QPage");
  console.log("QPS:", qps);
  [].forEach.call(qps, function(qp){
    console.log("QP:", qp.getAttribute("title"));
    //console.log("Here!", qp.getAttribute("title"));
    var newPageDiv=buildPageDiv(qp);
    //console.log("Qpages:", pageSeq);

    pageSeq.push("#"+qp.getAttribute("id"));
    qDiv.append(newPageDiv);
  });
  // select first page:
//  app.showTab(pageSeq[currentPage]);
  app.tab.show(pageSeq[currentPage]);
  // actually, <Questionnaire> tag specifies start page.
  // depends on whether we're doing signup or not.
}

function buildPageDiv(qPage){
  // create a single QPage.

  var newPageDiv=document.createElement("div");
  newPageDiv.setAttribute("class", "page-content tab");
  newPageDiv.setAttribute("id", qPage.getAttribute("id"));

  // page title
  var h=document.createElement("div");
  h.setAttribute('class', 'block-title');
  h.innerHTML=qPage.getAttribute("title");
  newPageDiv.append(h);

  var qList=document.createElement("div");
  qList.setAttribute("class", "list");
  var ul=document.createElement("ul");
  qList.append(ul);
  newPageDiv.append(qList);

  var qElems=qPage.children;
  [].forEach.call(qElems, function(qElem){
    var inputElem;
    var qid=qElem.getAttribute('id');

    var li = document.createElement("li");
    li.setAttribute("class", "item-content item-input");

    var d1 = document.createElement("div");
    d1.setAttribute("class", "item-inner");
    var dLab = document.createElement("div");
    dLab.setAttribute("class", "item-title item-label");
    dLab.innerHTML=qElem.getAttribute("text");
    var d2 = document.createElement("div");
    d2.setAttribute("class", "item-input-wrap");

    li.append(d1);
    d1.append(dLab);
    d1.append(d2);


    switch(qElem.tagName.toLowerCase()){
      case 'textlabel':
      console.log('TextLabel', qElem.getAttribute('text'));
      inputElem = document.createElement("p");
      inputElem.setAttribute('id', qid);
      //inputElem.innerHTML=qElem.getAttribute('text');

      d2.append(inputElem);
      break;

      case 'textbox':

      console.log('TextBox');
      inputElem = document.createElement("input");
      inputElem.setAttribute("type", "text");
      inputElem.setAttribute('id', qid);
      inputElem.setAttribute('oninput', 'changeText(id, value)');

      var sp=document.createElement("span");

      sp.setAttribute("class", "input-clear-button");
      d2.append(inputElem);
      d2.append(sp);
      break;

      case 'slider':
      inputElem = document.createElement("div");
      inputElem.setAttribute("class", "range-slider");
      var sl = document.createElement("input");
      sl.setAttribute("type", "range");
      sl.setAttribute('id', qid);
      sl.setAttribute('min', 0);
      sl.setAttribute('max', 100);
      inputElem.append(sl);

      d2.append(inputElem);
      break;

      case 'savebutton':
      break;

      case 'checkbox':

      inputElem = document.createElement("label");
      inputElem.setAttribute("class", "checkbox");
      var cb = document.createElement("input");
      cb.setAttribute("type", "checkbox");
      cb.setAttribute('id', qid);
      cb.setAttribute('onchange', 'changeCB()');

      var i = document.createElement("i");
      i.setAttribute("class", "item-checkbox");

      inputElem.append(cb);
      inputElem.append(i);

      d2.append(inputElem);
      break;

      case 'vradio':
      break;

      case 'webelement':
      break;

      case 'stepcount':
      break;
    };
    if(inputElem!=null){


      ul.append(li); // after switch, if not null
    }
  });

  return newPageDiv;
}

function changeText(i, s){
  console.log("Text:"+s, i);
}
function DownloaderError(err) {
  console.log("download error: " + err);
  alert("download error: " + err);
}

function DownloaderSuccess() {
  console.log("yay! Downloaded:");
  processXML();
}
