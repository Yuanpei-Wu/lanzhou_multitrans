/**
 * Created by fiver on 2016/11/20.
 */
/**************************************************************socket�¼�********************************************************/
function socketEvent(socket){
    //��ʼ��ppp_link
    socket.on('getTableLinkInit',function(data){
        //��������ձ�񣬷������������ӻ����
        var i=0;
        for(var item in  data){
            tableLink[i].row($('#pppLink'+i+' tbody tr')).remove();
            var obj =data[item];
            for(var x=4;x>-1;x--){
                var para=obj[x];
                tableLink[i].row.add([para.id,para.ifname,para.status,para.RSRP,para.raterecv,para.ratesend,para.PSRAT]).draw();
                //console.log(para.id);
            }
            i++;
        }
    });
    //����pppLink���
    socket.on('PPPLinkUpdate',function(data){
        for(var item in data){
            var obj=data[item];
            var i=parseInt(item.substr(-1));
            if(obj['ifUpdated']){
                tableLink[i].row($("#pppLink"+i+" tbody").children(":first")).remove();
                tableLink[i].row.add([obj.id,obj.ifname,obj.status,obj.RSRP,obj.raterecv,obj.ratesend,obj.PSRAT]).draw();
            }
        }
        setTimeout(function(){
            socket.emit('ppp_link_update');
        },3000);
    });

    //�����շ�����
    socket.on('getMonitor',function(data){
        //var ifUpdated=false;
        var sendAll=0,recvAll=0;
        var transtime=new Date().getTime()+28800000;
        for(var item in data){
            var obj=data[item];
            if(obj['ifUpdated']){
                //ifUpdated=true;
                //transtime=translate(obj['time']);
                sendAll+=obj.ratesend;
                recvAll+=obj.raterecv;
                if(count<20){
                    $('#container0').highcharts().get(item).addPoint([transtime,obj.ratesend],false,false,false);//redraw,shift,animation
                    $('#container1').highcharts().get(item).addPoint([transtime,obj.raterecv],false,false,false);
                    $('#container2').highcharts().get(item).addPoint([transtime,obj.RSRP],true,false,false);
                    $('#container3').highcharts().get(item).addPoint([transtime,obj.rtt],true,false,false);
                    $('#container4').highcharts().get(item).addPoint([transtime,obj.lossrate],true,false,false);
                }else{
                    $('#container0').highcharts().get(item).addPoint([transtime,obj.ratesend],false,true,false);
                    $('#container1').highcharts().get(item).addPoint([transtime,obj.raterecv],false,true,false);
                    $('#container2').highcharts().get(item).addPoint([transtime,obj.RSRP],true,true,false);
                    $('#container3').highcharts().get(item).addPoint([transtime,obj.rtt],true,true,false);
                    $('#container4').highcharts().get(item).addPoint([transtime,obj.lossrate],true,true,false);
                }

            }else{
                if(count<20){
                    $('#container0').highcharts().get(item).addPoint([transtime,0],false,false,false);//redraw,shift,animation
                    $('#container1').highcharts().get(item).addPoint([transtime,0],false,false,false);
                    $('#container2').highcharts().get(item).addPoint([transtime,-120],true,false,false);
                    $('#container3').highcharts().get(item).addPoint([transtime,0],true,false,false);
                    $('#container4').highcharts().get(item).addPoint([transtime,100],true,false,false);
                }else{
                    $('#container0').highcharts().get(item).addPoint([transtime,0],false,true,false);
                    $('#container1').highcharts().get(item).addPoint([transtime,0],false,true,false);
                    $('#container2').highcharts().get(item).addPoint([transtime,-120],true,true,false);
                    $('#container3').highcharts().get(item).addPoint([transtime,0],true,true,false);
                    $('#container4').highcharts().get(item).addPoint([transtime,100],true,true,false);
                }
            }

        }

        if(count<20){
            $('#container0').highcharts().get('sendAll').addPoint([transtime,sendAll],true,false,false);
            $('#container1').highcharts().get('recvAll').addPoint([transtime,recvAll],true,false,false);
        }else{
            $('#container0').highcharts().get('sendAll').addPoint([transtime,sendAll],true,true,false);
            $('#container1').highcharts().get('recvAll').addPoint([transtime,recvAll],true,true,false);
        }
        count++;
        if(count>30) count--;


        setTimeout(function(){
            socket.emit("reqMonitor");
        },3000);

    });


    //���schedule_data���
    socket.on("getScheduleData",function(data){
        var i=1;
        var temp=document.getElementById('schedule_data_table')
        for(var item in data){
            //console.log($('#schedule_table tr:eq('+i+')'));
            temp.rows[i].cells[1].innerHTML=data[item];
            i++;
        }

    });





    //����schedule_data���ɹ�
    socket.on("schedule_data_update_success",function(data){
        var key=data.key;
        var value=data.value;
        var selectedRow=$('#schedule_data_table').find('.selected');
        if(selectedRow[0].cells[0].innerHTML==key) selectedRow[0].cells[1].innerHTML=value;

        layer.closeAll();
        layer.alert("�޸ĳɹ���");
    });



    //���ϵͳ״̬
    socket.on('getSysStatus',function(data){
        if(data.ifDyn){
            $('#dynSwitch input').bootstrapSwitch('readonly',false);
            $('#dynSwitch input').bootstrapSwitch('state',true);
            $('#dynSwitch input').bootstrapSwitch('readonly',true);
            $('#open_dyn').attr({'disabled':'disabled'});
        }
        else{
            $('#dynSwitch input').bootstrapSwitch('readonly',false);
            $('#dynSwitch input').bootstrapSwitch('state',false);
            $('#dynSwitch input').bootstrapSwitch('readonly',true);
            $('#open_dyn').removeAttr("disabled");
        }
        if(data.ifSchedule){
            $('#scheduleSwitch input').bootstrapSwitch('readonly',false);
            $('#scheduleSwitch input').bootstrapSwitch('state',true);
            $('#scheduleSwitch input').bootstrapSwitch('readonly',true);
            $('#open_schedule').attr({'disabled':'disabled'});
        }
        else{
            $('#scheduleSwitch input').bootstrapSwitch('readonly',false);
            $('#scheduleSwitch input').bootstrapSwitch('state',false);
            $('#scheduleSwitch input').bootstrapSwitch('readonly',true);
            $('#open_schedule').removeAttr("disabled");
        }
        if(data.ifTunnel){
            $('#tunnelSwitch input').bootstrapSwitch('readonly',false);
            $('#tunnelSwitch input').bootstrapSwitch('state',true);
            $('#tunnelSwitch input').bootstrapSwitch('readonly',true);
            $('#open_tunnel').attr({'disabled':'disabled'});
        }
        else{
            $('#tunnelSwitch input').bootstrapSwitch('readonly',false);
            $('#tunnelSwitch input').bootstrapSwitch('state',false);
            $('#tunnelSwitch input').bootstrapSwitch('readonly',true);
            $('#open_tunnel').removeAttr("disabled");
        }
        for(var item in pppObject){
            if(data['ifPPP'+item.substr(-1)]){
                $('#'+item+'Switch input').bootstrapSwitch('readonly',false);
                $('#'+item+'Switch input').bootstrapSwitch('state',true);
                $('#'+item+'Switch input').bootstrapSwitch('readonly',true);
            }else{
                $('#'+item+'Switch input').bootstrapSwitch('readonly',false);
                $('#'+item+'Switch input').bootstrapSwitch('state',false);
                $('#'+item+'Switch input').bootstrapSwitch('readonly',true);
            }
        }
        var cpuPercent=data.cpuPercent;
        var memoryPercent=data.memoryPercent;
        //console.log(cpuPercent);
        if(cpuPercent>0&cpuPercent<100){
            $('#cpuGauge').highcharts().series[0].update({data:[cpuPercent]});
        }
        if(memoryPercent>0&memoryPercent<100){
            $('#memoryGauge').highcharts().series[0].update({data:[memoryPercent]});
        }

        setTimeout(function(){
            socket.emit('reqSysStatus');
        },5000);
    });

    //����Ӳ��ʹ����
    socket.on('getDiskStatus',function(data){
        var rootPercent=data.rootPercent;
        var bootPercent=data.bootPercent;
        if(rootPercent>0&rootPercent<100){
            $('#rootGauge').highcharts().series[0].update({data:[rootPercent]});
        }
        if(bootPercent>0&bootPercent<100){
            $('#bootGauge').highcharts().series[0].update({data:[bootPercent]});
        }
        setTimeout(function(){
            socket.emit('reqDiskStatus');
        },300000);
    })

    //������̬���ɹ�
    socket.on('open_dyn_success',function(data){
        $('#dynSwitch input').bootstrapSwitch('readonly',false);
        $('#dynSwitch input').bootstrapSwitch('state',true);
        $('#dynSwitch input').bootstrapSwitch('readonly',true);
        $('#open_dyn').attr({'disabled':'disabled'});
        layer.alert('������������ɹ���');
    });
    socket.on('open_schedule_success',function(data){
        $('#scheduleSwitch input').bootstrapSwitch('readonly',false);
        $('#scheduleSwitch input').bootstrapSwitch('state',true);
        $('#scheduleSwitch input').bootstrapSwitch('readonly',true);
        $('#open_schedule').attr({'disabled':'disabled'});
        layer.alert('������Դ����ɹ���');
    });
    socket.on('open_tunnel_success',function(data){
        $('#tunnelSwitch input').bootstrapSwitch('readonly',false);
        $('#tunnelSwitch input').bootstrapSwitch('state',true);
        $('#tunnelSwitch input').bootstrapSwitch('readonly',true);
        $('#open_tunnel').attr({'disabled':'disabled'});
        layer.alert('�����ǻ۷���ɹ���');
    });

    //����ppp״̬�ɹ�
    socket.on('ppp_change_success',function(){
        layer.alert('���ĳɹ�');
    });

    //����merip�ɹ�
    socket.on('merip_change_success',function(){
        layer.alert('���ĳɹ��������豸��������Ч');
    });

}




