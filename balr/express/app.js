
/**
 * Module dependencies.
 */

var express = require('express')
  , routes = require('./routes');

var redis = require('redis'),
  , r = redis.createClient();

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
  dead_url = req.params.dead_url;
  // return status, dead_location, alternatives
  if r.sismember('dead_locs', dead_url) 
    && r.hexists('alts:'+dead_url) {
    r.hgetall('alts:'+dead_url, function(err, obj) {
      if(err) return next(new Error('could not get alternatives for: ' + dead_url));
      alts_json = [];
      for(var alt in obj) {
        alts_json.push({url: alt, clicks: obj[alt]});
      }
      res.json(alts_json);
    });
  } else {
    return next(new Error('dead url not in db: ' + dead_url));
  }
});
