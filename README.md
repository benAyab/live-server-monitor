### This is a light application for monitoring server directly in your browser 
### Or Remotly via IP adress of target machine.
* An android app is also available [contact me at victorguigabe@gmail.com]



### Install dependencies, build code and run server
```
$ clone this project 
$ npm install

## run node server 
$ node app
```

### Build your native exec thanks to [https://github.com/vercel/pkg#readme]
```
# for all OS just enter "pkg ."

# Specific OS & platform, see examples below
	Examples:

  – Makes executables for Linux, macOS and Windows
    $ pkg app.js
  – Takes package.json from cwd and follows 'bin' entry
    $ pkg .
  – Makes executable for particular target machine
    $ pkg -t node6-alpine-x64 app.js
  – Makes executables for target machines of your choice
    $ pkg -t node4-linux,node6-linux,node6-win app.js
  – Bakes '--expose-gc' into executable
    $ pkg --options expose-gc app.js

```
