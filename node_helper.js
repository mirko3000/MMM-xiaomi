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

      var sensors = [];

      var device = miio.device({ address: payload })
      .then(    
        function(gateway) {
          
          for (var i = 0; i < gateway.devices.length; i++) { 
            //console.log(gateway.devices[i]);

            // Only handle sensors
            if (gateway.devices[i].type === 'sensor') {
              var newDev = {};
              newDev.temperature = gateway.devices[i].temperature
              newDev.humidity = gateway.devices[i].humidity
              newDev.id = gateway.devices[i].id
              sensors[i] = newDev;
            }
          }

          self.sendSocketNotification('XIAOMI_DATA', sensors);
        })
      .catch(console.error);
    }
  }
});
