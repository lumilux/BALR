
/**
 * Module dependencies.
 */

var express = require('express')
  , routes = require('./routes')
  , querystring = require('querystring');

var redis = require('redis')
  , r = redis.createClient();

r.select(4);

var app = module.exports = express.createServer();

// Configuration

app.configure(function(){
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.bodyParser());
  app.use(express.methodOverride());
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
    if(err) return next(new Error('something went wrong with redis'));
    if(reply) {
      r.exists('alts:'+dead_url, function(err, reply) {
        if(err) return next(new Error('something went wrong with redis'));
        if(reply) {
          r.hgetall('alts:'+dead_url, function(err, obj) {
            if(err) return next(new Error('something went wrong with redis'));
            alts_json = [];
            for(var alt in obj) {
              alts_json.push({url: alt, clicks: obj[alt]});
            }
            res.json({status: 'ok', dead_location: dead_url, alternatives: alts_json});
          });
        } else {
          res.json({status: 'error', message: 'dead url not in alts: ' + dead_url}, 404);
        }
      });
    } else {
      r.sadd('dead_locs', dead_url, function(err, reply) {
        if(err) return next(new Error('something went wrong with redis'));
        res.json({status: 'ok', dead_location: dead_url, alternatives: []});
      });
    }
  });
  console.log('wat.');
});

app.put('/alts/:dead_url', function(req, res, next) {
  dead_url = querystring.unescape(req.params.dead_url);
  console.log(dead_url);
});
