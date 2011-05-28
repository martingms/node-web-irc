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
    Irc = require('./lib/IRC-js/lib/irc'),

    // Change to 8000-ish when developing
    PORT = 8006,
    WEBROOT = path.join(path.dirname(__filename), 'public');

var options = {
                ircserver       : 'localhost',
                channel         : '#nodechat',
                servernick      : 'ChatServer',
                backlogbuffer   : 100,
                welcomemessage  : function(username) {return 'Welcome to the UKE-chat, '+username+'!'},
                joinmessage     : function(nick) {return nick+' has joined the chat!'},
                partmessage     : function(nick) {return nick+' has left the chat...'}
              };

// Copied from the paperboy example at: https://github.com/felixge/node-paperboy
/*==============================START WEBSERVER============================== */
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
/*=============================END WEBSERVER=================================*/

/* Socket.IO */
var socket = io.listen(server);
var clients = [];

// IRC-backlog
var backlog = [];

// Triggered when someone connects to the server
socket.on('connection', function(client) {

  // Triggered when the connected client sends data
  client.on('message', function(data) {
    if ((/^(USERNAME:).*$/ig).test(data)) {
      var parts = data.split(":");
      client.username = parts[1];

      console.log(client.sessionId + ' = ' + client.username);

      client.ircsession = new Irc({server: options.ircserver, nick: client.username});

      //TODO this timeout-spaghetti seems a bit hackish, fix
      client.ircsession.connect(function() {
        setTimeout(function() {
          client.ircsession.join(options.channel);
          setTimeout(function() {
            //client.send({type: 'announcement', announcement:options.welcomemessage(client.username)});
          }, 2000);
        }, 2000);
      });

      client.ircsession.addListener('privmsg', function(data) {
        var nick = data.person.nick;
        var to = data.params[0];
        var message = data.params[1];
        //TODO to (irc-nick) does not necessarily equal the client.username
        //same problem as addListener(join)
        if (to == client.username) {
          client.send({type: 'privmsg', nick: nick, message: message});
        }
      });

      client.send({type: 'backlog', backlog: backlog});
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
    //FIXME for some reason this brings down the server upon quit
    //client.ircsession.quit('Logget ut av Innsida');
    client.ircsession.part(options.channel);
  });
});

function sendToAllClients(data) {
  for (var i = 0; i < clients.length; i++) {
    clients[i].send(data);
  }
};

/* IRC-js */
// Set up main irc session and join channel
mainsession = new Irc({ server: options.ircserver, nick: options.servernick });
mainsession.connect(function() {
  setTimeout(function() {
    mainsession.join(options.channel);
  }, 2000);
});

mainsession.addListener('privmsg', function(data) {
  var nick = data.person.nick;
  var channel = data.params[0];
  var message = data.params[1];
  var date = new Date();

  backlog.push({nick: nick, message: message, timestamp: date});
  if (backlog.length > options.backlogbuffer) {
    backlog.shift();
  }

  sendToAllClients({type: 'message', nick: nick, message: message, timestamp: date});
});

mainsession.addListener('join', function(data) {
  var nick = data.person.nick;
  var date = new Date();
  sendToAllClients({type: 'announcement', announcement: options.joinmessage(nick), timestamp: date});
});

mainsession.addListener('part', function(data) {
  var nick = data.person.nick;
  var date = new Date();
  sendToAllClients({type: 'announcement', announcement: options.partmessage(nick), timestamp: date});
});
