/**
 * Created by fiver on 2016/11/20.
 */
function socket_server(socket){
    //监听客户端自定义的storeClientInfo事件，记录客户端id
    socket.on('storeClientInfo', function (data) {
        var clientInfo = new Object();
        clientInfo.customId     = data.customId;
        //新增了一个DevID
        clientInfo.DevID     = data.DevID;
        clientInfo.clientId     = socket.id;
        console.log(clientInfo);
        clients.push(clientInfo);

        console.log('管理员建立连接');
    });


    //如果当websocket客户端断开连接时，会从用户ID列表里，删除该用户id
    socket.on('disconnect', function (data) {
        for( var i=0, len=clients.length; i<len; ++i ){
            var c = clients[i];
            if(c.clientId == socket.id){
                clients.splice(i,1);
                console.log('客户端断开连接');
                console.log(c);
                break;
            }
        }
    });



    //开启动态监测
    socket.on('open_dyn',function(){
        exec("daemon_dynamicroute1.7",function (err,stdout,stderr) {
            console.log('stdout：',stdout);
            console.log('stderr：',stderr);
            if (err !== null) {
                console.log('Open dyn failed!');
                console.log('exec error:' + err);
            }
            else{
                console.log('Open dyn successfully!');
                socket.emit('open_dyn_success');
            }
        });
    });

    //开启数据调度
    socket.on('open_schedule',function(){
        exec("daemon_scheduler",function (err,stdout,stderr) {
            console.log('stdout：',stdout);
            console.log('err',stderr);
            if (err !== null) {
                console.log('Open scheduler failed!');
                console.log('exec error:' + err);
            }
            else{
                console.log('Open scheduler successfully!');
                socket.emit('open_schedule_success');
            }
        });
    });

    //开启隧道
    socket.on('open_tunnel',function(data){

        async.series([ //使用async,保证程序顺序执行

                function(callback) {  //通过ping 10.0.0.1 监测隧道是否开启
                    console.log('open tunnel');
                    var ping = "ping 10.0.0.1 -w 5|grep ttl";

                    exec(ping,function (error,stdout,stderr) {
                        console.log('stdout：',stdout);
                        console.log('stderr：',stderr);
                        /*if (error !== null) {
                         　　console.log('exec error:' + error);
                         　　}*/
                        callback(error,stdout);
                    });
                },

            ],
            function(error,stdout) {
                if(error) {
                    console.log('error:',error);
                    var open_tun = "daemon_marudpsctp";

                    exec(open_tun,function (err,stdout,stderr) {
                        console.log('stdout：',stdout);
                        console.log('stderr：',stderr);
                        if (err !== null) {
                            console.log('Open tunnel failed!');
                            console.log('exec error:' + err);
                        }
                        else{
                            console.log('Open tunnel successfully!');
                            socket.emit('open_tunnel_success');
                        }
                    });

                }
                else {
                    console.log('Tunnel has been opened before！');
                }

            }
        );

    });

    //返回系统状态
    socket.on('reqSysStatus',function(){
        //console.log(SysStatusData);
        socket.emit('getSysStatus',SysStatusData);
    });
    //返回磁盘使用率
    socket.on('reqDiskStatus',function(){
        var data={};
        data['rootPercent']=rootPercent;
        data['bootPercent']=bootPercent;
        //console.log(data);
        socket.emit('getDiskStatus',data);
    });

    //PPP状态更改触发事件
    socket.on('pppStatusChange',function(data){
        var state=data['state'];
        var num=data['ppp'];
        var commond='';
        if (state)
        {
            commond='daemon_'+pppObject['ppp'+num];
        }
        else
        {
            commond='kill'+pppObject['ppp'+num];
        }
        if(commond.length>0){
            console.log(commond);
            exec(commond,function(err,stdout,stderr){
                if(err){
                    console.log(err);
                }else{
                    socket.emit('ppp_change_success');
                }
            });
        }


    });


    //重启
    socket.on('reboot_event',function(data){
        console.log('System will reboot!');
        setTimeout(function(){
            exec('reboot',function (error,stdout,stderr) {
                console.log('stdout：',stdout);
                console.log('stderr：',stderr);
            });
        },1000);

    });

    //关机
    socket.on('shutdown_event',function(data){
        console.log('System will shutdown!');
        setTimeout(function(){
            exec('init 0',function (error,stdout,stderr) {
                console.log('stdout：',stdout);
                console.log('stderr：',stderr);
            });
        },1000);

    });



    //返回收发速率
    socket.on('reqMonitor',function(){
        /*for(var item in MonitorData){
         console.log(MonitorData[item]);
         }*/
        socket.emit('getMonitor',PPPLinkData);

    });

    //返回schedule_data表格
    socket.on('reqScheduleData',function(){
        client.query('use '+database_dyninfo);
        var SQL="select link_section,MAX_PKTLOSSRATE,MAX_RTT,MIN_RSSI,MIN_RSRP,MIN_RSRQ,MIN_SINR,MIN_SNR,SLA,manual_sendpercent,sendpercent from  "+table_schedule_data;
        client.query(SQL,function(error,result){
            if(error) {
                console.log(error);
            }
            else{
                //console.log(result);
                socket.emit("getScheduleData",result[0])
            }
        });
    });

    //更新schedule_data表格
    socket.on("schedule_data_update",function(data){
        client.query('use '+database_dyninfo);
        if(typeof(data['value'])=='string'){
            var SQL="update "+table_schedule_data+" set "+data['key']+"='"+data['value']+"'";
        }else{
            var SQL="update "+table_schedule_data+" set "+data['key']+"="+data['value'];
        }
        client.query(SQL,function(error,result){
            if(error) {
                console.log("change "+data['key']+" fail");
                console.log(error);
            }
            else{
                if(data['key']=='link_section'){
                    exec('pkill scheduler',function(err,stdout,stderr){
                        if(err) console.log(err);
                    });
                }
                console.log("change "+data['key']+" success");
                socket.emit("schedule_data_update_success",data);
            }
        });
    });


    //返回init_dyna数据
    socket.on("reqInitDyna",function(data){
        client.query('use '+database_dyninfo);
        var SQL="select * from  "+table_init_dyna;
        client.query(SQL,function(error,result){
            if(error) {
                console.log(error);
            }
            else{
                //console.log(result);
                socket.emit("getInitDyna",result[0]);
            }
        });
    });

    //更新init_dyna表格
    socket.on("init_dyna_update",function(data){


        client.query('use '+database_dyninfo);
        var SQL="UPDATE "+table_init_dyna+" set mode="+data['mode']+",remotehost='"+data['remotehost']+"'";
        client.query(SQL,function(error,result){
            if(error) {
                console.log("change  fail");
                console.log(error);
            }
            else{
                console.log("change success");
                if(data['mode']==0){
                    var commond=switch_mode_path+"mer2dir.sh";
                    exec(commond,function(err,stdout,stderr){
                        if(err){
                            console.log(err);
                        }else{
                            socket.emit("init_dyna_update_success",data);
                        }
                    });
                }else if(data['mode']==1){
                    var commond=switch_mode_path+"dir2mer.sh";
                    exec(commond,function(err,stdout,stderr){
                        if(err){
                            console.log(err);
                        }else{
                            socket.emit("init_dyna_update_success",data);
                        }
                    });
                }

            }
        });




    });

    //初始化ppp_link返回数据
    socket.on('ppp_link_init',function(){
        var table_init={};
        var count=0;
        client.query('use '+database_dyninfo);

        for(var item in pppObject){
            var SQL="select * from "+item+"_link order by id desc limit 5";
            client.query(SQL,function(error,result){
                if(error) {
                    console.log(error);
                }
                else{
                    table_init[item]=result;
                    count++;
                    if(count>5){
                        //console.log(table_init);
                        socket.emit('getTableLinkInit',table_init);
                    }
                }
            });
        }

    });

    //更新 ppp_link
    socket.on('ppp_link_update',function(){
        socket.emit('PPPLinkUpdate',PPPLinkData);
    });

    //merip地址更改
    socket.on('merip_change',function(mer_ip){
        var syscommond="";
        async.series([
            function(callback){
                syscommand="sed -i '5c merip="+mer_ip+"' /etc/mar_tun.conf";
                exec(syscommand,function(err,stdout,stderror){
                    if(err) console.log(err);
                    callback(null,stdout);
                });

            },
            function(callback){
                syscommand="sed -i '5c merip="+mer_ip+";' /home/schedule.conf";
                exec(syscommand,function(err,stdout,stderror){
                    if(err) console.log(err);
                    callback(null,stdout);
                });

            }
        ],function(error,stdout){
            if(error){
                console.log(error);

            }else{
                socket.emit('merip_change_success');

            }
        });

    });

}

modules.exports=socket_server;