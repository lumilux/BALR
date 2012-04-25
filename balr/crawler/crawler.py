import mechanize
import urllib2
import redis
import time
import sys

br = mechanize.Browser()
cookies = mechanize.CookieJar()
br.set_cookiejar(cookies)
br.addheaders = [("User-agent", "Mozilla/5.0 (compatible; MSIE 5.5; Windows NT)")]
br.set_handle_robots(False)

r = redis.Redis(host='localhost', port=6379, db=4)
r2 = redis.Redis(host='localhost', port=6379, db=5)

links_to_crawl = set([sys.argv[1]])

print links_to_crawl

while True:
    next_url = links_to_crawl.pop()
    print('checking: ' + next_url)
    print(str(len(links_to_crawl)))
    
    if r2.sismember('checked', next_url):
        continue
    
    try:
        response = br.open(next_url)
        if response.code == 200:
            if len(links_to_crawl) <= 50:
                for link in br.links(): #(s for s in br.links() if s.tag == 'a'):
                    links_to_crawl.add(link.absolute_url)
    except (urllib2.HTTPError, urllib2.URLError) as e:
        r.sadd('dead_locs', next_url)
        print('dead: ' + next_url)
    
    r2.sadd('checked', next_url)
    time.sleep(1.0)

