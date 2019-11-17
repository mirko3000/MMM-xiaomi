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

module.exports = NodeHelper.create({


  start: function () {
    console.log("Starting xiaomi helper");
    this.deviceList = {};
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

    for (var i = 0; i < gateway.devices.length; i++) {
      var currentDevice = gateway.devices[i]
      console.log("Found device with ID " + currentDevice.id  + " of type " + currentDevice.type)

      // Register property change listener (only if not already known)
      //if (!this.deviceList[currentDevice.id]) {
        currentDevice.on('propertyChanged', e => self.propertyChanged(e));
        //this.deviceList[currentDevice.id] = currentDevice;
      //}

      // Handle different devices types
      if (currentDevice.type === 'sensor') {
        var newDev = {};
        newDev.temperature = currentDevice.temperature;
        newDev.humidity = currentDevice.humidity;
        newDev.id = currentDevice.id;
        newDev.type = currentDevice.type;
        sensors[index++] = newDev
      }
      if (currentDevice.type === 'magnet') {
        var newDev = {};
        newDev.open = currentDevice.property('open');
        newDev.id = currentDevice.id;
        newDev.type = currentDevice.type;
        sensors[index++] = newDev
      }
      if (currentDevice.type === 'light') {
        var newDev = {};
        newDev.power = currentDevice.property('power');
        newDev.id = currentDevice.id;
        newDev.type = currentDevice.type;
        sensors[index++] = newDev
      }
    }

    this.sendSocketNotification('XIAOMI_INITDATA', sensors);
  },


  propertyChanged: function(event) {
    // console.log(new Date() + ": " + event.id + " updated property '" + event.property + "' (" + event.oldValue + " --> " + event.value + ")");
    this.sendSocketNotification('XIAOMI_CHANGEDATA', event);
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
      new Player(path.normalize(soundfile)).play();
    }, delay);

    },
});
