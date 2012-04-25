import mechanize
import redis

br = mechanize.Browser()
cookies = mechanize.CookieJar()
br.set_cookiejar(cookies)
br.addheaders = [("User-agent", "Mozilla/5.0 (compatible; MSIE 5.5; Windows NT)")]

r = redis.StrictRedis(host='localhost', port=6379, db=4)

links_to_crawl = set('http://en.wikipedia.org/wiki/Category:Articles_needing_link_rot_cleanup_from_April_2012')

while True:
	next_url = links_to_crawl.pop()
	response = br.open(next_url)
	if response.code == 404:
		r.sadd('dead_locs', url)
	elif response.code == 200:
		for link in br.links():
			if link.url.startswith('http://') or link.url.startswith('https://') or link.url.startswith('//'):
				if len(links_to_crawl) <= 100:
					links_to_crawl.add(link.url)
