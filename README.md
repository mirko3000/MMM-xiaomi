# MMM-max
Additional Module for MagicMirror²  https://github.com/MichMich/MagicMirror/

# Module: MMM max
This module displays temperatur and humidity readings from your Xiaomi smart home sensors.

## Installation

1. Navigate into your MagicMirror's modules folder and execute git clone https://github.com/mirko3000/MMM-xiaomi.git. A new folder will appear navigate into it.
2. Execute npm install

## Using the module

To use this module, add it to the modules array in the `config/config.js` file:
````javascript
modules: [
    {
		module: 'MMM-xiaomi',
		position: 'bottom_left',
		header: 'Temperatur / Feuchtigkeit',  // This is optional
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
			<td><code>interval</code></td>
			<td>The IP address of your local MAX! cube.<br>
				<br><b>Possible values:</b> <code>192.168.1.100</code>
				<br><b>Default value:</b> <code>none</code>
			</td>
		</tr>
		<tr>
			<td><code>gatewayIP</code></td>
			<td>The update interval in minutes.<br>
				<br><b>Possible values:</b> <code>5</code>
				<br><b>Default value:</b> <code>5</code>
			</td>
		</tr>
		<tr>
			<td><code>devices</code></td>
			<td>Defines the layout either in a single or 2-column layout. In false the single column layout is used.<br>
				<br><b>Possible values:</b> <code>true</code>
				<br><b>Default value:</b> <code>false</code>
			</td>
		</tr>
	</tbody>
</table>


## Base API

This Modul is using the MIIO library (https://github.com/aholstenson/miio).
