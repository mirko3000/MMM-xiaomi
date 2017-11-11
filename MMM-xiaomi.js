/* global Module */

/* Magic Mirror
 * Module: MMM-xiaomi
 *
 * By mirko3000
 * MIT Licensed.
 */

Module.register('MMM-xiaomi', {

  requiresVersion: "2.0.0",

  defaults: {
    gatewayIP: '192.168.0.1',
    animationSpeed: 1000,
    graphicLayout: false,
    updateInterval: 30
  },

  roomData: {},

  // Override socket notification handler.
  socketNotificationReceived: function (notification, payload) {
      if (notification === 'XIAOMI_INITDATA') {
          Log.info('received XIAOMI_INITDATA');

          this.createRooms(payload);
          this.render();
          this.updateDom(this.config.animationSpeed);
      }
      if (notification === 'XIAOMI_CHANGEDATA') {
        Log.info('recieved XIAOMI_CHANGEDATA');
        this.updateRoomData(payload);
        this.render();
        this.updateDom(this.config.animationSpeed);
      }
  },

  start: function () {
    Log.info("Starting module: " + this.name);
    this.update();
    // refresh every 30 minutes
    setInterval(
      this.update.bind(this),
      this.config.updateInterval * 60 * 1000);
  },

  update: function(){
    this.sendSocketNotification(
      'XIAOMI_CONNECT', {
          ip : this.config.gatewayIP, 
          token: this.config.gatewayToken
      });

  },

  getScripts: function() {
    return [
      'String.format.js',
      'https://code.jquery.com/jquery-2.2.3.min.js',  // this file will be loaded from the jquery servers.
    ]
  },

  getStyles: function() {
    return ['MMM-xiaomi.css'];
  },

  getDom: function() {
    var content = '';
    if (!this.loaded) {
      content = this.html.loading;
    }else { 
      content = this.dom;
    }
    return $('<div class="xiaomi">'+content+'</div>')[0];
  },


  html: {
    table: '<table class="xsmall">{0}</table>',
    // table: '<div style="border:1px solid white; width:1px; height:100%; position:absolute"/><table class="xsmall">{0}</table>',
    col: '<td align="left" class="normal light small">{0}</td><td align="left" class="fa fa-angle-{6}"></td><td align="left" class="dimmed light xsmall">{1}°C</td><td align="left" class="fa fa-angle-{7}"></td><td align="left" class="dimmed light xsmall">{2}%</td><td align="center" class="fa fa-1 fa-refresh {3} xiaomi-icon"></td><td align="center" class="fa fa-1 fa-star {4} xiaomi-icon"></td><td align="center" class="fa fa-1 fa-power-off {5} xiaomi-icon"></td>',
    row: '<tr>{0}{1}</tr>',
    room: '<li><div class="room-item xsmall">{0} : {1}°C - {2}%</div></li>',
    loading: '<div class="dimmed light xsmall">Connecting to Xiaomi gateway...</div>',
    gaugeCol: '<tr><td>{0}</td><td>{1}</td><td style="font-size:14px">{2}°C</td><td style="font-size:14px">{3}%</td></tr>',
    progressBar: '<progress value="{0}" max="30"></progress> {0}°C',
    newBar: '<div style="width:100px; height:10px;"><div style="width:{0}px; height:4px; background-color:white"></div><div style="width:{1}px; height:4px; margin-top:3px; background-color:white"></div></div>',
    legendDiv: '<div class="legend-temp"/><div class="legend-humid"/>',
    roomDiv: '<div class="room-item">{1}<div class="room-title">{0}</div></div>',
    barDiv: '<div class="room-bars"><div style="width:{0}%; height:10px; background-color:white"></div><div style="width:{1}%; height:10px; margin-top:3px; background-color:grey"></div></div>',
    
    // roomDiv parameter: 0: room position (left/right), 1: room name, 2: temperature, 3: humidity, 4: door state, 5: light state, 6: vent state
    roomDiv: '<div class="room {0} normal light small"><div class="room-header">{1}</div><div class="room-temp-humid"><div class="room-temp">{2}°C</div><div class="room-humid">{3}%</div></div><div class="room-icons"><div class="door-icon">{4}</div><div class="light-icon">{5}</div><div class="vent-icon">{6}</div></div></div>',
    roomContainerDiv: '<div class="room-container">{0}</div>'
  },


  render: function() {
    this.calculateVentilation();

    if (this.config.graphicLayout) {
      this.renderGrid(this.roomData);
    }
    else {
      this.renderText(this.roomData);
    }
  },

  createRooms: function(data) {

    // Sort the rooms based on the sorting order
    var rooms = [];
    for (var item in this.config.rooms) {
      rooms.push([this.config.rooms[item].sortOrder, this.config.rooms[item]]);
    }
    rooms.sort(function(a, b) {
      return a[0] - b[0];
    });


    for (var a = 0; a < rooms.length; a++) {
      var room = rooms[a][1];
      var roomObject = {}
      roomObject.name = room.name;
      roomObject.sensors = []
      roomObject.lights = []
      roomObject.windows = []
      for (var i = 0; i < room.devices.length; i++) {
        // find device in sensor data
        var find = $.grep(data, function(e){ return e.id == room.devices[i] });

        if (find[0].type === 'sensor') {
          find[0].tempTrend = 'right';
          find[0].humidTrend = 'right';
          roomObject.sensors[roomObject.sensors.length] = find[0];
          
        }
        else if (find[0].type === 'light') {
          roomObject.lights[roomObject.lights.length] = find[0];
        }
        else if (find[0].type === 'magnet') {
          // For the window sensore: on every reconnect the last status is lost. So restore the existing value here
          if (this.roomData[room.name]) {
            var oldSensor = $.grep(this.roomData[room.name].windows, function(e){ return e.id == find[0].id });
            var oldOpenValue = oldSensor[0].open;
            find[0].open = oldOpenValue;
          }
          
          roomObject.windows[roomObject.windows.length] = find[0];
        }

      }
      this.roomData[room.name] = roomObject
    }
  },

  updateRoomData: function(event) {
    if (this.roomData != null) {
    // Find the sensor from which the event occured
      for (var key in this.roomData) {
        var room = this.roomData[key];
        
        room.sensors.forEach(function (sensor) {
          if (sensor.id === event.id) {
            if (event.property === "temperature") {
              // Calculate trend
              if (sensor.temperature > event.value) {
                sensor.tempTrend = 'down';
              }
              else if (sensor.temperature < event.value) {
                sensor.tempTrend = 'up';
              }
              else {
                sensor.tempTrend = 'right';
              }

              // Update temperature
              sensor.temperature = event.value;
            }
            else if (event.property === "humidity") {
              // Calculate trend
              if (sensor.humidity > event.value) {
                sensor.humidTrend = 'down';
              }
              else if (sensor.humidity < event.value) {
                sensor.humidTrend = 'up';
              }
              else {
                sensor.humidTrend = 'right';
              }

              sensor.humidity = event.value;
            }   
          }
        });

        room.windows.forEach(function (window) {
          if (window.id === event.id) {
            window.open = event.value;
          }
        });

        room.lights.forEach(function (light) {
          if (light.id === event.id) {
            light.power = event.value;
          }
        });
      } 
    }
  },

  calculateVentilation: function() {

    // Calculate some utility info first
    var outsideTemp;
    var outsideHumid;
    var outsideAbsoluteHumid
    var self = this

    // If we have an outside sensor we can calculate ventilation effects
    if (this.config.outsideSensorId != null) {
      // Find the outside sensor
      for (var key in this.roomData) {
        var room = this.roomData[key];
        room.sensors.forEach(function (sensor) {
          if (sensor.id === self.config.outsideSensorId) {
            outsideTemp = sensor.temperature
            outsideHumid = sensor.humidity
            
            outsideAbsoluteHumid = self.calculateAbsoluteHumidity(sensor.temperature, sensor.humidity)
          }          
        });
      }    
    }

    // Now calculate the ventialtion effect for each indoor room
    for (var key in this.roomData) {
      var room = this.roomData[key];
      room.ventilatationUseful = false

      room.sensors.forEach(function (sensor) {
        if (outsideAbsoluteHumid != null) {
          sensor.absoluteHumidity = self.calculateAbsoluteHumidity(sensor.temperature, sensor.humidity)
          if (sensor.absoluteHumidity > outsideAbsoluteHumid && sensor.humidity > 60) {
            room.ventilatationUseful = true
          }
        }
        else {
          // In case we don't have an outside sensor simply ventilate if we have over 60 % humidity
          if (sensor.humidity > 60) {
            room.ventilatationUseful = true
          }          
        }
      });
    }
    
  },


  calculateAbsoluteHumidity: function(temp, humidity) {
    // T = temperature
    // r = relative humidity
    // a = 7.5, b = 237.3 (for positive temperature)
    // a = 7.6, b = 240.7 (for negative temperature)
    var T = temp
    var r = humidity
    var a = 7.5
    var b = 237.3

    // R = 8314.3 J/(kmol*K) (universelle Gaskonstante)
    // mw = 18.016 kg/kmol (Molekulargewicht des Wasserdampfes)
    var R = 8314.3
    var mw = 18.016

    // DD = Steam pressure
    // TK = temperature in kelvin
    // SDD = Saturation steam pressure

    // TK = T + 273.15
    var TK = T + 273.15

    // SDD(T) = 6.1078 * 10^((a*T)/(b+T))
    var SDD = 6.1078 * Math.pow(10,(a*T)/(b+T))

    // DD(r,T) = r/100 * SDD(T)
    var DD = r/100 * SDD

    // absoluteHumidty = 10^5 * mw/R* * DD(r,T)/TK
    var absoluteHumidity = Math.pow(10,5) * (mw/R) * (DD/TK)
    return absoluteHumidity

  },


  renderGrid: function(data) {
    var roomDivString = ""
    $.each(data, function (i, room) {

      var colType = ((i+1) % 3 == 0) ? "right" : "left";

      roomDivString += this.html.roomDiv.format(colType, room.name, room.devices[0].temperature, room.devices[0].humidity, room.doorStatus, room.lightStatus, room.ventStatus);

      //text += this.renderRoom(room, mode, temp, valve, time_until, locked);
    }.bind(this));

    var roomGridString = this.html.roomContainerDiv.format(roomDivString);

    this.loaded = true;

    // only update dom if content changed
    if(this.dom !== roomGridString){
      this.dom = roomGridString;
      this.updateDom(this.config.animationSpeed);
    }

  },

  renderText: function(data){
      var previousCol =''
      var rowCount = 0;
      var tableText = ''

      $.each(data, function (i, room) {
        if (room != null) {

          var temp;
          var humid;
          var tempTrend;
          var humidTrend;

          // Get the temperature sensor from the device list
          if (room.sensors.length > 0) {
            // For now: just get the data from the first sensor
            temp = room.sensors[0].temperature
            humid = room.sensors[0].humidity
            tempTrend = room.sensors[0].tempTrend
            humidTrend = room.sensors[0].humidTrend
          }

          // Format temperatur and humidity by rounding
          temp = Math.round(temp * 10) / 10
          humid = Math.round(humid)

          var ventIcon = room.ventilatationUseful ? "" : "disabled";

          var windowOpen = $.grep(room.windows, function(window){ return window.open == true });
          var windowIcon = (windowOpen.length > 0) ? "" : "disabled";

          var lightsOn = $.grep(room.lights, function(light){ return light.power == true });
          var lightsIcon = (lightsOn.length > 0) ? "" : "disabled";


          var currCol = this.html.col.format(room.name, temp, humid, ventIcon, windowIcon, lightsIcon, tempTrend, humidTrend);

          if (i%2!=0 || !this.config.twoColLayout) {
            // start new row
            tableText += this.html.row.format(previousCol, currCol);
            previousCol = '';
            rowCount++;
          }
          else {
            previousCol = currCol;
          }
        }

        //text += this.renderRoom(room, mode, temp, valve, time_until, locked);
      }.bind(this));

      // Print last row if uneven
      if (previousCol != '') {
        tableText += this.html.row.format(previousCol, '');
        previousCol = '';
        rowCount++;
      }

      text = this.html.table.format(tableText);

      this.loaded = true;

      // only update dom if content changed
      if(this.dom !== text){
        this.dom = text;
        this.updateDom(this.config.animationSpeed);
      }
  },

});
