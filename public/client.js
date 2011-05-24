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

// Run once the DOM is ready
$(document).ready(function() {
  username = prompt("Enter your username: ");
  // Connects to socket.io on backend
  socket.connect();
});

function messageHandler(data) {
  $('#chat').prepend('<p>'+data.nick+': '+data.message+'</p>');
}

function announcementHandler(data) {
  $('#chat').prepend('<p style="color:grey;">'+data.announcement+'</p>');
}

function backlogHandler(data) {
  for (var i = 0; i< data.backlog.length; i++) {
    messageHandler(data.backlog[i]);
  }
}

function sendMessage() {
  message = document.chatbox.message.value;
  socket.send({nick: username, message: message});
}


/* Socket.IO */
var socket = new io.Socket();

// Triggered when client connects with host 
socket.on('connect', function() {
  if (username && username != '') {
    socket.send('USERNAME:' + username);
  }
});

// Triggered when client recieves data from host
socket.on('message', function(data) {
  switch (data.type) {
    case 'announcement':
      announcementHandler(data);
      break;
    case 'message':
      messageHandler(data);
      break;
    case 'privmsg':
      messageHandler(data);
      break;
    case 'backlog':
      backlogHandler(data);
      break;
    default:
      break;
  }
});

// Triggered when connection is lost between client and host
socket.on('disconnect', function() {
  announcementHandler({type: 'announcement', announcement: 'Connection with server lost...'});
});
