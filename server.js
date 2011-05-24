/*
*     web-irc
*
*     A node.js-powered web-irc gateway
*
*     Libraries used:
*     -> Socket.IO (http://socket.io)
*     -> IRC-js    (https://github.com/gf3/IRC-js)
*
*     Written by Martin Gammelsæter for UKA-11 (http://uka.no)
*
*/

var path = require('path'),
    http = require('http'),
    paperboy = require('paperboy'),
    io = require('socket.io'),
    irc = require('./lib/IRC-js/lib/irc'),

    // Change to 8000-ish when developing
    PORT = 8006,
    WEBROOT = path.join(path.dirname(__filename), 'public');

var options = {ircserver: 'irc.pvv.ntnu.no',
               channel: '#testtest',
               welcomemessage: function(username) {return 'Velkommen til ukechatten, '+username+'!'}};

// Copied from the paperboy example at: https://github.com/felixge/node-paperboy
server = http.createServer(function(req, res) {
  var ip = req.connection.remoteAddress;
  paperboy
      .deliver(WEBROOT, req, res)
      .addHeader('Expires', 300)
      .addHeader('X-PaperRoute', 'Node')
      .before(function() {
          //console.log('Received Request');
      })
      .after(function(statCode) {
          log(statCode, req.url, ip);
      })
      .error(function(statCode, msg) {
          res.writeHead(statCode, {'Content-Type': 'text/plain'});
          res.end("Error " + statCode);
          log(statCode, req.url, ip, msg);
      })
      .otherwise(function(err) {
          res.writeHead(404, {'Content-Type': 'text/plain'});
          res.end("Error 404: File not found");
          log(404, req.url, ip, err);
      });
});
server.listen(PORT);

// Logs status code, url that was requested, and the client ip to the console.
function log(statCode, url, ip, err) {
  var logStr = statCode + ' - ' + url + ' - ' + ip;
  if (err) logStr += ' - ' + err;
  console.log(logStr);
};


/* Socket.IO */
var socket = io.listen(server);
var clients = [];

// Triggered when someone connects to the server
socket.on('connection', function(client) {

  // Triggered when the connected client sends data
  client.on('message', function(data) {
    if ((/^(USERNAME:).*$/ig).test(data)) {
      var parts = data.split(":");
      client.username = parts[1];

      console.log(client.sessionId + ' = ' + client.username);

      client.ircsession = new irc({server: options.ircserver, nick: client.username});

      client.ircsession.connect(function() {
        setTimeout(function() {
          client.ircsession.join(options.channel);
          setTimeout(function() {
            client.send({announcement:options.welcomemessage(client.username)});
          }, 2000);
        }, 2000);
      });

      //client.send({messages:backlog}); TODO Send backlog
      //client.send({userlist:usernames}); TODO Send usernames

      clients.push(client);
      return;
    }
    else if (data.nick && data.message) {
      console.log('---> '+data.nick+': '+data.message);
      client.ircsession.privmsg(options.channel, data.message);
    }

  });

  // Triggered when someone disconnects from the server
  client.on('disconnect', function() {
    clients.pop(client);
  });
});

/* IRC-js */
// Set up main irc session and join channel
mainsession = new irc({ server: options.ircserver, nick: 'UKAChatServer' });
mainsession.connect(function() {
  setTimeout(function() {
    mainsession.join(options.channel);
  }, 2000);
  console.log('Main IRC-session initialized');
});

mainsession.addListener('privmsg', function(msg) {
  nick = msg.person.nick;
  channel = msg.params[0];
  message = msg.params[1];

  if (clients.length > 0) {
    for (var i = 0; i < clients.length; i++) {
      clients[i].send({nick: nick, message: message});
      console.log('--> Sent a message to: '+clients[i].username);
    }
  }
});
