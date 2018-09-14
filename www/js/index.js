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

var nextPageMap=new Map(); // Not really good enough - doesn't do conditionals.
var currentPage;
var pageHistory=[];

var studyid;
var userid;

function buildViews(){
  var mainView = app.views.create('.view-main', {  });
}
// If we need to use custom DOM library, let's save it to $$ variable:
var $$ = Dom7;
$$(document).on('deviceready', function() {
  console.log("Device is ready!");


  initLocalDatabase(function(){ init(); getStudyFiles(); } ); // make sure DB OK before proceeding?
  //getStudyFiles();
});

function init() {
  console.log("Initialise Settings");
  //setStudyID(200); // No! Needs to be a user preference or something.

  // retrieve IDs and store in variables.
  getStudyID(function (sid){studyid=sid;});
  getUserID(function(uid){userid=uid;});
}

function gotoStartPage(questionnaire){
  // get startpage & signupstartpage from
  // <Questionnaire  startpage="p0" signupstartpage="p00" >
  // tag.

  // Have we done signup?
  // set currentPage accordingly

  //console.log("Setting start page....");
  getUserID(
    function (userID){
      if (userID==null){ // never set or reset after studyID change
        currentPage='#'+questionnaire.getAttribute('signupstartpage');
      } else {
        currentPage='#'+questionnaire.getAttribute('startpage');
      }
      //console.log(currentPage);
      app.tab.show(currentPage);
      setButtonVisibility();
    });
  }


  /**
  * ---------------------------------------------------------------------------------
  * Buttons and Actions
  */

  function doPrev(){

    if(pageHistory.length>0){
      currentPage=pageHistory.pop();
      app.tab.show(currentPage);
    }
    setButtonVisibility();
  }

  function setButtonVisibility(){
    if(pageHistory.length==0){
      document.getElementById('prevButton').style.visibility='hidden';
    } else {
      document.getElementById('prevButton').style.visibility='visible';
    }
    if(nextPageMap.get(currentPage)==null){
      document.getElementById('nextButton').style.visibility='hidden';
    } else {
      document.getElementById('nextButton').style.visibility='visible';
    }
  }

  function doNext(){
    if(nextPageMap.get(currentPage)!=null){
      pageHistory.push(currentPage);
      currentPage=nextPageMap.get(currentPage);
      app.tab.show(currentPage);
    }
    setButtonVisibility();
  }

  function saveButtonPressed(nextPageID){
    // get responses from DB - possibly multiple responseSets.
    // turn into JSON
    // upload
    // create a new respnseSet in DB
    // remove uploaded responses
    console.log("Save pressed");
    extractResponseSets(uploadResponses);

    app.tab.show(nextPageID);
    // Clear the history? Shouldn't be able to go back after an upload!
    setButtonVisibility();
  }

  function setStudyIDPressed(sid){
    console.log("Set Study ID:", sid.value);
    setStudyID(sid.value); // Store in DB
    setUserID(null); // Treated as null
    getStudyFiles();
  }

  /**
  * ---------------------------------------------------------------------------------
  * Building
  */

  function getStudyFiles(){
    //var url='http://idc.mdx.ac.uk/insightgen/app-support/questionFiles/getStudyFiles.php?sid=300';
    // Need to do it this way as the variable studyid won't have been set by the time we get here.

    getStudyID(getStudyFilesForId);
    //getStudyFilesForId(studyid);
  }

  var urlBase;

  function getStudyFilesForId(sid){
    if(sid!=null){
      urlBase='http://idc.mdx.ac.uk/insightgen/app-support/questionFiles/studies/'+sid;
      var url=urlBase+'/questions.xml';
      console.log("Getting Questions file ..."+url);

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
      console.log( "downloader initialised.", dl);
      dl.Get(url);
      console.log("2 .... :");
    }
  }

  function DownloaderError(err) {
    console.log("download error: " + err);
    alert("download error: " + err);

    processXML(); // try using an existing xml file, if one exists.
  }

  function DownloaderSuccess() {
    processXML();
  }

  function processXML(){
    // read /files/questions.process.xml
    // parse
    // do something!
    var pathToXML=cordova.file.dataDirectory + "/files/";
    var fileName="questions.xml";
    //console.log("pathToXML:", pathToXML);
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
  // Remove existing children of qDiv
  while (qDiv.firstChild) {
    // in case we're re-building
    qDiv.removeChild(qDiv.firstChild);
  }
  var qs = xmlDoc.getElementsByTagName("Questionnaire")[0];

  /**
  * Need to also look at the containing <Study> element that contains qs
  * to find study start date, duration, location tracking etc
  */

  downloadAssets(qs);

  var qps = qs.getElementsByTagName("QPage");
  //console.log("QPS:", qps);
  [].forEach.call(qps, function(qp){
    //console.log("QP:", qp.getAttribute("title"));
    //console.log("Here!", qp.getAttribute("title"));
    var newPageDiv=buildPageDiv(qp);

    qDiv.append(newPageDiv);
  });
  //console.log("Links: ", nextPageMap);
  gotoStartPage(qs);
  buildViews();
}

function downloadAssets(qs){
  var assets = qs.getElementsByTagName("Asset");
  console.log("Q:", qs);
  console.log("Assets:", assets);



      console.log(": cordova.file.dataDirectory:",  cordova.file.dataDirectory);
      console.log(": cordova.file.tempDirectory:",  cordova.file.tempDirectory);
      console.log(": cordova.file.externalDataDirectory:",  cordova.file.externalDataDirectory);
      console.log(": cordova.file.documentsDirectory:",  cordova.file.documentsDirectory);
      console.log(": cordova.file.cacheDirectory:",  cordova.file.cacheDirectory);


  [].forEach.call(assets, function(asset){
    var fileName=asset.getAttribute('file');
    var url=urlBase+'/'+fileName;

    console.log("Getting Asset file ..."+url);

    var dl = new download();
    console.log("1  ...");


    dl.Initialize({
      fileSystem : cordova.file.dataDirectory,
      folder: "files",
      unzip: false,
      remove: false,
      timeout: 0,
      success: function(){console.log("Got Asset:"+fileName);},
      error: function(e){console.log("Failed to get Asset:"+fileName, e);}
    });
    console.log( "Asset downloader initialised.", dl);
    dl.Get(url);
  });
}


function buildPageDiv(qPage){
  // create a single QPage from the source element qPage.

  // Do something about conditional links!
  var links = qPage.getElementsByTagName("Link");
  if (links.length>0){
    nextPageMap.set('#'+qPage.getAttribute("id"), '#'+links.item(links.length-1).id);  // i.e. link to the last one
  }

  var newPageDiv=document.createElement("div");
  newPageDiv.setAttribute("class", "page-content tab");
  newPageDiv.setAttribute("id", qPage.getAttribute("id"));

  // Header Images


  var imgFileName=qPage.getAttribute('header');
  var im=document.createElement("img");
  //im.setAttribute('src', urlBase+"/"+imgFileName); // Wrong: should use local copy!
  //im.setAttribute('width', '100%');
  //newPageDiv.append(im);


  // Can try: use a div instead of img. Set the background of the div to be the image.

  var pathToFiles=cordova.file.dataDirectory + "/files/";
  console.log("pathToFiles:", pathToFiles);

  var fn = pathToFiles+'/'+imgFileName
console.log('FN: ' + fn);
  resolveLocalFileSystemURL(fn, function(entry) {
      var nativePath = entry.toURL();
      console.log('Native URI: ' + nativePath);

      console.log("got file: " + entry.fullPath);
      console.log('cdvfile URI: ' + entry.toInternalURL());
      im.setAttribute('src', nativePath);
  });
  /*
  window.resolveLocalFileSystemURL(pathToFiles,
    function (dirEntry) {
      console.log("IMG dirEntry:", dirEntry);
      dirEntry.getFile(
        imgFileName, {create:false}, function(fileEntry){

          console.log("got file: " + fileEntry.fullPath);
                console.log("IMG fileEntry:", fileEntry.toURL());
                console.log('cdvfile URI: ' + fileEntry.toInternalURL());

                im.setAttribute('src', 'cdv'+fileEntry.toInternalURL() );
                //im.setAttribute('class', 'lazy');
}
        );
      }
    );
*/

  // page title
  var h=document.createElement("div");
  h.setAttribute('class', 'insight-qpage-title block-title');
  h.innerHTML=qPage.getAttribute("title");
  newPageDiv.append(h);
  newPageDiv.append(im);


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
    dLab.setAttribute("class", "insight-question-text item-title item-label ");
    dLab.innerHTML=qElem.getAttribute("text");
    var d2 = document.createElement("div");
    d2.setAttribute("class", "item-input-wrap");

    switch(qElem.tagName.toLowerCase()){
      case 'textlabel':
      ul.append(li);

      inputElem = document.createElement("p");
      //inputElem.setAttribute('id', qid); // do we hve an ID for labels?
      inputElem.innerHTML=qElem.getAttribute('text');
      inputElem.setAttribute("class", "insight-text-label");

      li.append(d1);
      d1.append(inputElem);
      break;

      case 'textbox':

      ul.append(li);

      inputElem = document.createElement("input");
      inputElem.setAttribute("type", "text");
      inputElem.setAttribute("class", "insight-text-input");
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
      inputElem.setAttribute("class", "range-slider range-slider-init");
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
      left.setAttribute("class", "insight-slider-label item-cell width-auto  flex-shrink-0");
      left.innerHTML=qElem.getAttribute('left');

      var right = document.createElement("div");
      right.setAttribute("class", "insight-slider-label item-cell width-auto  flex-shrink-0");
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

      ul.append(li);

      var b = document.createElement("button");
      b.setAttribute("class", "insight-save-button button");
      //<i class="f7-icons">info</i>
      b.setAttribute("nextpage", qElem.getAttribute("nextpage"));
      b.innerHTML=qElem.getAttribute('text');
      b.setAttribute("onclick", "saveButtonPressed("+qElem.getAttribute("nextpage")+")");
      li.append(b);

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
      lab2.setAttribute("class", "insight-checkbox-label item-title");
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
      radl.setAttribute("class", "list no-hairlines-between  no-hairlines"); // can we remove some of the space around the lsit?
      //radl.setAttribute("id", qid); // can we remove some of the space around the lsit?
      var ul1 =  document.createElement("ul");
      ul1.setAttribute("class", "insight-radio");

      [].forEach.call(qElem.getElementsByTagName("item"), function(radioItem){

        var li1 =  document.createElement("li");
        var lab1 =  document.createElement("label");
        lab1.setAttribute("class", "item-radio item-content");

        var inp1 =  document.createElement("input");
        inp1.setAttribute("type", "radio");
        inp1.setAttribute("name", qid);
        inp1.setAttribute("value", radioItem.getAttribute('id'));

        inp1.setAttribute('onchange', 'changeResponseValue(name,value)');

        var ic =  document.createElement("i");
        //ic.setAttribute("class", "icon icon-radio");
        ic.setAttribute("class", "icon-radio");

        var ii =  document.createElement("div");
        ii.setAttribute("class", "item-inner");
        var iTitle =  document.createElement("div");
        iTitle.setAttribute("class", "insight-radio-item item-title");
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

      ul.append(li);
      break;

      case 'webelement':
      break;
      case 'stepcount':
      break;
      case 'phototaker':
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
* ---------------------------------------------------------------------------------
* Database functions
*/

var db=null;

function initLocalDatabase(callback){
  // Uses WebSQL DB.
  // but// Doesn't work on Firefox! Oh well...

  // callback is called once DB initialisation done.

  // if (window.cordova.platformId === 'browser') {
  //   db = window.openDatabase('MyDatabase', '1.0', 'Data', 2*1024*1024);}
  // else {db = window.sqlitePlugin.openDatabase({name: 'MyDatabase.db', location: 'default'});}
  console.log("Initialising local DB");
  db = openDatabase('ResponsesDB', '1.0', 'Data', 2*1024);
  console.log(db);

  db.transaction(function(tx) {

    tx.executeSql('CREATE TABLE IF NOT EXISTS ResponseSets (id INTEGER PRIMARY KEY AUTOINCREMENT, timestamp)');
    tx.executeSql('CREATE TABLE IF NOT EXISTS Responses (id INTEGER PRIMARY KEY AUTOINCREMENT, setid, question, response)');

    tx.executeSql('CREATE TABLE IF NOT EXISTS QSettings (name STRING PRIMARY KEY, value)');

    // if ResponseSets empty  - add a new item
    // should this be done as a callback? Or do the creates above run synchronously?

    /*
    tx.executeSql('SELECT * FROM ResponseSets', [],
    function(t, rs){
    // Success
    if(rs.rows.length==0){
    var timestamp = (new Date()).toISOString().substr(0, 19);
    tx.executeSql("INSERT INTO ResponseSets ('timestamp') VALUES (?)", [timestamp]);// Date / time now

    console.log("Created new ResponseSet");
  } else {
  console.log("ResponseSets already exist.");
}
},
function(t, e){
console.log("Insert Error:", e);
} );

callback();
*/
}, function(error) {
  console.log('Transaction ERROR: ' + error.message);
}, function() { // Success
  console.log('Tables OK');
  createResponseSetIfNotPresent();
  callback(); // should this be passed in as a success callback for createResponseSetIfNotPresent?
});
}

function createResponseSetIfNotPresent(){
  //
  db.transaction(function(tx) {
    tx.executeSql('SELECT * FROM ResponseSets', [],
    function(t, rs){
      // Success
      if(rs.rows.length==0){
        var timestamp = (new Date()).toISOString().substr(0, 19);
        tx.executeSql("INSERT INTO ResponseSets ('timestamp') VALUES (?)", [timestamp]);// Date / time now

        console.log("Created new ResponseSet");
      } else {
        console.log("ResponseSets already exist.");
      }
    },
    function(t, e){
      console.log("Insert Error:", e);
    } );

  });
}

function storeResponse(q, response){
  // response to question q has changed to txt.
  console.log("Question:"+q, response);

  db.transaction(function(tx) {
    // find the latest ResponseSetID, and store this response as part of that set
    tx.executeSql(
      'SELECT id FROM ResponseSets ORDER BY id DESC', [], function(tx1, rs) {
        var latestSetId = rs.rows.item(0).id;
        tx.executeSql(
          "SELECT * FROM Responses WHERE setid=? AND question = ?", [latestSetId, q] ,
          function(tx2, rs){
            // selected Responses
            //console.log("SetID: "+latestSetId, "NumR:"+ rs.rows.length);
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

  function deleteResponses(setID){
    // delete the responses from a given set.

    db.transaction(function(tx) {
      // find the latest ResponseSetID, and store this response as part of that set
      tx.executeSql('DELETE FROM Responses WHERE setid=?', [setID]);
      tx.executeSql('DELETE FROM ResponseSets WHERE id=?', [setID]);
    } );
  }

  function emptyDB(){
    //Just for debugging!

    db.transaction(function(tx) {
      tx.executeSql('DELETE FROM Responses');
      tx.executeSql('DELETE FROM ResponseSets');
      tx.executeSql('DELETE FROM QSettings');
    }, function(e){}, function(){ createResponseSetIfNotPresent();} );
  }

  /**
  * ---------------------------------------------------------------------------------
  * Upload responses
  */

  function uploadResponses(resps, setID){
    // Upload the object resps to the server.
    // setID passed in so that it can be deleted on success
    var url="http://idc.mdx.ac.uk/insightgen/app-support/insightUpload2.php";
    getSettings(function (settings){
      // 2018-09-10T14:03:45.352Z - need to truncate to:
      // 2018-09-10T14:03:45
      var timestamp = (new Date()).toISOString().substr(0, 19);
      var data={
        userid: settings.get("userid"),
        studyid: settings.get("studyid"),
        timestamp:timestamp,
        responses:resps
      };
      console.log("uploadResponses", data);

      app.request.post(url, data, function(data, status, xhr){ uploadSuccess(data, status, xhr, setID); }, uploadError);
    });
  }

  function uploadSuccess(data, status, xhr, setID){
    //console.log("Upload: Success", data, status, xhr);
    // data will contain something like { 'userid':'1234'}
    // setID is the responseSedID in local storage - these respones will be seleted on successful upload.
    if(status==200){
      // get userID
      var newUserID=JSON.parse(data).userid;
      console.log("User ID:", data, JSON.parse(data).userid);
      // save in settings (if not already there?):
      setUserID(newUserID);

      deleteResponses(setID);
      // delete the responses that have been uploaded
    } else {
      // What can cause us to get here?
      // create a new response ID
    }
  }

  function uploadError(xhr, status){
    // what can cause us to get here?
    console.log("Upload: Error", xhr, status);
  }

  /**
  * ---------------------------------------------------------------------------------
  * Extracting responses for upload.
  */



  function extractResponseSets(fun){
    // Extract all responseSets, and apply fun to each one (e.g. to do the upload - uploadResponses)
    // Generate a new responseSetID.

    //console.log("extractResponseSets");

    db.transaction(function(tx) {
      tx.executeSql('SELECT * FROM ResponseSets', [], function(tx1, rs) {
        for(var i=0; i<rs.rows.length; i++){
          var setId=rs.rows.item(i).id;
          extractResponses(setId, fun);
        }
      });
      var timestamp = (new Date()).toISOString().substr(0, 19);

      tx.executeSql('INSERT INTO ResponseSets (timestamp) values (?)', [timestamp]);
    });
  }


  function extractResponses(setID, fun){
    // console.log("extractResponses");
    // get responses in the specified set. Turn into an object - { qid:resp, qid:resp, ...}
    // apply function fun (e.g. to do the upload - uploadResponses) to the entire object.

    var resp={};
    db.transaction(function(tx) {
      tx.executeSql('SELECT * FROM Responses WHERE setid=?', [setID], function(tx1, rs) {
        for(var i=0; i<rs.rows.length; i++){
          resp[rs.rows.item(i).question]=rs.rows.item(i).response;
        }
        fun(resp, setID);
      });
    });
  }



  /**
  * ---------------------------------------------------------------------------------
  * Settings - userid, studyid
  */

  // Access settings:
  function getUserID(fun){
    // return User ID, if one has been set; null otherwise
    return getSetting('userid', fun);
  }

  function getStudyID(fun){
    // return Study ID, if one has been set; null otherwise
    getSetting('studyid', fun);

    //return 100;
  }


  function getSettings(fun){
    // retrieve all settings values as a name-value pair map; apply fun to it.
    var settingsMap = new Map();
    db.transaction(function(tx) {
      tx.executeSql("SELECT * FROM QSettings", [], function(tx1, rs){
        //console.log("SELECT: ", rs.rows.item(0).value);
        for(var i = 0; i<rs.rows.length; i++) {
          settingsMap.set(rs.rows.item(i).name, rs.rows.item(i).value);
        }
        fun(settingsMap);
      });
    });
  }

  function getSetting(name, fun){
    // retrieve the named setting value; if one has been set, apply fun to it.
    //console.log("getSetting: ", name, fun);
    db.transaction(function(tx) {
      tx.executeSql("SELECT * FROM QSettings WHERE name=?", [name], function(tx1, rs){
        //console.log("SELECT: ", rs.rows.item(0).value);
        if (rs.rows.length==0){
          // no  setting for this name.
          //return null;
          fun(null);
        } else {
          fun(rs.rows.item(0).value);
        }
      });
    });
  }

  function setUserID(value){
    setSetting('userid', value);
  }

  function setStudyID(value){
    setSetting('studyid', value);
  }

  function setSetting(name, value){
    // return User ID, if one has been set; null otherwise
    db.transaction(function(tx) {
      tx.executeSql("SELECT * FROM QSettings WHERE name=?", [name], function(tx1, rs){
        if (value != null && rs.rows.length==0){
          // no user ID. Insert a new one.
          console.log("Inserting Setting", name, value);
          tx.executeSql("INSERT INTO QSettings (name, value) VALUES (?, ?)", [name, value],
          function(t, r){ console.log("Success"); }, function(t, e){  console.log("Error", e); },
        );
      } else {
        // UserID exists. Update it.
        if(value == null){
          console.log("Deleting  Setting", name, value);
          tx.executeSql("DELETE FROM QSettings WHERE name=?", [ name]);
        } else {
          console.log("Updating  Setting", name, value);
          tx.executeSql("UPDATE QSettings SET value=? WHERE name=?", [ value, name]);
        }
      }
    });
  });
}
