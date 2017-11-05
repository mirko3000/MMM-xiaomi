"use strict";

/* Magic Mirror
 * Module: MMM-max
 *
 * By mirko30000
 * MIT Licensed.
 */

const NodeHelper = require('node_helper');

const miio = require('miio');


module.exports = NodeHelper.create({

  start: function () {
    console.log("Starting xiaomi helper");
  },

  //Subclass socketNotificationReceived received.
  socketNotificationReceived: function(notification, payload) {
    if (notification === 'XIAOMI_UPDATE') {
      console.log("Triggering Xiaomi Gateway upate");
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
  },
  getDevices: function(gateway) {

    var sensors = [];

    for (var i = 0; i < gateway.devices.length; i++) { 
      var currentDevice = gateway.devices[i]
      console.log("Found device with ID " + currentDevice.id  + " of type " + currentDevice.type);

      // Only handle sensors
      if (gateway.devices[i].type === 'sensor') {
        var newDev = {};
        newDev.temperature = currentDevice.temperature;
        newDev.humidity = currentDevice.humidity;
        newDev.id = currentDevice.id;
        sensors[i] = newDev;
      }
    }

    this.sendSocketNotification('XIAOMI_DATA', sensors);
  }
});
