
# IoT - Internet of Things examples
#### Truck

This is an example of creating a device for input using the Cxense APIs.
The program reads the truck state and sends events about changes in state to Cxense Insight



##### The main program 

The main code is written in JavaScript and run in the nodejs environment.

To get Node.js (the runtime for JavaScript programs) onto the Raspberry, just run these two commands:
~~~~
wget http://node-arm.herokuapp.com/node_latest_armhf.deb
sudo dpkg -i node_latest_armhf.deb
~~~~

These are the dependencies. They can be installed with these commands:
~~~~
npm install wav
npm install request
npm install speaker
npm install joystick
npm install serialport
~~~~

You can then run the program like this
~~~~
node truck.js
~~~~


#### Running at startup

To run the pigpiod and your program when the Raspberry Pi starts, add the following lines to /etc/rc.local just before the "exit 0" line:

~~~~
cd /home/pi/ && sudo /usr/local/bin/node truck.js &
~~~~
