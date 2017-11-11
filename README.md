# MMM-xiamo
Additional Module for MagicMirror²  https://github.com/MichMich/MagicMirror/

# Module: MMM-xiaomi
This module displays data from your Xiaomi smart home sensors (temperature, humidity, window state, light state). It also calculates recommended ventilation for your indoor rooms in case the humidity exceed 60%. This requires an outside sensor to take into account the outside humidity and temperature.

<blockquote class="imgur-embed-pub" lang="en" data-id="SMeQHuQ"><a href="//imgur.com/SMeQHuQ">View post on imgur.com</a></blockquote><script async src="//s.imgur.com/min/embed.js" charset="utf-8"></script>

## Installation

1. Navigate into your MagicMirror's modules folder and execute <code>git clone https://github.com/mirko3000/MMM-xiaomi</code>.git. A new folder will appear, navigate into it.
2. Execute <code>npm install</code>

## Using the module

To use this module, add it to the modules array in the `config/config.js` file:
````javascript
modules: [
    {
		module: 'MMM-xiaomi',
		position: 'bottom_left',
		header: 'Temperature / Humidity',  // This is optional
		config: {
			// See 'Configuration options' for more information.
		}
	},

]
````

## Configuration options

The following properties can be configured:


<table width="100%">
	<!-- why, markdown... -->
	<thead>
		<tr>
			<th>Option</th>
			<th width="100%">Description</th>
		</tr>
	<thead>
	<tbody>
		<tr>
			<td><code>gatewayIP</code></td>
			<td>The IP address of your Xiaomi smarthome gateway.<br>
				<br><b>Possible values:</b> <code>192.168.1.100</code>
				<br><b>Default value:</b> <code>192.168.0.1</code>
			</td>
		</tr>
		<tr>
			<td><code>gatewayToken</code></td>
			<td>The optional authentification token for your gateway in case your device does not allow direct access.<br>
				<br><b>Possible values:</b> <code>cfbdb215c0824fcc971917e36822fcbe</code>
				<br><b>Default value:</b> <code>none</code>
			</td>
		</tr>
		<tr>
			<td><code>animationSpeed</code></td>
			<td>The animation speed on refreshing data.<br>
				<br><b>Possible values:</b> <code>500</code>
				<br><b>Default value:</b> <code>1000</code>
			</td>
		</tr>
		<tr>
			<td><code>outsideSensorId</code></td>
			<td>In case you have an sensor outside you can provide the ID here. This is used to calculate ventilation effects.<br>
				<br><b>Possible values:</b> <code>158d020172841d</code>
				<br><b>Default value:</b> <code>none</code>
			</td>
		</tr>
		<tr>
			<td><code>rooms</code></td>
			<td>List of configured rooms.<br>Configure your rooms with all device IDs and a localized name and sorting order. In case you do not know your device IDs check the console logs.<br>
				<br><b>Possible values:</b> <code>[{
		            	name: 'Living room',
		            	sortOrder: 30,
		            	devices : ['158d000171240d', '158d00026cddae']
	            	}]</code>
				<br><b>Default value:</b> <code>none</code>
			</td>
		</tr>
	</tbody>
</table>

## Authentification

In case you need a security token to access your gateway you can provide this token via the configuration parameters. To find out the correct token do the following:
1. Install miio command line tools via 'npm install -g miio'
2. Discover your devices via 'miio --discover'
3. In your gateway device you can now see the security token required, use this in the configuration


## Base API

This Modul is using the MIIO library (https://github.com/aholstenson/miio).
