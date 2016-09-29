
# IoT - Internet of Things examples
#### RGB Lamp

This is an example of creating a device for output using the Cxense APIs.
The program reads the Cxense APIs and shows a green light if the traffic is increasing and a red light if the traffic is decreasing.

##### The electronics

The device is an RGB lamp consisting of four LED lamps: white, red, green and blue.
The lamp can glow in all combinations of these colours and can also blink.

Each led is powered by a MosFET and the Gate input on the MosFET is connected directly to a GPIO pin on the Raspberry Pi.
Any of the GPIO pins can be used.

The LED intensity is controlled using software PWM (pulse width modulation). This software PWM is provided with the pigpio library:
 - http://abyz.co.uk/rpi/pigpio/
 


##### The main program 

The main code is written in JavaScript and run in the nodejs environment.

To get Node.js (the runtime for JavaScript programs) onto the Raspberry, just run these two commands:
~~~~
wget http://node-arm.herokuapp.com/node_latest_armhf.deb
sudo dpkg -i node_latest_armhf.deb
~~~~

There is one dependency, and that is for the "request" module. That can be installed with this command:
~~~~
npm install request
~~~~

You can then run the program like this
~~~~
node rgbcube.js
~~~~


#### Running at startup

To run the pigpiod and your program when the Raspberry Pi starts, add the following lines to /etc/rc.local just before the "exit 0" line:

~~~~
sudo /usr/local/bin/pigpiod
cd /home/pi/ && sudo /usr/local/bin/node rgbcube.js &
~~~~
