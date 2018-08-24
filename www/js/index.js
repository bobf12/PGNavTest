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
  theme:'auto',
   root:'#app',
   id: 'mdx.bob.insight', // App bundle ID
   name: 'Insight' // App name
 }
);
function buildViews(){
  var mainView = app.views.create('.view-main', {  });
}
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
  initResponseDatabase();
});

var db=null;


function getStudyFiles(){
  //var url='http://idc.mdx.ac.uk/insightgen/app-support/questionFiles/getStudyFiles.php?sid=300';
  var url='http://idc.mdx.ac.uk/insightgen/app-support/questionFiles/studies/100/questions.xml';
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
  console.log("2 .... :");
}

function DownloaderError(err) {
  console.log("download error: " + err);
  alert("download error: " + err);
}

function DownloaderSuccess() {
  console.log("yay! Downloaded:");
  processXML();
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
  buildViews();
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
    li.setAttribute("id", "li"+qid);

    var d1 = document.createElement("div");
    d1.setAttribute("class", "item-inner");

    var dLab = document.createElement("div");
    dLab.setAttribute("class", "item-title item-label");
    dLab.innerHTML=qElem.getAttribute("text");
    var d2 = document.createElement("div");
    d2.setAttribute("class", "item-input-wrap");

    //li.append(d1);
    //d1.append(dLab);
    //d1.append(d2);

    switch(qElem.tagName.toLowerCase()){
      case 'textlabel':
      ul.append(li);

      inputElem = document.createElement("p");
      inputElem.setAttribute('id', qid);
      inputElem.innerHTML=qElem.getAttribute('text');

      //d1.remove(d2);
      //d1.remove(dLab);
      //dLab.innerHTML="";
      li.append(d1);
      d1.append(inputElem);
      break;

      case 'textbox':

      ul.append(li);

      inputElem = document.createElement("input");
      inputElem.setAttribute("type", "text");
      inputElem.setAttribute('id', qid);
      inputElem.setAttribute('oninput', 'changeResponseValue(id, value)');

      var sp=document.createElement("span");

      sp.setAttribute("class", "input-clear-button");

      d2.append(inputElem);
      d2.append(sp);

      li.append(d1);
      d1.append(dLab);
      d1.append(d2);
      break;

      case 'slider':

      ul.append(li);
      // inputElem is the div containing the slider.

      inputElem = document.createElement("div");
      inputElem.setAttribute("class", "range-slider  range-slider-init");
      inputElem.setAttribute("data-label", "true");
      var sl = document.createElement("input");
      sl.setAttribute("type", "range");
      sl.setAttribute('id', qid);
      sl.setAttribute('min', 0);
      var max = 100;
      if(qElem.getAttribute('maxVal')!=null){
        max=qElem.getAttribute('maxVal');
      }
      sl.setAttribute('max', max);
      sl.setAttribute('step', 1);
      sl.setAttribute('value', 50);
      sl.setAttribute('onchange', 'changeResponseValue(id, value)');
      inputElem.append(sl);

      // Now wrap inputElem in a flex div and add endpoint labels.

      var left = document.createElement("div");
      left.setAttribute("class", "item-cell width-auto  flex-shrink-0");
      left.innerHTML=qElem.getAttribute('left');

      var right = document.createElement("div");
      right.setAttribute("class", "item-cell width-auto  flex-shrink-0");
      right.innerHTML=qElem.getAttribute('right');


      var sliderDiv = document.createElement("div");
      sliderDiv.setAttribute("class", "item-cell flex-shrink-3");

      sliderDiv.append(inputElem);

      d2.setAttribute("class", " item-input-wrap flex-container");
      d2.append(left);
      d2.append(sliderDiv);
      d2.append(right);

      li.append(d1);
      d1.append(dLab);
      d1.append(d2);
      break;

      case 'savebutton':
      break;

      case 'checkbox':

      ul.append(li);
      inputElem = document.createElement("label");
      inputElem.setAttribute("class", "item-checkbox item-content");

      var cb = document.createElement("input");
      cb.setAttribute("type", "checkbox");
      cb.setAttribute('id', qid);
      cb.setAttribute("name", "checkbox");
      cb.setAttribute('onchange', 'changeResponseValue(id,checked)');

      var i = document.createElement("i");
      i.setAttribute("class", "icon icon-checkbox");

      var lab =  document.createElement("div");
      lab.setAttribute("class", "item-inner");
      var lab2 =  document.createElement("div");
      lab2.setAttribute("class", "item-title");
      lab2.innerHTML=qElem.getAttribute('text');
      lab.append(lab2);

      inputElem.append(cb);
      inputElem.append(i);
      inputElem.append(lab);

      li.append(inputElem);

      li.removeAttribute("class");

      break;

      case 'vradio':

      var radl =  document.createElement("div");
      radl.setAttribute("class", "list  no-hairlines-between  no-hairlines");
      var ul1 =  document.createElement("ul");

      [].forEach.call(qElem.getElementsByTagName("item"), function(radioItem){

        var li1 =  document.createElement("li");

        var lab1 =  document.createElement("label");
        lab1.setAttribute("class", "item-radio item-content");

        var inp1 =  document.createElement("input");
        inp1.setAttribute("type", "radio");
        inp1.setAttribute("name", "radio-"+qid);
        //inp1.setAttribute("value", "Thing 1");

        var ic =  document.createElement("i");
        ic.setAttribute("class", "icon icon-radio");

        var ii =  document.createElement("div");
        ii.setAttribute("class", "item-inner");
        var iTitle =  document.createElement("div");
        iTitle.setAttribute("class", "item-title");
        iTitle.innerHTML=radioItem.getAttribute("text");

        ii.append(iTitle);

        lab1.append(inp1);
        lab1.append(ic);
        lab1.append(ii);
        li1.append(lab1);
        ul1.append(li1);
});
      radl.append(ul1);
      li.append(d1);
      d1.append(dLab);
      d1.append(radl);
      //li.append(radl);

      ul.append(li);


      break;

      case 'webelement':
      break;

      case 'stepcount':
      break;
    };
    if(inputElem!=null){
      //ul.append(li); // after switch, if not null
    }
  });
  return newPageDiv;
}

function changeResponseValue(q, txt){
  storeResponse(q, txt);
}

 /**
  * -----------------------------------------
  * Database functions
  */

  function initResponseDatabase(){
    // Uses WebSQL DB.
    // but// Doesn't work on Firefox! Oh well...

    // if (window.cordova.platformId === 'browser') {
    //   db = window.openDatabase('MyDatabase', '1.0', 'Data', 2*1024*1024);}
    // else {db = window.sqlitePlugin.openDatabase({name: 'MyDatabase.db', location: 'default'});}
    console.log("Initialising local DB");
    db = openDatabase('ResponsesDB', '1.0', 'Data', 2*1024);
    console.log(db);

    db.transaction(function(tx) {
      tx.executeSql('CREATE TABLE IF NOT EXISTS ResponseSets (id INTEGER PRIMARY KEY AUTOINCREMENT, timestamp)');
      tx.executeSql('CREATE TABLE IF NOT EXISTS Responses (id INTEGER PRIMARY KEY AUTOINCREMENT, setid, question, response)');
      // if ResponseSets empty  - add a new item
      tx.executeSql('SELECT * FROM ResponseSets', [],
      function(t, rs){
        if(rs.rows.length==0){
          tx.executeSql("INSERT INTO ResponseSets ('timestamp') VALUES ('ddd')");

          console.log("Created new ResponseSet");
        } else {
          console.log("ResponseSets already exist.");
        }
      },
      function(t, e){
        console.log("Insert Error:", e);
      } );
    }, function(error) {
      console.log('Transaction ERROR: ' + error.message);
    }, function() {
      console.log('Tables OK');
    });
  }



function storeResponse(q, response){
  // response to question q has changed to txt.
  console.log("Question:"+q, response);

  db.transaction(function(tx) {
    tx.executeSql('SELECT id FROM ResponseSets ORDER BY id DESC', [], function(tx1, rs) {
      var latestSetId = rs.rows.item(0).id;
      tx.executeSql("SELECT * FROM Responses WHERE setid=? AND question = ?", [latestSetId, q] ,
      function(tx2, rs){
        // selected Responses
        console.log("SetID: "+latestSetId, "NumR:"+ rs.rows.length);
        if (rs.rows.length==0){
          // no existing entry for this Q
          tx.executeSql("INSERT INTO Responses (setid, question, response) values (?, ?, ?)", [latestSetId, q, response]);
        } else {
          // this Q already in current ResponseSet
          var responseId=rs.rows.item(0).id;
          tx.executeSql("UPDATE Responses SET  question=?, response=? WHERE id=?", [q, response, responseId]);
        }
      });
    }
  );
});
}
