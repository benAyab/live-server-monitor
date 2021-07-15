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
const cores = require('physical-cpu-count');
const nodemailer = require("nodemailer");
const sqlite3 = require('sqlite3').verbose();
const {fileprocess, databaseCreateDir} = require('./src/script');
const parseWithZero = require("./src/utils");
const user = require('./src/helper');
const { F_OK } = require("constants");

(async function(){
    //Variables and constants
    const PORT = await getPort({port: 3000});
    const host = `http://127.0.0.1:${PORT}`;
    const defaultEmail = 'example@domain.com';
    
    if(!fs.existsSync('./log')){
        fs.mkdirSync('./log', { recursive: true});
    }

    if(!fs.existsSync('./config')){
        fs.mkdirSync('./config', { recursive: true});
    }

   const filepath = fileprocess();

   databaseCreateDir();
   const database = new sqlite3.Database('./data/historique.db', (err) =>{
       if(err){
        console.error('Erreur: ', err);
           process.exit(1);
       }
   })
    process.on('exit', (code) =>{
        database.close();
    });

    let sqlCreate = "CREATE TABLE IF NOT EXISTS performance(";
    sqlCreate += "date TEXT NOT NULL";
    sqlCreate += ",heure TEXT NOT NULL";
    sqlCreate += ",v_max_cpu TEXT NOT NULL";
    sqlCreate += ",pourcentage_cpu TEXT NOT NULL";
    sqlCreate += ",mem_tot TEXT NOT NULL";
    sqlCreate += ",mem_lib TEXT NOT NULL";
    sqlCreate += ",mem_utilisee TEXT NOT NULL";
    sqlCreate += ")";

    database.run(sqlCreate);

   const configpath = path.join('config/','config.txt');
   let lastTencpu = [];
   let lastTenMem = [];

   //	Controls variables
   let counter = 0;
   let dbDelay = 0; // Timer to save new value to database

   //FLAGS
   let arrayIsFull = false; // Have-we at leas 10 previous values ?
   let emailflag = false; // Any email are sent ?
   let isSending = false; // To avoid sending consecutif mail

   let initialvalues = {
        cpumodel: os.cpus()[0].model,
        cpucores: cores,
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
    };

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
            socket.emit('updates', JSON.stringify(updatevalues));
        }, 1000);

        
        socket.on('getfirstvalues', () =>{
            socket.emit('firstval', JSON.stringify(initialvalues));
        });

        socket.on('getSavedValues', () =>{
            socket.emit('savedValues', JSON.stringify(value));
        });

        socket.on("saveNewValue", (val) =>{
            let v = JSON.parse(val);
            value.email = v.email;
            value.cpuLimit = v.cpuLimit;
            value.memLimit = v.memLimit;
            //console.log(value);
            try{
                fs.writeFileSync(configpath, v.email+","+v.cpuLimit+","+v.memLimit);
                socket.emit("onsaved", '0');
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
    

    // Functions section
    /*
    *	All utilities are below
    */

    //Updating values
    function updateProcess(){
        osutils.cpuUsage((usage) => {updatevalues.cpusage  = (usage*100).toFixed(2)});
        updatevalues.freePercentagemem =  (osutils.freememPercentage()*100).toFixed(2);
        updatevalues.freemem = (osutils.freemem()/1024).toFixed(2);
        updatevalues.usedmem = (osutils.totalmem()/1024 - osutils.freemem()/1024).toFixed(2);
        updatevalues.osuptime = parseUptime(osutils.sysUptime());
    }

    setInterval(() => {
        updateProcess();
        
        if(dbDelay >= 60){
            if(parseInt(updatevalues.cpusage) !== 0){
                let ws = fs.createWriteStream(filepath, {flags: 'a'});
                ws.write(statToLog());
            }
            let d = new Date();
            let heure = parseWithZero(d.getHours())+':'+parseWithZero(d.getMinutes())+':'+parseWithZero(d.getSeconds());
            let jour = d.getFullYear().toString()+'/'+ parseWithZero(d.getMonth()+1)+ '/'+parseWithZero(d.getDate());

            let insertRequest = "INSERT INTO performance(date,heure,v_max_cpu,pourcentage_cpu,mem_tot,mem_lib,mem_utilisee)";
            insertRequest += "VALUES (";
            insertRequest += '"'+jour+'","'+heure+'","'+initialvalues.cpuspeed+'","'+updatevalues.cpusage+'","'+initialvalues.totalmem+'","'+updatevalues.freemem+'","'+updatevalues.usedmem+'")';
            
            database.run(insertRequest, (result, err) =>{
                if(err){
                   return console.error(err.message);
                }
            })
            dbDelay = 0
        }else{
            dbDelay++
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

            const lastTenSumCPU = lastTencpu.reduce((total, val) => {
                return total + val;
            },0.0);

            const lastTenSumMem = lastTenMem.reduce((total, val) => {
                return total + val;
            }, 0.0);

            if(((lastTenSumCPU/10) >= parseFloat(value.cpuLimit)) || ((lastTenSumMem/10) >= parseFloat(value.memLimit))){
                if( (!emailflag || counter >= 60 ) && !isSending){
                    /*
                    let d = new Date();
                    let h = parseWithZero(d.getHours());
                    let m = parseWithZero(d.getMinutes());
                    let ss = parseWithZero(d.getSeconds());
                    let t = h+':'+m+':'+ss;
                    console.log("Heure : ", t);
                    */
                    //console.log('Counter: ',counter);
                    //console.log('Is sending: ',isSending);
                    isSending = true;
                    mailOptions.to = value.email;
                    mailOptions.text = "Charge CPU: "+ (lastTenSumCPU/10).toFixed(2)+"%, Mémoire: "+(lastTenSumMem/10).toFixed(2)+"%";
                    
                    transporter.sendMail(mailOptions, (err, data) =>{
                        if(err){
                            emailflag = false;
                            isSending = false;
                            //console.log("Email error: ", err);
                        }else{
                            emailflag = true;
                            isSending = false;
                            counter = 0;
                            //console.log("Email sent", data);
                        }
                    })
                }else{ counter++}
            }else{ counter++}
        }
    },1000);

    // We get configuration values here
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
                }catch(err){ console.log("Erreur de lectrure du fichier de configuration ",err.stack); }
            }
        });
    }    

    //Mise en forme temps de service
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
        let freePercentagemem = (osutils.freememPercentage()*100).toFixed(2);
        return t +'\t'+ cpumaxspeed +'\t\t'+ updatevalues.cpusage +'\t\t'+ totalmem +'\t\t'+ freemem +'\t\t'+ freePercentagemem +'\t\t'+ usedmem +'\r\n';
    }

    server.listen(PORT, async() => {
        console.log(`Application runing on port ${PORT}`);
        await open(`${host}/`);
    });
})();