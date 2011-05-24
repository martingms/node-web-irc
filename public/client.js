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

function write(data) {
  console.log('write trigd');
  if (data.nick && data.message) {
    $('#chat').prepend('<p>'+data.nick+': '+data.message+'</p>');
  }
  if (data.announcement) {
    $('#chat').prepend('<p style="color:grey;">'+data.announcement+'</p>');
  }
};

function writeUserlist(data) {
  return;
}

function sendMessage() {
  message = document.chatbox.message.value;
  socket.send({nick: username, message: message});
  console.log('sendmessage triggd');
}


/* Socket.IO */
var socket = new io.Socket();

// Triggered when client connects with host 
socket.on('connect', function() {
  console.log('--> connected with socket');
  if (username && username != '') {
    socket.send('USERNAME:' + username);
    console.log('--> username sent to server');
  }
});

// Triggered when client recieves data from host
socket.on('message', function(data) {
  if (data.announcement || (data.nick && data.message)) {
    write(data);
    console.log(data);
    console.log('first if');
  }
  else if (data.userlist) {
    writeUserlist(data.userlist);
  }
  else if (data.backlog) {
    console.log('skal ikke trigges');
    write(data);
  }
});

// Triggered when connection is lost between client and host
socket.on('disconnect', function() {
  console.log('Connection lost');
});
