## Author Victor GUIGABE  aka Ayab Ben

#### Install dependencies, build code and run server
```
$ clone this project 
$ npm install

## run node server 
$ node app
```

### Build your native exec
```
# for all OS just enter "pkg ."
#Specific OS & platform, see examples below
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
