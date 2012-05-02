BALR
====

DEPENDENCIES
------------

* redis: http://vvv.tobiassjosten.net/linux/installing-redis-on-ubuntu-with-apt

* node.js: http://nodejs.org/#download
    * express: sudo npm install express
    * redis: sudo npm install redis
    
* python: http://python.org/download/
    * redis: sudo easy_install redis
    * Mechanize: sudo easy_install mechanize

* ruby: http://www.ruby-lang.org/en/downloads/
    * sinatra: sudo gem install sinatra
    * redis: sudo gem install sinatra-redis
    * bcrypt-ruby: sudo gem install bcrypt-ruby

RUNNING
-------
Make sure you have redis running as a server: ```redis-server```. Please see the [Redis Quick Start guide](http://redis.io/topics/quickstart) for more details on running Redis.

To run the crawler, do ```python balr/crawler/crawler.py http://www.metafilter.com/archived.mefi/02/01/2000/```, for example.

To run the node server, do ```node balr/express/app.js```.

To run the web front-end, do ```ruby balr/web-client/balr.rb```.

NOTE
----
```balr/express/node_modules/``` is included so that express does not need to be set up. Note, however, that the contents of this directory are dependencies and were not written by us.