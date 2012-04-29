// this will run on every page load

// modify <a>'s so we can keep track of referrers
var links = document.querySelectorAll('a');
for(var i = 0; i < links.length; i++) {
	links[i].onclick = (function(currlink) {
		return function() {
			var reqObj = {
				'type': 'url_click',
				'linktext': currlink.innerText,
				'href': currlink.href
			};
			chrome.extension.sendRequest(reqObj, function() {
				// empty callback
			});
			// return false;
		};
	})(links[i]);
}
