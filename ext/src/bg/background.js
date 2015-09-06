// if you checked "fancy-settings" in extensionizr.com, uncomment this lines
// var settings = new Store("settings", {
//     "sample_setting": "This is how you use Store.js to remember values"
// });

var myDifficulty = 40;
getDifficulty();

function getDifficulty() {
	chrome.storage.local.get("difficulty", function(items) {
		if (!chrome.runtime.error) {
			console.log(typeof items.difficulty);
			if (typeof parseInt(items.difficulty) !== "number"
				|| parseInt(items.difficulty) == 0) {
				console.log("retrieved weird difficulty");
			} else {
				console.log("retrieved difficulty of " + items.difficulty);
				myDifficulty = parseInt(items.difficulty);
			}
			sendDifficulty();
		} else {
			console.log("get difficulty error");
		}
	});
}

function sendDifficulty() {
	chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
   chrome.tabs.sendMessage(tabs[0].id, {newDifficulty:myDifficulty}, function(response) {
    });
	});
	storeDifficulty();
}

function storeDifficulty() {
	chrome.storage.local.set({"difficulty" : myDifficulty}, function() {
		if (chrome.runtime.error) {
			console.log("store difficulty error");
		} else {
			console.log("stored successful");
			console.log(myDifficulty);
		}
	});
}

function calculateHighlight(difficulties) {
	console.log("my difficulty " + myDifficulty);
	var res = {toAdd:[], toRemove:[]};
	$.each(difficulties, function(word,wordDifficulty) {
		if (wordDifficulty > myDifficulty) {
			res.toAdd.push(word);
		} else if (wordDifficulty < myDifficulty) {
			res.toRemove.push(word);
		}
	});
	console.log(res);
	return res;
}

function calculateHighlightUpdate(newDifficulty, difficulties) {
	var res = {toAdd:[], toRemove:[]};
	$.each(difficulties, function(word,wordDifficulty) {
		wordDifficulty = parseInt(wordDifficulty);
		newDifficulty = parseInt(newDifficulty);
		if (newDifficulty < myDifficulty) {
			console.log("new difficulty : " + newDifficulty);
			console.log("wordDifficulty : " + wordDifficulty);
			if (wordDifficulty < myDifficulty && wordDifficulty > newDifficulty) {
				console.log("nuuhhh you got dumber " + word);
				res.toAdd.push(word);
			}
		} else {
			if (wordDifficulty > myDifficulty && wordDifficulty < newDifficulty) {
				console.log("old difficulty : " + myDifficulty);
				console.log("word difficulty : " + wordDifficulty);
				console.log("yayyy you got smarter " + word);
				res.toRemove.push(word);
			}
		}
	});
	return res;
}


var cacheDifficulties = {}; // cap?
var cacheSynonyms = {};

//example of using a message handler from the inject scripts
chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse) {
        if (request.getDifficulties) {
            getDifficulties(request.getDifficulties, function(res) {
                var highlights = calculateHighlight(res);
                getSynonyms(highlights.toAdd, function(synonym_res) {
                    sendResponse({"highlights": toHighlight, "synonyms": synonym_res});
                });
          });
        } else if (request.newDifficulty) {
          	chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
              chrome.tabs.sendMessage(tabs[0].id, {updatedPageDifficulty: quest.newDifficulty}, calculateHighlightUpdate);
            }); 
            console.log("recieved new difficulty");
            myDifficulty = request.newDifficulty;
            storeDifficulty();

        } else if (request.init) {
            sendResponse();
        }
        return true;
    }
);

// send tabs that have been used before the new myDifficulty
chrome.tabs.onActivated.addListener(function(activeInfo) {
  chrome.tabs.sendMessage(activeInfo.tabId,{updatedPageDifficulty: myDifficulty}, calculateHighlightUpdate); 
});


// TODO: change either word difficulty level or user's knowledge level to adjust
//   to feedback on false negatives or false positives
function updateKnowingness(info, tab) {
  return true;
};

// TODO: we want this to make a nice little tooltip popup. There doesn't seem to
//   be a nice way of doing this. The best way might just be to just overlay a
//   div using javascript.
function clickDefinition(info, tab) {
  var sText = info.selectionText;
  var url = "http://elo-lasers.azurewebsites.net/get_definition?word=" + sText;
  window.open(url, '_blank');
}

// add right-click events
chrome.contextMenus.create({title: "I know or don't know this word uhhhhhhhhh", contexts:["selection"], onclick: updateKnowingness});
chrome.contextMenus.create({title: "Look up definition", contexts:["selection"], onclick: clickDefinition});

// TODO openPopup
