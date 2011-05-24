## TODO

### Urgent

* Timestamp every message, preferably done by IRC.
* Properly comment all the code so far.
* Currently this is a XSS cesspool. Fix!
* When client disconnects, an error is thrown that brings down the
  server.
* Send userlist.
* Do something when username is taken.
* Datastructure protocol should work client -> server, not just server
  -> client.
* Catch timeout when connecting to irc.
* __Make private messages not show up for everyone.__

### Not-so-urgent

* Make private messages work, both receiving and sending.
* Tidy up client-side code, and make an "api" so that it gets easier to
  work on for different sites.
* Remove paperboy, node.js server should be strictly a bridge.
* Move all dependencies off npm to git clones in ./lib instead.
* Write up atleast two examples; crazy simple and facebook-look-a-like.
