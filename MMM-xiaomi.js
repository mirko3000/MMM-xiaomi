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
    updateInterval: 5,
    animationSpeed: 3000,
    graphicLayout: false
  },


  // Override socket notification handler.
  socketNotificationReceived: function (notification, payload) {
      if (notification === 'XIAOMI_DATA') {
          Log.info('received XIAOMI_DATA');
          this.render(payload);
          this.updateDom(this.config.animationSpeed);
      }
  },

  start: function () {
    Log.info("Starting module: " + this.name);
    this.update();
    // refresh every x minutes
    setInterval(
      this.update.bind(this),
      this.config.updateInterval * 60 * 1000);
  },

  update: function(){
    this.sendSocketNotification(
      'XIAOMI_UPDATE', {
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
    col: '<td align="left" class="normal light small">{0}</td><td align="left" class="dimmed light xsmall">{1}°C</td><td align="left" class="dimmed light xsmall">{2}%</td><td align="left" class="fa fa-1 {3}"></td>',
    row: '<tr>{0}{1}</tr>',
    room: '<li><div class="room xsmall">{0} : {1}°C - {2}%</div></li>',
    loading: '<div class="dimmed light xsmall">Connecting to Xiaomi gateway...</div>',
    gaugeCol: '<tr><td>{0}</td><td>{1}</td><td style="font-size:14px">{2}°C</td><td style="font-size:14px">{3}%</td></tr>',
    progressBar: '<progress value="{0}" max="30"></progress> {0}°C',
    newBar: '<div style="width:100px; height:10px;"><div style="width:{0}px; height:4px; background-color:white"></div><div style="width:{1}px; height:4px; margin-top:3px; background-color:white"></div></div>',
    legendDiv: '<div class="legend-temp"/><div class="legend-humid"/>',
    roomDiv: '<div class="room">{1}<div class="room-title">{0}</div></div>',
    barDiv: '<div class="room-bars"><div style="width:{0}%; height:10px; background-color:white"></div><div style="width:{1}%; height:10px; margin-top:3px; background-color:grey"></div></div>'
  },


  setGaugeData: function(data) {

  },

  render: function(data) {

    // Calculate some utility info first
    var outsideTemp;
    var outsideHumid;
    var outsideAbsoluteHumid
    var self = this

    // If we have an outside sensor we can calculate ventilation effects
    if (this.config.outsideSensorId != null) {
      // Find the outside sensor
      data.forEach(function(sensor) {
        if (sensor.id === self.config.outsideSensorId) {
          outsideTemp = sensor.temperature
          outsideHumid = sensor.humidity
          
          outsideAbsoluteHumid = self.calculateAbsoluteHumidity(sensor.temperature, sensor.humidity)
        }
      });


      // Now calculate the ventialtion effect for each indoor room
      data.forEach(function(sensor) {
        if (outsideAbsoluteHumid != null) {
          sensor.absoluteHumidity = self.calculateAbsoluteHumidity(sensor.temperature, sensor.humidity)
          if (sensor.absoluteHumidity > outsideAbsoluteHumid) {
            sensor.ventilatationUseful = true
          }
        }
        else {
          sensor.ventilatationUseful = true
        }
      });
    }

    if (this.config.graphicLayout) {
      this.renderProgress(data);
    }
    else {
      this.renderText(data);
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

  renderProgress: function(data) {

    var text = ''
    var textRow = ''
    var maxTemp;
    var minTemp;

    // First calculate the min/max values to define the scale for temperatur
    $.each(data, function (i, item) {
        if (item.temperature > maxTemp) {
          maxTemp = item.temperature
        }
        if (item.temperature < minTemp) {
          minTemp = item.temperature
        }
    }.bind(this));

    // Lets define the min-temp at -15°C and the max-temp at 40°C, so we have a span of 55° which
    // is mapped to 100%. This means we need to add 15° to each temp and multiply with 100/55

    text += this.html.legendDiv.format();

    $.each(data, function (i, item) {
        var room = {
          id: item.id,
          name: item.id,
          temp: item.temperature,
          humid: item.humidity
        };

        // Try to resolve ID from config
        if (this.config.devices.find(x => x.id === room.id)) {
          room.name = this.config.devices.find(x => x.id === room.id).name
        }   

        // Format temperatur and humidity by rounding
        room.temp = Math.round(room.temp * 10) / 10
        room.humid = Math.round(room.humid)

        var tempValue = room.temp + 15 * (110/55);

        //var textCol = this.html.newBar.format(tempValue, room.humid);
        //textRow += this.html.gaugeCol.format(room.name, textCol, room.temp, room.humid);
        var barDiv = this.html.barDiv.format(tempValue, room.humid);
        text += this.html.roomDiv.format(room.name, barDiv);

      //text += this.renderRoom(room, mode, temp, valve, time_until, locked);
    }.bind(this));

    //text = this.html.table.format(textRow);

    this.loaded = true;


    // only update dom if content changed
    if(this.dom !== text){
      this.dom = text;
      this.updateDom(this.config.animationSpeed);
    }

  },

  renderGauge: function(data) {
      var previousCol =''
      var rowCount = 0;
      var tableText = ''
      $.each(data, function (i, item) {

        var currCol = this.html.gaugeCol.format(item.id);

        if (i%2!=0 || !this.config.twoColLayout) {
          // start new row
          tableText += this.html.row.format(previousCol, currCol);
          previousCol = '';
          rowCount++;
        }
        else {
          previousCol = currCol;
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

  renderText: function(data){
      var previousCol =''
      var rowCount = 0;
      var tableText = ''
      $.each(data, function (i, item) {
        if (item != null) {
          
          var ventilate = false
          if (item.humidity > 60 && item.ventilatationUseful) {
            ventilate = true
          }

          var room = {
            id: item.id,
            name: item.id,
            temp: item.temperature,
            humid: item.humidity,
            vent : ventilate
          };

          // Try to resolve ID from config
          if (this.config.devices.find(x => x.id === room.id)) {
            room.name = this.config.devices.find(x => x.id === room.id).name
          }   

          // Format temperatur and humidity by rounding
          room.temp = Math.round(room.temp * 10) / 10
          room.humid = Math.round(room.humid)

          var icon = room.vent ? "fa-refresh " : ""

          var currCol = this.html.col.format(room.name, room.temp, room.humid, icon);

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
