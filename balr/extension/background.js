chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
	if(changeInfo.status === 'loading') {
		var url = tab.url;

		// only worry about http links
		// and if the balr flag is false, don't do anything
		if(url.match(/^https/) === null && url.match(/^http/).length > 0
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
							// if no error, then the original website really is down and we show BALR suggestions
							// if networkXhr gets a non-error status code, just render chrome's default
							chrome.tabs.update({'url': chrome.extension.getURL('balr.html?'+url)});
						}
					}
					networkXhr.send(null);
				}
			};
			xhr.send(null);
		}
	}
});