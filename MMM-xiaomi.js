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
    updateInterval: 30,
    showHeating: false,
    showWindow: false,
    showVentilation: true,
    showLights: false,
    showTrend: true,
    showNotifications: true,
    audioNotifications: false,
    minTemperature: 17,
    maxTemperature: 23,
    maxHumidity: 68,
    celcius: true
  },

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

    // Override socket notification handler.
  notificationReceived: function (notification, payload) {
      if (notification === 'MAX_HEATING_CHANGE') {
        Log.info('recieved MAX_HEATING_CHANGE');
        this.updateHeatingData(payload);
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
    return $('<div class="xm-xiaomi">'+content+'</div>')[0];
  },


  html: {
    // For text layout
    table: '<table class="xsmall">{0}</table>',
    // Row parameters: 0: room name, 1: temperature, 2: humidity
    col: '<td align="left" class="normal light small">{0}</td>',
    colTrend: '<td align="center" class="fa fa-angle-{0}"></td>',
    colTemperature: '<td align="left" class="dimmed light xsmall">{0}°{1}</td>',
    colHumidity: '<td align="left" class="dimmed light xsmall">{0}%</td>',
    colVentilationIcon: '<td align="center" class="fa fa-1 fa-refresh {0} xm-icon"></td>',
    colWindowIcon: '<td align="center" class="fa fa-1 fa-star {0} xm-icon"></td>',
    colLightIcon: '<td align="center" class="fa fa-1 fa-power-off {0} xm-icon"></td>',
    colPlugIcon: '<td align="center" class="fa fa-1 fa-plug {0} xm-icon"></td>',
    colHeatingIcon: '<td align="center" class="fa fa-fire {0}">',
    row: '<tr>{0}{1}</tr>',
    loading: '<div class="dimmed light xsmall">Connecting to Xiaomi gateway...</div>',

    // For grid layout
    // roomDiv parameter: 0: room position (left/right), 1: room name, 2: temperature, 3: humidity, 4: door state, 5: light state, 6: vent state
    roomDiv: '<div class="xm-room {0} normal light small"><div class="xm-room-header">{1}</div><div class="xm-room-temp-humid"><div class="xm-room-temp">{2}°C</div><div class="xm-room-humid">{3}%</div></div><div class="xm-room-icons"><div class="xm-door-icon">{4}</div><div class="xm-light-icon">{5}</div><div class="xm-vent-icon">{6}</div></div></div>',
    roomContainerDiv: '<div class="xm-room-container">{0}</div>'
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


  // Create an internal storage of the rooms
  createRooms: function(data) {

    // If no room data exists, create new roomData set with initial values
    if (!this.roomData) {
      this.roomData = {};

      // Sort the rooms based on the sorting order
      var rooms = [];
      for (var item in this.config.rooms) {
        rooms.push([this.config.rooms[item].sortOrder, this.config.rooms[item]]);
      }
      rooms.sort(function(a, b) {
        return a[0] - b[0];
      });


      // Now create each room object and add the list of sensors
      for (var a = 0; a < rooms.length; a++) {
        var room = rooms[a][1];
        var roomObject = {}
        roomObject.name = room.name;
        roomObject.sensors = []
        roomObject.lights = []
        roomObject.windows = []
        roomObject.plugs = []
        for (var i = 0; i < room.devices.length; i++) {
          // find device in sensor data
          var find = $.grep(data, function(e){ return e.id == room.devices[i] });

          if (find.length > 0) {

            if (find[0].type === 'sensor') {
              // Initialize trends with default
              find[0].temperatureTrend = 'right';
              find[0].humidityTrend = 'right';
              // Add sensor to room
              roomObject.sensors[roomObject.sensors.length] = find[0];

            }
            else if (find[0].type === 'light') {
              // Add light to room list
              roomObject.lights[roomObject.lights.length] = find[0];
            }
            else if (find[0].type === 'magnet') {
              // Add magnet to room list
              roomObject.windows[roomObject.windows.length] = find[0];
            }
            else if (find[0].type === 'power-plug') {
              // Add plug to room list
              roomObject.plugs[roomObject.plugs.length] = find[0];
            }
          }
        }
        // Add room to room list
        this.roomData[room.name] = roomObject
      }

    }
  },


  // Update data from the recieved event into the internal storage
  updateRoomData: function(event) {
    if (this.roomData != null) {
    // Find the sensor from which the event occured
      for (var key in this.roomData) {
        var room = this.roomData[key];

        var self = this;

        // Check temperature sensors
        room.sensors.forEach(function (sensor) {
          if (sensor.id === event.id) {
            self.addHistoryAndCalculateTrend(sensor, event.property, event.value);

            if (event.property === "temperature") {
              // Update temperature
              sensor.temperature = event.value;

              // Check for alerts - except for outside sensor
              if (sensor.id != self.config.outsideSensorId) {

                // Alert if temperature is below min temp - not enough heating or windows open
                if (sensor.temperature < self.config.minTemperature) {
                  self.showNotification("Critical temperature", "<span>Temperature in room " + room.name + " below " + self.config.minTemperature + "°C<span>", "thermometer-1", "bell.wav");
                }
                // Alert if temperature is above max temp and above outside temperature  - excessive heating
                if (sensor.temperature > self.config.maxTemperature && sensor.temperature > this.outsideTemp) {
                  self.showNotification("Critical temperature", "<span>Temperature in room " + room.name + " above " + self.config.maxTemperature + "°C<span>", "thermometer-1", "bell.wav");
                }
              }
            }
            else if (event.property === "humidity") {
              // Update humidity
              sensor.humidity = event.value;

              // Check for alerts
              if (sensor.id != self.config.outsideSensorId && sensor.humidity >= self.config.maxHumidity) {
                //Show alert on UI
                self.showNotification("Critical humidity", "<span>Humidity in room " + room.name + " above " + self.config.maxHumidity + "%<span>", "cloud-rain", "Ping-notification-sound.wav");
              }
            }
            return;
          }
        });

        // Check window sensors
        room.windows.forEach(function (window) {
          if (window.id === event.id) {
            window.open = event.value;

            // Check if window is open and heating is on
            if (window.open && room.heating) {
              self.showNotification("Window open", "<span>Window in room " + room.name + " is open and heating on<span>", "exclamation-triangle", "cuckoo-cuckoo-clock.wav");
            }

            return;
          }
        });

        // Check lights
        room.lights.forEach(function (light) {
          if (light.id === event.id) {
            light.power = event.value;
            return;
          }
        });

        // Check plugs
        room.plugs.forEach(function (plug) {
          if (plug.id === event.id) {
            plug.power = event.value;
            return;
          }
        });
      }
    }
  },


  updateHeatingData: function(payload) {
    // We have recieved data from an heating system, update the status if heating is on or off per room
    var room = payload.room;
    var valve = payload.valve;

    if (this.roomData) {
      // Find a room with the same name
      var roomObject = this.roomData[room];

      if (roomObject) {
        roomObject.heating = (valve > 0);
        // Show a notification for heavy heating (valve opened more than 50%)
        if (payload.valve > 50) {
          self.showNotification("Heavy heating", "<span>Value in room " + roomObject.name + " opened more than 50%<span>", "fire", "long-chime-sound.wav");
        }

        // Show notification if any window in the room is open
        roomObject.windows.forEach(function (window) {
          // Check if window is open and heating is on
          if (window.open && roomObject.heating) {
            self.showNotification("Window open", "<span>Window in room " + roomObject.name + " is open and heating on<span>", "exclamation-triangle", "cuckoo-cuckoo-clock.wav");
          }
        });
      }
    }
  },

  showNotification: function(title, text, image, sound) {
    if (this.config.showNotifications) {

      var self = this;

      //Show alert on UI
      this.sendNotification("SHOW_ALERT", {
        title: title,
        message: text,
        imageFA:  image
      });

      if (this.config.audioNotifications) {
        // Play sound notitfication (only between daytime hours)
        var date = new Date()
        var s = sound

        if (date.getHours() >= 8 && date.getHours() < 22) {
          this.sendSocketNotification("PLAY_SOUND", s);
        }
      }

      // Hide notification after 10 seconds
      setTimeout(function(){
        self.sendNotification("HIDE_ALERT");
      }, 10000);
    }
  },

  // Add current sensor value to history and calculate trend based on the last two values. Only
  // if all values are in the same direction a trend is identified.
  addHistoryAndCalculateTrend: function(sensor, property, newValue) {

    if (!sensor.history) {
      // Create new history
      sensor.history = {};
    }

    // Get the history of the current property, create if it does not exist
    if (!sensor.history[property]) {
      sensor.history[property] = [];
    }

    var history = sensor.history[property];

    // Calculate trend only if we have at least 1 history entries
    if (history.length >= 1) {
      // Check the last 3 entries for a consistent trend
      var history1 = history[history.length-1].value;
      //var history2= history[history.length-2].value;

      // Only consider values if they are at least 30 seconds later
      var currentDate = new Date();
      // Calculate the timespan between now and the last recorded value (in minutes)
      var timeDelta = (currentDate - history[history.length-1].date) / 1000 / 60;
      var delta = newValue - history1;
      var deltaPerMinute = delta / timeDelta;

      // console.log("Trend: " + newValue + "(" + currentDate.toLocaleTimeString() + ") - " + history1 + "(" + history[history.length-1].date.toLocaleTimeString() + ")");
      // console.log("Delta: " + delta + " - DeltaPerMinute: " + deltaPerMinute);

      // maximum deltas for temperature
      var maxDelta = 0.5
      var maxDeltaPerMinute = 0.05

      // maximum deltas for humidity
      if (property === "humidity") {
        maxDelta = 2
        maxDeltaPerMinute = 0.2
      }

      if (delta > maxDelta || deltaPerMinute > maxDeltaPerMinute) {
        // console.log("Trend up");
        sensor[property + "Trend"] = 'up';
      }
      else if (delta < (maxDelta * -1)  || deltaPerMinute < (maxDeltaPerMinute * -1)) {
        // downwards trend
        // console.log("Trend down");
        sensor[property + "Trend"] = 'down';
      }
      else {
        // equal trend
        // console.log("Trend equal");
        sensor[property + "Trend"] = 'right';
      }
    }

    // Store new value
    history[history.length] = {date: new Date(), value: newValue};

    // Cleanup history, keep oldest 2 entries
    if (history.length > 20) {
      var newHistory = [];
      newHistory[0] = history[history.length-1];
      newHistory[1] = history[history.length-2];
      history = newHistory;
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

            // Store values globally
            this.outsideTemp = outsideTemp
            this.outsideHumid = outsideHumid

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
          var temperatureTrend;
          var humidityTrend;

          // Get the temperature sensor from the device list
          if (room.sensors.length > 0) {
            // For now: just get the data from the first sensor
            temp = room.sensors[0].temperature
            humid = room.sensors[0].humidity
            temperatureTrend = room.sensors[0].temperatureTrend
            humidityTrend = room.sensors[0].humidityTrend
          }

          // Convert temperature to kelving if requried
          if (!this.config.celcius) {
            // C = (5/9) * (F - 32)
            temp = temp * 9 / 5 + 32;
          }

          // Format temperatur and humidity by rounding
          temp = Math.round(temp * 10) / 10
          humid = Math.round(humid)

          // Fist the basic column date (room name, temperature and humidity)
          var currCol = this.html.col.format(room.name, temp, humid);
          if (this.config.showTrend) {
            currCol += this.html.colTrend.format(temperatureTrend)
          }
          currCol += this.html.colTemperature.format(temp, this.config.celcius ? "C" : "F");
          if (this.config.showTrend) {
            currCol += this.html.colTrend.format(humidityTrend)
          }
          currCol += this.html.colHumidity.format(humid);


          if (this.config.showVentilation) {
            var ventIcon = room.ventilatationUseful ? "" : "xm-disabled";
            currCol += this.html.colVentilationIcon.format(ventIcon);
          }

          if (this.config.showWindow) {
            var windowOpen = $.grep(room.windows, function(window){ return window.open == true });
            var windowIcon = (windowOpen.length > 0) ? "" : "xm-disabled";

            currCol += this.html.colWindowIcon.format(windowIcon);
          }

          if (this.config.showLights) {
            var lightsOn = $.grep(room.lights, function(light){ return light.power == true });
            var lightsIcon = (lightsOn.length > 0) ? "" : "xm-disabled";

            currCol += this.html.colLightIcon.format(lightsIcon);
          }

          if (this.config.showPlugs) {
            var plugOn = $.grep(room.plugs, function(plug){ return plug.power == true });
            var plugIcon = (plugOn.length > 0) ? "" : "xm-disabled";

            currCol += this.html.colPlugIcon.format(plugIcon);
          }

          if (this.config.showHeating) {
            var heatingIcon = room.heating ? "" : "xm-disabled";
            currCol += this.html.colHeatingIcon.format(heatingIcon);
          }

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
