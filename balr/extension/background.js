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
					chrome.tabs.update({'url': chrome.extension.getURL('balr.html?'+url)});
				}
			};
			xhr.send(null);
		}
	}
});