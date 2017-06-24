'use strict';

// This file contains the event handlers for the mpv module
// These function should not be called on their own, they are just bound
// to the respective events when the module is initialized
//
// Since they need access to some member variables they have to included to
// the module itself
//
// These events are bound in the _startStop.js submodule

var events = {
	// When the MPV is closed (usually that means it crashed) this handler is
	// called and restarts MPV again
	//
	// THis does not happen when the quit method is called

	// Event: close
	closeHandler: function () {
		if(this.options.debug || this.options.verbose){
			console.log("MPV Player seems to have died. Trying to restart");
		}
		// destroy the socket because a new one will be created
		this.socket.socket.destroy();
		// restart mpv
		this.start().then(() => {
			if(this.options.debug || this.options.verbose){
				console.log("Restarted MPV Player");
			}
		})
		// report the error if one occurs
		.catch((error) => {
			console.log(error);
		});
	},
	// When ever an error is called from the MPV child process it is reported here
	//
	// @param error {Object}
	// Error object sent by MPV
	//
	// Event: error
	errorHandler: function (error) {
		if(this.options.debug){
			console.log(error);
		}
	},
	// Parses the messages emittet from the ipcInterface. They are all JSON objects
	// sent directly by MPV
	//
	// The different events
	// 		idle:			  MPV stopped playing
	// 		playback-restart: MPV started playing
	// 		pause:			  MPV has paused
	// 		resume: 		  MPV has resumed
	// 		property-change   One (or more) of the properties have changed
	// are handled. They are then turned into events of this module
	//
	// This handler also handles the properties requested via the getProperty methpd
	//
	// @param message {Object}
	// JSON message from MPV
	//
	// Event: message
	messageHandler: function (message) {
		// handle MPV event messages
		if("event" in message){
			// if verbose was specified output the event
			// property-changes are output in the statuschange emit
			if(this.options.verbose ){
				if("event" in message){
					if(!(message.event === "property-change")){
						console.log("Message received: " + JSON.stringify(message));
					}
				}
				else{
					console.log("Message received: " + JSON.stringify(message));
				}
			}

			// Handle the different event types
			switch(message.event) {
				case "idle":
					if(this.options.verbose){console.log("Event: stopped")};
					// emit stopped event
					this.emit("stopped");
					break;
				case "playback-restart":
					if(this.options.verbose){console.log("Event: start")};
					// emit play event
					this.emit("started");
					break;
				case "pause":
					if(this.options.verbose){console.log("Event: pause")};
					// emit paused event
					this.emit("paused");
					break;
				case "unpause":
					if(this.options.verbose){console.log("Event: unpause")};
					// emit unpaused event
					this.emit("resumed");
					break;
				// observed properties
				case "property-change":
					// time position events are handled seperately
					if(message.name === "time-pos"){
						// set the current time position
						this.currentTimePos = message.data;
						break;
					}
					else{
						// updates the observed value or adds it, if it was previously unobserved
						this.observed[message.name] = message.data;
						// emit a status change event
						this.emit('statuschange', this.observed);
						// output if verbose
						if(this.options.verbose){
							console.log("Event: statuschange");
							console.log("Property change: " + message.name + " - " + message.data);
						}
						break;
					}
				default:

			}

		}
		// this API assumes that only get_property requests will have a request_id
		else if("request_id" in message){
			// output if verbose
			if(this.options.verbose){
				console.log("Get Request: " + message.request_id + " - " + message.data);
			}

			// This part is strongly coupled to the getProperty method in _commands.js

			// Promise Way
			// gottenProperties[message.request_id] was already set to the resolve function
			if(this.gottenProperties[message.request_id]){
				// store the retrieved property inside the gottenProperties dictionary
				// this will resolve the promise in getProperty (_command.js)
				this.gottenProperties[message.request_id](message.data);
				// delete the entry from the gottenProperties dictionary
				delete this.gottenProperties[message.request_id];
			}
			// Non Promise Way
			else{
				// emit a getRequest event
				this.emit("getrequest", message.request_id, message.data);
			}

		}


	}

}

module.exports = events;