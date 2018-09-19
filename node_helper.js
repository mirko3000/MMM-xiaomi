"use strict";

/* Magic Mirror
 * Module: MMM-max
 *
 * By mirko30000
 * MIT Licensed.
 */

const NodeHelper = require('node_helper');
const Player     = require('node-aplay');
const fs         = require('fs');
const path       = require('path');

const miio = require('miio');

var deviceList = {};
var self;

module.exports = NodeHelper.create({


  start: function () {
    console.log("Starting xiaomi helper");
    this.deviceList = {};
    self = this;
  },

  //Subclass socketNotificationReceived received.
  socketNotificationReceived: function(notification, payload) {
    if (notification === 'XIAOMI_CONNECT') {
      console.log(new Date() + ": Triggering Xiaomi Gateway connect");
      var self = this;

      if (payload.token == null || payload.token === "") {
        var device = miio.device({ address: payload.ip})
        .then(    
          function(gateway) {
            self.getDevices(gateway)
          })
        .catch(console.error);
      }
      else {
        var device = miio.device({ address: payload.ip, token: payload.token })
          .then(    
            function(gateway) {
              self.getDevices(gateway)
          })
          .catch(console.error);
        }

    }
    if (notification === 'PLAY_SOUND') {
      this.playFile(payload, 500);
    }
  },
  getDevices: function(gateway) {

    var sensors = [];
    var index = 0;
    var self = this;

    gateway.on('unavailable', reg => {
      if(! reg.device) return;
      console.log(new Date() + ": Gateway unavailable");
    });
    gateway.on('error', reg => {
      if(! reg.device) return;
      console.log(new Date() + ": Gateway error");
    });
    //console.log(gateway.syncer.children);
    //console.log(gateway.syncer.children);
    for (var [key, value] of gateway.syncer.children) {

      var currentDevice = value
      // console.log(currentDevice);
      console.log("Found device with ID " + currentDevice.internalId  + " of type " + currentDevice.miioModel)

      // Register property change listener (only if not already known)
      //if (!this.deviceList[currentDevice.id]) {
        //const handler = (val, thing) => console.log('Value is now', val, 'for thing', thing.internalId);
        //currentDevice.on('temperatureChanged', this.propertyChanged);
        //currentDevice.on('relativeHumidityChanged', this.propertyChanged);
        currentDevice.on('stateChanged', this.propertyChanged);
        //currentDevice.on('temperatureChanged', e => self.propertyChanged(e));
        //this.deviceList[currentDevice.id] = currentDevice;
      //}
      // Handle different devices types
      if (currentDevice.miioModel === 'lumi.sensor_ht') {
        // console.log(currentDevice);
        var newDev = {};
        currentDevice.temperature()
            .then(result => newDev.temperature = result.value)
            .catch(err => console.log('Error occurred:', err));
        currentDevice.relativeHumidity()
            .then(result => newDev.humidity = result.value)
            .catch(err => console.log('Error occurred:', err));
        newDev.id = currentDevice.internalId;
        newDev.type = currentDevice.miioModel;
        sensors[index++] = newDev
      }
      if (currentDevice.miioModel === 'lumi.magnet') {
        
        var newDev = {};
        newDev.open = currentDevice.property('open');
        newDev.id = currentDevice.internalId;
        newDev.type = currentDevice.miioModel;
        sensors[index++] = newDev
      }
      if (currentDevice.metadata.types.has('light')) {
        var newDev = {};
        
        //newDev.power = currentDevice.property('power');
        //newDev.id = currentDevice.id;
        //newDev.type = currentDevice.type;
        //sensors[index++] = newDev
      }
    }

    this.sendSocketNotification('XIAOMI_INITDATA', sensors);
  },


  propertyChanged: function(event, source) {
    //console.log(event);
    //console.log(source.internalId);
    var myEvent = {};
    myEvent.id = source.internalId;
    myEvent.property = event.key;
    myEvent.value = event.value;
    console.log(new Date() + ": " + myEvent.id + " updated property '" + myEvent.property + "' to value " + myEvent.value);
    self.sendSocketNotification('XIAOMI_CHANGEDATA', myEvent);
  },

  /**
   * @param {String}  filename
   * @param {Number} [delay]  in ms
   */
  playFile: function (filename, delay) {

    let soundfile = __dirname + '/sounds/' + filename;

    // Make sure file exists before playing
    try {
      fs.accessSync(soundfile, fs.F_OK);
    } catch (e) {
      // Custom sequence doesn't exist
      console.log('Sound does not exist: ' + soundfile);
      return;
    }

    console.log('Playing ' + filename + ' with ' + delay + 'ms delay', true);

    setTimeout(() => {
      new Player(path.normalize(__dirname + '/sounds/' + filename)).play();
    }, delay);
      
    },
});
