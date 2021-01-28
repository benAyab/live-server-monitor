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
const nodemailer = require("nodemailer");
const fileprocess = require('./assets/js/script');
const parseWithZero = require("./assets/js/utils");
const user = require('./assets/js/helper');
const { F_OK } = require("constants");

(async function(){

    //Variables and constants
    const PORT = await getPort({port: 3000});
    const host = `http://127.0.0.1:${PORT}`;
    const defaultEmail = 'example@domain.com';

   let filepath =  fileprocess();
   let configpath = path.join(__dirname, 'config/config.txt');
   let lastTencpu = [];
   let lastTenMem = [];
   let counter = 60000;
   let arrayIsFull = false;
   let emailflag = false;

   let initialvalues = {
        cpumodel: os.cpus()[0].model,
        cpulog: osutils.cpuCount(),
        cpuarch: os.arch(),
        cpusage: 0,
        cpuspeed: ((os.cpus()[0].speed)/1000).toFixed(2),
        totalmem: (osutils.totalmem()/1024.).toFixed(2),
        usedmem: (osutils.totalmem()/1024 - osutils.freemem()/1024).toFixed(2),
        freemem: (osutils.freemem()/1024).toFixed(2),
        freePercentagemem: (osutils.freememPercentage()*100).toFixed(2),
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

    let value = {
        email: "",
        cpuLimit: "",
        memLimit: ""
    };

    let transporter = nodemailer.createTransport({
        service: 'gmail',
        host: 'smtp.gmail.com',
        auth: {
            user: user.email,
            pass: user.pwd
        }
    });

    let mailOptions = {
        from: user.email,
        to: "",
        subject: 'Alerte surchage',
        text: ""
      };

    //Express Section
    /*
    * We serve HTML file here, like static
    */
    app.use("/assets",express.static(path.join(__dirname, 'assets')));
    //Sending HTML file on request from  "/" route
    app.get("/", (req, res, next) =>{
        res.status(200) 
        .sendFile(path.join(__dirname, 'public/index.html'));
        osutils.cpuUsage((usage) => {initialvalues.cpusage = (usage*100).toFixed(2)});
        //console.log("Response sended");
    })
    app.get("/config", (req, res) =>{
        res.status(200)
        .sendFile(path.join(__dirname, 'public/config.html'));
    })
    
    //Load or init config file
    getThresholdValues();

    //Socketio Section 
    io.on('connection', (socket) =>{
        let setIntervalID = 0;

        setIntervalID = setInterval(() => {
            io.emit('update', JSON.stringify(updatevalues));
        }, 1000);

        
        socket.on('getfirstvalues', () =>{
            io.emit('firstval', JSON.stringify(initialvalues));
        });

        socket.on('getSavedValues', () =>{
            socket.emit('savedValues', JSON.stringify(value));
        });

        socket.on("saveNewValue", (val) =>{
            let v = JSON.parse(val);
            value.email = v.email;
            value.cpuLimit = v.cpuLimit;
            value.memLimit = v.memLimit;
            socket.emit("onsaved", '0');
            //console.log(value);
            try{
                fs.writeFileSync(configpath, v.email+","+v.cpuLimit+","+v.memLimit);
            }catch(err){ 
                socket.emit("onsaved", '1');
                console.log("Erreur d'enregistrement des paramètres ", err.stack);
            }
        });

        socket.on('disconnect', () => {
            //console.log(" User disconnected !");
            clearInterval(setIntervalID);
        });
    });

    setInterval(() => {
        updateProcess();
        if(parseInt(updatevalues.cpusage) !== 0){
            let ws = fs.createWriteStream(filepath, {flags: 'a'});
            ws.write(statToLog());
        }
        if(!arrayIsFull){
            lastTencpu.push(parseFloat(updatevalues.cpusage));
            lastTenMem.push(100.0 - parseFloat(updatevalues.freePercentagemem));
            if(lastTenMem.length >= 10 || lastTencpu.length >= 10){
                arrayIsFull = true;
            }
        }else{
            for(i=0;i<9;i++){
                lastTencpu[i] = lastTencpu[i+1];
                lastTenMem[i] = lastTenMem[i+1];
            }
            lastTenMem[9] = 100.0 - parseFloat(updatevalues.freePercentagemem);
            lastTencpu[9] = parseFloat(updatevalues.cpusage);

            let lastTenSumCPU = lastTencpu.reduce((total, val) => {
                return total + val;
            },0.0);

            let lastTenSumMem = lastTenMem.reduce((total, val) => {
                return total + val;
            }, 0.0);

            if(((lastTenSumCPU/10) >= parseFloat(value.cpuLimit)) || ((lastTenSumMem/10) >= parseFloat(value.memLimit))){
                if(emailflag === false || counter >= 60000){
                    mailOptions.to = value.email;
                    mailOptions.text = "Charge CPU: "+ (lastTenSumCPU/10).toFixed(2)+"%, Mémoire: "+(lastTenSumMem/10).toFixed(2)+"%";
                    transporter.sendMail(mailOptions, (err, data) =>{
                        if(err){
                            emailflag = false;
                            //console.log("Email error: ", err);
                        }else{
                            emailflag = true;
                            counter = 0;
                            //console.log("Email sent", data);
                        }
                    })
                }else{
                    if(counter >= 30000){
                        emailflag = true;
                        counter = 0;
                    }else{ counter++;}
                }
            }
        }
    },1000);

    function getThresholdValues(){
        fs.access(configpath, F_OK, (error) =>{
            if(error){
                try{
                    let content = defaultEmail +',50,50';
                    fs.appendFileSync(configpath, content);
                    value.email = defaultEmail;
                    value.cpuLimit = '50';
                    value.memLimit = '50';
                }catch(err){ console.log(err); }
            }else{
                try{
                    let content = fs.readFileSync(configpath, 'utf-8');
                    let array = content.split(",");
                    value.email = array[0];
                    value.cpuLimit = array[1]; 
                    value.memLimit = array[2];
                    //console.log("Content: ",value.email, value.cpuLimit, value.memLimit);
                }catch(err){ console.log("Erreur est survenue pendant la lecture ",err.stack); }
            }
        });

    }    

    //Udating values
    function updateProcess(){
        osutils.cpuUsage((usage) => {updatevalues.cpusage  = (usage*100).toFixed(2)});
        updatevalues.freePercentagemem =  (osutils.freememPercentage()*100).toFixed(2);
        updatevalues.freemem = (osutils.freemem()/1024).toFixed(2);
        updatevalues.usedmem = (osutils.totalmem()/1024 - osutils.freemem()/1024).toFixed(2);
        updatevalues.osuptime = parseUptime(osutils.sysUptime());
    }

    //We set format of uptime here
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

    // save data in file
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
        let freePercentagemem = (osutils.freememPercentage()*100).toFixed(2)+'%';
        return t +'\t'+ cpumaxspeed +'\t\t'+ updatevalues.cpusage +'\t\t'+ totalmem +'\t\t'+ freemem +'\t\t'+ freePercentagemem +'\t\t'+ usedmem +'\r\n';
    }

    server.listen(PORT, async() => {
        console.log(`Application runing on port ${PORT}`);
        await open(`${host}/`);
    });
})();