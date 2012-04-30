
/**
 * Module dependencies.
 */

var express = require('express')
  , routes = require('./routes')
  , querystring = require('querystring');

var redis = require('redis')
  , r = redis.createClient();

r.select(4);

var REDIS_ERROR = 'something went wrong with redis';

var allowCrossDomain = function(req, res, next) {
    res.header('Access-Control-Allow-Origin', 'http://localhost:4567');
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
    res.header('Access-Control-Allow-Headers', 'Content-Type');

    next();
};

var app = module.exports = express.createServer();

// Configuration

app.configure(function(){
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(allowCrossDomain);
  app.use(app.router);
  app.use(express.static(__dirname + '/public'));
});

app.configure('development', function(){
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});

app.configure('production', function(){
  app.use(express.errorHandler());
});

// Routes

app.get('/', routes.index);

app.listen(3000, function(){
  console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);
});

app.get('/alts/:dead_url', function(req, res, next) {
  dead_url = querystring.unescape(req.params.dead_url);
  console.log(dead_url);
  // return status, dead_location, alternatives
   
  r.sismember('dead_locs', dead_url, function(err, reply) {
    if(err) return next(new Error(REDIS_ERROR));
    if(reply) {
      r.exists('alts:'+dead_url, function(err, reply) {
        if(err) return next(new Error(REDIS_ERROR));
        if(reply) {
          r.hgetall('alts:'+dead_url, function(err, obj) {
            if(err) return next(new Error(REDIS_ERROR));
            alts_json = [];
            for(var alt in obj) {
              alts_json.push({url: alt, clicks: obj[alt]});
            }
            res.json({status: 'ok', dead_location: dead_url, alternatives: alts_json}, 200);
          });
        } else {
          res.json({status: 'error', message: 'dead url not in alts: ' + dead_url}, 404);
        }
      });
    } else {
      r.sadd('dead_locs', dead_url, function(err, reply) {
        if(err) return next(new Error(REDIS_ERROR));
        res.json({status: 'ok', dead_location: dead_url, alternatives: []}, 201);
      });
    }
  });
  console.log('wat.');
});

app.put('/alts/:dead_url', function(req, res, next) {
  // put is oddball, needs req.on(data) listener
  req.setEncoding('utf8');
  req.on('data', function(data) {
    dead_url = querystring.unescape(req.params.dead_url);
    console.log(dead_url);
    var jsonData = JSON.parse(data);
    console.log('JSON DATA', jsonData);
    if('alternative' in jsonData) {
      alt_url = jsonData.alternative;
      r.sismember('dead_locs', dead_url, function(err, reply) {
        if(err) return next(new Error(REDIS_ERROR));
        
        //add dead_url to dead_locs set whether or not it's already a member
        r.sadd('dead_locs', dead_url, function(err, reply) {
          if(err) return next(new Error(REDIS_ERROR));

          // create add field alt_url with value 0 to alts:dead_url set
          // TODO check to see if alt_url is already a member of alts:dead_url set?
          r.hincrby('alts:'+dead_url, alt_url, 0, function(err, reply) {
            if(err) return next(new Error(REDIS_ERROR));

            // add to refs:dead_link list, which holds a list of URLs that refer to this dead link
            if(jsonData.referrer !== 'null' && jsonData.referrer !== null) { // NB: null here can be a string
              r.sadd('refs:'+dead_url, jsonData.referrer, function(err, reply) {
                if(err) return next(new Error(REDIS_ERROR));
              });
            }

            // add to list of dead urls this user has submitted
            if(jsonData.username !== null) {
              r.sadd('contributions:'+jsonData.username, dead_url, function(err, reply) {
                if(err) return next(new Error(REDIS_ERROR));
              });

              // add to list of alternative URLs this user has provided for this particular dead url
              r.sadd('contributions:'+jsonData.username+':'+dead_url, alt_url, function(err, reply) {
                if(err) return next(new Error(REDIS_ERROR));  
              }); 

              // increase this user's score
              r.hincrby('users:'+jsonData.username, 'score', 1, function(err, reply) {
                if(err) return next(new Error(REDIS_ERROR));
              });
            }
                  
            res.json(201); // everything went better than expected               

          });
        });
      });
    } else {
      res.json({status: 'error', message: 'missing alternative'}, 400);
    }
  }); // end req.on(data)
}); // end app.put

// when POSTing, increase the count of clicks by 1
app.post('/alts/:dead_url', function(req, res, next) {
  req.setEncoding('utf8');
  req.on('data', function(data) {
    dead_url = querystring.unescape(req.params.dead_url);
    var jsonData = JSON.parse(data);
    console.log('JSON DATA', jsonData);
    r.hincrby('alts:'+dead_url, jsonData.alternative, 1, function(err, reply) {
      if(err) return next(new Error(REDIS_ERROR)); 

      console.log('increased clicks!');
      res.json({'status': 'ok'}, 200);
    });
  });
});

// increase a user's score
app.post('/users/:user/score', function(req, res, next) {
  req.setEncoding('utf8');
  req.on('data', function(data) {
    console.log('data is ', data);
    var jsonData = JSON.parse(data);
    var user = querystring.unescape(req.params.user);
    r.sismember('dead_locs:'+user, jsonData.dead_link, function(err, reply) {
      if(err) return next(new Error(REDIS_ERROR)); 

      // increase user's score and add to dead_locs:user if not a member
      console.log('CHECKING REPLY FOR dead_locs:'+user, reply);
      if(!reply) {
        r.hincrby('users:'+user, 'score', 1, function(err, reply) {
          if(err) return next(new Error(REDIS_ERROR)); 

          console.log('increased score!');
          r.sadd('dead_locs:'+user, jsonData.dead_link, function(err, reply) {
            if(err) return next(new Error(REDIS_ERROR)); 

            res.json({'status': 'ok'}, 200);
          });
        });
      } else {
        res.json({'status': 'nochange'}, 200);
      }
    });
  });
});


