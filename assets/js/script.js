 const fs = require('fs');
 const path = require('path');
 let parseWithZero = require('./utils');

 module.exports =  function fileprocess(){
    let d = new Date();
    let header = 'temps'+'\t\t'+'v_max_cpu'+'\t'+'prtg_cpu'+'\t'+'mem_tot'+'\t\t'+'mem_lib'+'\t\t'+'prtg_mem_lib'+'\t'+'mem_utilisee'+'\r\n';
    
    const filename = d.getFullYear().toString()+'_'+ parseWithZero(d.getMonth())+ '_'+parseWithZero(d.getDate())+'.log.txt';
    let filepath =  path.join('log/', filename);

    fs.access(filepath, fs.constants.F_OK, (err) =>{
         if(err){
             console.log(`${filepath} dosn't exist`);
             fs.appendFile(filepath, header, (error) =>{
                 if(error) throw error;
                 console.log(`${filepath} created and header appended`);
             })
         }else{
            console.log(`${filepath} exist`);
         }
     });
     return filepath;
 }
