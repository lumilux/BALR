/* runs everytime a tab changes.
checks to see if the current page is dead, and if so, redirect to BALR page */
chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
	console.log(changeInfo);
	if(changeInfo.status === 'loading') {
		var url = tab.url;

		// only worry about http links
		// and if the balr flag is false, don't do anything
		if(url.match(/^https/) === null && url.match(/^http/) !== null
			&& url.match(/\?.*nobalr/) === null) {
			var xhr = new XMLHttpRequest();
			xhr.open('HEAD', url, true);
			xhr.onloadend = function() {
				if(xhr.status === 0) {
					// if there's a bad XHR status, we redirect to BALR's page

					// first we check to see if the user's network connectivity is up though, 
					// with a call to google
					var networkXhr = new XMLHttpRequest();
					networkXhr.open('HEAD', 'http://davidhu.me', true);
					networkXhr.onloadend = function() {
						if(networkXhr.status !== 0) {
							// if no error, then the original website really is down and we should show BALR suggestions
							// if networkXhr gets a non-error status code, just render chrome's default

							// but first check to see if logged in
							var storage = window.localStorage;
							if(storage) {
								var user = storage.getItem('balr_user');
								if(user === null) {
									chrome.tabs.update({'url': chrome.extension.getURL('balr.html?'+url)});
								} else {

								}
							}

							
						}
					}
					networkXhr.send(null);
				}
			};
			xhr.send(null);
		}
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
					'user': user
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
	}
});
