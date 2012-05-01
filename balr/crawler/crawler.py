import mechanize
import urllib2
import redis
import time
import sys
from collections import deque

br = mechanize.Browser()
cookies = mechanize.CookieJar()
br.set_cookiejar(cookies)
br.addheaders = [("User-agent", "Mozilla/5.0 (compatible; MSIE 5.5; Windows NT)")]
br.set_handle_robots(False)

r = redis.Redis(host='localhost', port=6379, db=4)
r2 = redis.Redis(host='localhost', port=6379, db=6)

links_to_crawl = deque([(sys.argv[1], '')])

print links_to_crawl

while True:
    next_url, ref = links_to_crawl.popleft()
    print(str(len(links_to_crawl)) + ' left; checking: ' + next_url)
    
    if r2.sismember('checked', next_url):
        continue
    
    try:
        response = br.open(next_url)
        if response.code == 200:
            if len(links_to_crawl) <= 500:
                for link in br.links():
                    #print link
                    if link.url.startswith('//') or link.url[0] != '/':
                        links_to_crawl.append((link.absolute_url, br.geturl()))
    except mechanize.BrowserStateError as e:
        continue
    except (urllib2.HTTPError, urllib2.URLError) as e:
        r.sadd('refs:'+next_url, ref)
        r.sadd('dead_locs', next_url)
        print('dead: ' + next_url)
    
    r2.sadd('checked', next_url)
    time.sleep(0.5)

