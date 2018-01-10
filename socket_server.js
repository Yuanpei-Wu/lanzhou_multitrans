/**
 * Created by fiver on 2016/11/20.
 */
function socket_server(socket){
    //�����ͻ����Զ����storeClientInfo�¼�����¼�ͻ���id
    socket.on('storeClientInfo', function (data) {
        var clientInfo = new Object();
        clientInfo.customId     = data.customId;
        //������һ��DevID
        clientInfo.DevID     = data.DevID;
        clientInfo.clientId     = socket.id;
        console.log(clientInfo);
        clients.push(clientInfo);

        console.log('����Ա��������');
    });


    //�����websocket�ͻ��˶Ͽ�����ʱ������û�ID�б��ɾ�����û�id
    socket.on('disconnect', function (data) {
        for( var i=0, len=clients.length; i<len; ++i ){
            var c = clients[i];
            if(c.clientId == socket.id){
                clients.splice(i,1);
                console.log('�ͻ��˶Ͽ�����');
                console.log(c);
                break;
            }
        }
    });



    //������̬���
    socket.on('open_dyn',function(){
        exec("daemon_dynamicroute1.7",function (err,stdout,stderr) {
            console.log('stdout��',stdout);
            console.log('stderr��',stderr);
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

    //�������ݵ���
    socket.on('open_schedule',function(){
        exec("daemon_scheduler",function (err,stdout,stderr) {
            console.log('stdout��',stdout);
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

    //�������
    socket.on('open_tunnel',function(data){

        async.series([ //ʹ��async,��֤����˳��ִ��

                function(callback) {  //ͨ��ping 10.0.0.1 �������Ƿ���
                    console.log('open tunnel');
                    var ping = "ping 10.0.0.1 -w 5|grep ttl";

                    exec(ping,function (error,stdout,stderr) {
                        console.log('stdout��',stdout);
                        console.log('stderr��',stderr);
                        /*if (error !== null) {
                         ����console.log('exec error:' + error);
                         ����}*/
                        callback(error,stdout);
                    });
                },

            ],
            function(error,stdout) {
                if(error) {
                    console.log('error:',error);
                    var open_tun = "daemon_marudpsctp";

                    exec(open_tun,function (err,stdout,stderr) {
                        console.log('stdout��',stdout);
                        console.log('stderr��',stderr);
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
                    console.log('Tunnel has been opened before��');
                }

            }
        );

    });

    //����ϵͳ״̬
    socket.on('reqSysStatus',function(){
        //console.log(SysStatusData);
        socket.emit('getSysStatus',SysStatusData);
    });
    //���ش���ʹ����
    socket.on('reqDiskStatus',function(){
        var data={};
        data['rootPercent']=rootPercent;
        data['bootPercent']=bootPercent;
        //console.log(data);
        socket.emit('getDiskStatus',data);
    });

    //PPP״̬���Ĵ����¼�
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


    //����
    socket.on('reboot_event',function(data){
        console.log('System will reboot!');
        setTimeout(function(){
            exec('reboot',function (error,stdout,stderr) {
                console.log('stdout��',stdout);
                console.log('stderr��',stderr);
            });
        },1000);

    });

    //�ػ�
    socket.on('shutdown_event',function(data){
        console.log('System will shutdown!');
        setTimeout(function(){
            exec('init 0',function (error,stdout,stderr) {
                console.log('stdout��',stdout);
                console.log('stderr��',stderr);
            });
        },1000);

    });



    //�����շ�����
    socket.on('reqMonitor',function(){
        /*for(var item in MonitorData){
         console.log(MonitorData[item]);
         }*/
        socket.emit('getMonitor',PPPLinkData);

    });

    //����schedule_data���
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

    //����schedule_data���
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


    //����init_dyna����
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

    //����init_dyna���
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

    //��ʼ��ppp_link��������
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

    //���� ppp_link
    socket.on('ppp_link_update',function(){
        socket.emit('PPPLinkUpdate',PPPLinkData);
    });

    //merip��ַ����
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