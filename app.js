const osutils = require("os-utils");
const os = require('os');
const express = require("express");
const open = require('open');
const getPort = require('get-port');
const app = express();
const server = require('http').Server(app);
const io = require("socket.io")(server);
const path = require("path");
const fs = require('fs');
const fileprocess = require('./assets/js/script');
const parseWithZero = require("./assets/js/utils");

(async function(){
    const PORT = await getPort({port: 3000});
    const host = `http://127.0.0.1:${3000}`;
   let filepath =  fileprocess();
    let initialvalues = {
        cpumodel: os.cpus()[0].model,
        cpucore: osutils.cpuCount(),
        cpulog: osutils.cpuCount(),
        cpuarch: os.arch(),
        cpusage: 0,
        cpuspeed: ((os.cpus()[0].speed)/1000).toFixed(2)+' GHz',
        totalmem: (osutils.totalmem()/1024.).toFixed(2) +" Go",
        usedmem: (osutils.totalmem()/1024 - osutils.freemem()/1024).toFixed(2)+" Go",
        freemem: (osutils.freemem()/1024).toFixed(2)+" Go",
        freePercentagemem: (osutils.freememPercentage()*100).toFixed(2)+'%',
        osplatform: osutils.platform(),
        osptype: os.type(),
        osuptime: parseUptime(osutils.sysUptime()),
        hostname: os.hostname(),
        username: os.userInfo().username
    }
    let updatevalues = {
        cpusage: 0.0,
        usedmem: 0.0,
        freemem: 0.0,
        freePercentagemem: 0.0,
        osuptime: 0
    };
    //Express Section
    /*
    * We serve HTML file here, like static
    */
    app.use(express.static(path.join(__dirname, '/assets')));
    //Sending HTML file on request from  "/" route
    app.get("/", (req, res, next) =>{
        res.status(200) 
        .sendFile(path.join(__dirname, 'public/index.html'));
        osutils.cpuUsage((usage) => {initialvalues.cpusage = (usage*100).toFixed(2) + '%'});
        console.log("Response sended");
    })
    
    //Socketio Section 
    io.on('connection', (socket) =>{
        let setIntervalID = 0;
        console.log(" User connected !");
        setIntervalID = setInterval(() => {
            osutils.cpuUsage((usage) => {updatevalues.cpusage  = (usage*100).toFixed(2) + '%'});
            updatevalues.freePercentagemem =  (osutils.freememPercentage()*100).toFixed(2)+'%';
            updatevalues.freemem = (osutils.freemem()/1024).toFixed(2)+' Go';
            updatevalues.usedmem = (osutils.totalmem()/1024 - osutils.freemem()/1024).toFixed(2) +" Go";
            updatevalues.osuptime = parseUptime(osutils.sysUptime());
            io.emit('update', JSON.stringify(updatevalues)) 
        }, 1000);

        socket.on('disconnect', () => {
            console.log(" User disconnected !");
            clearInterval(setIntervalID);
        });
        socket.on('getfirstvalues', () =>{
            io.emit('firstval', JSON.stringify(initialvalues));
        });
    });

    function parseUptime(val){
        let n = parseInt(val);
        let h = Math.floor(n/3600);
        let m = (n/3600 - h)*60
        let ss = Math.ceil((m-Math.floor(m))*60);
        m = Math.floor(m);
        if(h <= 0){
            if(m <= 0){
                return parseWithZero(ss) +"s";
            }
            return parseWithZero(m) + ":"+parseWithZero(ss)+"s";
        }
        return parseWithZero(h)+":"+ parseWithZero(m) + ":"+ parseWithZero(ss)+"s";
    }
    
    setInterval(() => {
        let ws = fs.createWriteStream(filepath, {flags: 'a'});
        ws.write(statToLog());
    },1000);

    function statToLog(){
        let d = new Date();
        let h = parseWithZero(d.getHours());
        let m = parseWithZero(d.getMinutes());
        let ss = parseWithZero(d.getSeconds());
        
        let t = h+':'+m+':'+ss;
        let cpumaxspeed =  ((os.cpus()[0].speed)/1000).toFixed(2);
        let totalmem = (osutils.totalmem()/1024.).toFixed(2);
        let usedmem =  (osutils.totalmem()/1024 - osutils.freemem()/1024).toFixed(2);
        let freemem = (osutils.freemem()/1024).toFixed(2);
        let freePercentagemem = (osutils.freememPercentage()*100).toFixed(2)+'%';;
        return t +'\t'+ cpumaxspeed +'\t\t'+ updatevalues.cpusage +'\t\t'+ totalmem +'\t\t'+ freemem +'\t\t'+ freePercentagemem +'\t\t'+ usedmem +'\r\n';
    }

    server.listen(PORT, async() => {
        console.log(`Application runing on port ${PORT}`);
        await open(`${host}/`);
    });
})();