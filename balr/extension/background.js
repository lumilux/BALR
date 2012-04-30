/* runs everytime a tab changes.
checks to see if the current page is dead, and if so, redirect to BALR page */

var refs = []; // keep track of referrers for each tab
var linktext = {}; // keep track of link text so we can save 
var CURR_TAB_ID; // so linktext has an idea of what tab is current

chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {

	if(changeInfo.status === 'loading') {

		var url = tab.url;

		// update referrer -- needs three because on redirect, 'curr' will be the BALR page
		// so we lose the referrer with just 2
		if(refs[tab.id] === undefined) {
			refs[tab.id] = {
				'prevprev': null,
				'prev': null,
				'curr': null
			};
		}
		
		refs[tab.id].prevprev = refs[tab.id].prev;
		refs[tab.id].prev = refs[tab.id].curr;
		refs[tab.id].curr = url;

		console.log('UPDATED REFS', refs);

		// only worry about http links
		// and if the balr flag is false, don't do anything
		if(url.match(/^https/) === null && url.match(/^http/) !== null
			&& url.match(/\?.*nobalr/) === null) {
			var xhr = new XMLHttpRequest();
			xhr.open('HEAD', url, true);
			xhr.onloadend = function() {
				console.log('XHR STATUS IS', xhr.status);
				if(xhr.status === 0 || xhr.status === 404) {
					// if there's a bad XHR status, we redirect to BALR's page

					// first we check to see if the user's network connectivity is up though, 
					// with a call to google
					var networkXhr = new XMLHttpRequest();
					networkXhr.open('HEAD', 'http://davidhu.me', true);
					networkXhr.onloadend = function() {
						if(networkXhr.status !== 0) {
							// if no error, then the original website really is down and we should show BALR suggestions
							// if networkXhr gets a non-error status code, just render chrome's default
							console.log('REFERRER IS '+refs[tab.id].prevprev);
							chrome.tabs.update({'url': chrome.extension.getURL('balr.html?'+url
								+ '&ref='+refs[tab.id].prevprev)
							});
						}
					}
					networkXhr.send(null);
				} // end xhr status
			};
			xhr.send(null);
		}
	} else if(changeInfo.status === 'complete') {
		console.log("complete, pushing up");
		updateLinktext('asdf'); // push it up one
	}
});

chrome.extension.onRequest.addListener(function(request, sender, sendResponse) {
	if(request.type === 'auth') {
		var response;
		// check localStorage to see if user is logged in
		var storage = window.localStorage;
		if(storage) {
			var user = storage.getItem('balr_user');
			if(user === null) {
				response = {
					'authenticated': false
				};
			} else {
				response = {
					'authenticated': true,
					'username': user
				};
			}
			sendResponse(response);
		} else {
			sendResponse({'authenticated': false, 'error': true});
		}
	} else if(request.type === 'login') {
		var response;

		var loginData = new FormData(null);
		loginData.append('username', request.formData.username);
		loginData.append('password', request.formData.password);
		loginData.append('remote', request.formData.remote);

		var xhr = new XMLHttpRequest();
		xhr.open('POST', 'http://localhost:4567/login', true);
		xhr.onreadystatechange = function() {
			if(xhr.readyState === 4) {
				console.log('reponse from sinatra', xhr.responseText);
				var loginResult = JSON.parse(xhr.responseText);
				if(loginResult.status) {
					var storage = window.localStorage;
					if(storage) {
						storage.setItem('balr_user', loginResult.username);
					}
				}
				sendResponse(loginResult);
			}
		};
		xhr.send(loginData);
	} else if(request.type === 'url_click') {
		// update link text list
		console.log("LINKED CLICKED", request.linktext);
		updateLinktext(request.linktext);
		//chrome.tabs.update({'url': request.href});
	}
});

function updateLinktext(text) {
	if(linktext[CURR_TAB_ID] === undefined) {
		console.log('UNDEFINED!!!');
		linktext[CURR_TAB_ID] = {
			'ppp': '',
			'prevprev': 'agagag',
			'prev': '',
			'curr': ''
		};
	}
	console.log('inside update, text is ', text);
	linktext[CURR_TAB_ID]['ppp'] = linktext[CURR_TAB_ID]['prevprev'];
	linktext[CURR_TAB_ID]['prevprev'] = linktext[CURR_TAB_ID]['prev'];
	linktext[CURR_TAB_ID]['prev'] = linktext[CURR_TAB_ID]['curr'];
	linktext[CURR_TAB_ID]['curr'] = text;
	console.log('linktext is ', linktext);
}

/* keep track of the current active tab
ID will be the key into linktext[] */
chrome.tabs.onActivated.addListener(function(tabInfo) {
	CURR_TAB_ID = tabInfo.windowId+'-'+tabInfo.tabId;
});


