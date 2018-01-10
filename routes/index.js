var express = require('express');
var router = express.Router();
var mysql=require('mysql');
var session=require('express-session');
var async=require('async');
var exec = require('child_process').exec;
var http=require('http');
const path = require('path');
const fs = require('fs');
/* GET home page. */
router.get('/', function(req, res, next) {
    res.render('login', { title: 'login' ,update:false});
});
/***********************************登录****************************/
router.route('/login')
    .get(function(req,res){
        res.render('login', { title: 'login',update:false });
    })
    .post(function(req,res){
        var user=req.body.username;
        var password=req.body.password;
        var userlist=global.userlist;//userlist为全局变量，此时变为局部变量，以防误改
        var username="";
        if(userlist!=null){
            for(var i=0;i<userlist.length;i++){
                if(user==userlist[i].username&&password==userlist[i].password)
                    username=user;
            }
        }

        if(username!=""){
            req.session.user=username;
            res.send('success');
        }else{
            res.send('fail');
        }
    });
router.get('/logout',function(req,res){

    if(req.session.user){
        req.session.user==null;
        req.cookie=null;
        res.redirect('login');
    }
})
/******************************************主页操作****************************************/
router.get('/home',function(req,res){
    if(req.session.user)
        res.render('home',{title:'home'});
    else
        res.redirect('login');
});
router.route('/current_data').get(function(req,res){
    if(req.session.user)
        res.render('current_data',{title:'current_data'});
    else
        res.redirect('login');
});
router.route('/history_data').get(function(req,res){
    if(req.session.user)
        res.render('history_data',{title:'history_data'});
    else
        res.redirect('login');
});
router.route("/online").get(function (req,res) {
    if(req.session.user)
        res.render('online');
    else
        res.redirect('login');
})
router.get('/return_current_data',function(req,res){
    var route_id=req.query.route_id;
    for(var i=0;i<global.filedata.length;i++){
        if(global.filedata[i]['tableCome']==route_id){
            res.send(global.filedata[i]);
            break;
        }
    }
});
router.get('/return_history_data',function(req,res){
    var route_id=req.query.route_id;
    for(var i=0;i<global.historydata.length;i++){
        if(global.historydata[i]['tableFile']==route_id){
            res.send(global.historydata[i]);
            break;
        }
    }
});
router.get('/return_net_data',function(req,res){
    if(global.netdata.length>0){
        res.send({"data":global.netdata});
    }else{
        res.send({"data":[[0,0,0,0,0,0,0]]});
    }
})
/*********************************进入user_manage需要管理员权限***********************************/
router.route('/user_manage').get(function(req,res){
    var userlist=global.userlist;
    var username=req.session.user;
    var authen=false;
    if(!username)
        res.redirect("login");
    if(userlist!=null){
        for(var i=0;i<userlist.length;i++){
            if(username==userlist[i].username){
                if(userlist[i].power>0){
                    authen=true;
                    break;
                }
            }
        }
        if(authen)
            res.render('user_manage',{title:'user_manage',userlist:userlist});
        else
            res.render('login',{update:true});
    }
}).post(function(req,res){
    var operation=req.body.operation;
    var target_user=req.body.user;
    if(operation=='user_delete'){//删除用户
        var SQLcommand="delete from userlist where username='"+target_user+"'";
        var client = mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: 'bjtungirc'
        });
        client.connect();
        async.series([
                function(callback){
                    client.query('use mysql');
                    callback(null,null);
                },
                function(callback){
                    client.query(SQLcommand,function(err,result){
                        if(err){
                            console.log(err);
                            client.end();
                            callback(null,0);
                        }else{
                            console.log(result);
                            client.end();
                            callback(null,1);
                        }
                    });
                }
            ]
            ,function(stderr,stdout){
                if(stdout[1]>0){
			for(var i=0;i<global.userlist.length;i++){
				if(global.userlist[i].username==target_user){
                    			global.userlist.splice(i,1);
                    			res.send(global.userlist);

				}
			}
                }else{
                    res.send('fail');
                }
            })


    }else if(operation=='password_change'){//密码修改
        var target_user=req.body.user;
        var new_password=req.body.password;
        var SQLcommand='update  userlist set password="'+new_password+'" where username="'+target_user+'"';
        var client = mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: 'bjtungirc'
        });
        client.connect();
        async.series([
                function(callback){
                    client.query('use mysql');
                    callback(null,null);
                },
                function(callback){
                    client.query(SQLcommand,function(err,result){
                        if(err){
                            console.log(err);
                            client.end();
                            callback(null,0);
                        }else{
                            console.log(result);
                            client.end();
                            callback(null,1);
                        }
                    });
                }
            ]
            ,function(stderr,stdout){
                if(stdout[1]>0){
                    for(var i=0;i<global.userlist.length;i++){
                        if(global.userlist[i].username==target_user){
                            global.userlist[i].password=new_password;
                            res.send(global.userlist);
                            break;
                        }
                    }
                }else{
                    res.send('fail');
                }
            })

    }else{
        res.send('invalid param');
    }
})

/*****************mount_manage and net_manage****************/
router.get('/mount_manage',function(req,res){
    if(req.session.user)
        res.render('mount_manage',{title:'mount_manage'})
    else
        res.redirect('login');
});
router.get('/net_manage',function(req,res){
    if(req.session.user)
        res.render('net_manage',{title:'net_manage'});
    else
        res.redirect('login');
});

/******************************传输开始与结束***********************************/
global.start_count=0;
router.route('/start_trans').post(function(req,res){
    var mar_addr=req.body.marip;
    var operation1="/mnt/Grade2/1013/tcp_server/kill_server.sh";
    var operation2="/mnt/Grade2/1013/tcp_server/setup_server.sh > /home/hi.out &";
    var operation3="end_client";
    var operation4="start_client";
    if(mar_addr==null){
        res.send('bad param');
    }else{
        //第一次启动
        if(global.start_count==0){
            async.series([
                /**
                function(callback){
                    exec(operation1,function(err,stdout,strerror){
                        if(err) console.log(err);
                        console.log('step 1');
                        callback(null,null);
                    });
                },
                 **/
                function(callback){
                    exec(operation2,function(err,stdout,strerror){
                        if(err) console.log(err);
                        console.log('step 2');
                    });
                    callback(null,null);
                },
                /*
                function(callback){
                    http.get("http://"+mar_addr+"/operation?operation="+operation3,function(req,res){
                        console.log('step 3');
                        callback(null,null);
                    });
                },
                */
                function(callback){
                    http.get("http://"+mar_addr+"/operation?operation="+operation4,function(req,res){
                        console.log('step 4');
                    });
                    callback(null,null);
                }
            ],function(stderror,stdout){
                if(stderror)    console.log(stderror);
                res.send('success');
            });
        //第n此启动(n>1)
        }else if(global.start_count>0){
            async.series([
                /*
                function(callback){
                    http.get("http://"+mar_addr+"/operation?operation="+operation3,function(req,res){
                        console.log('step 3');
                        callback(null,null);
                    });
                },
                */
                function(callback){
                    http.get("http://"+mar_addr+"/operation?operation="+operation4,function(req,res){
                        console.log('step 4');
                    });
                    callback(null,null);
                }
            ],function(stderror,stdout){
                if(stderror)    console.log(stderror);
                res.send('success');
            });
        }else{
            global.start_count=0;
            res.send('success');

        }
        global.start_count++;
        console.log(global.start_count);
    }

});

router.route('/end_trans').post(function(req,res){
    var mar_addr=req.body.marip;
    var operation1="/mnt/Grade2/1013/tcp_server/kill_server.sh";
    var operation2="end_client";
    if(mar_addr==null){
        res.send('bad param');

    }else{
        //存在同一车次多次点击结束传输按钮的问题
        global.start_count--;
        if(global.start_count<=0){
            async.series([

                    function(callback){
                        exec(operation1,function(err,stdout,strerror){
                            if(err) console.log(err);
                            callback(null,null);
                        });
                    },

                    function(callback){
                        http.get("http://"+mar_addr+"/operation?operation="+operation2,function(req,res){
                            callback(null,null);
                        });
                    }
                ]
                ,function(stderr,stdout){
                    if(stderr) console.log(stderr);
                    //global.filedata.data.length=0;
                    global.start_count=0;
                    res.send('success');
                });

        }else {
            http.get("http://" + mar_addr + "/operation?operation=" + operation2);
            res.send('success');
        }


    }

});

/**********************************网络转储控制*************************************************/
router.get('/start_netforward',function(req,res){
    var ip_addr=req.param("ip_addr");
    var user=req.param("user");
    var password=req.param("password");
    async.series([
        function (callback) {
            exec("/home/net_forward2.sh "+ip_addr +" "+user+" "+password, function (err,stdout,stderr) {
                if(err){
                    console.log(err);
                    callback(null,0);
                }else{
                    callback(null,1);
                }
            })
        }
    ],function(stderr,stdout){
        if(stderr)
            console.log(stderr);
         res.send("success");
    })
})

/******************************总速率获得**************************************************/
router.get('/return_totalrate', function (req,res,next) {
    var totalrate=fs.readFileSync('/home/rateMonitor.txt');
    res.send(totalrate);
})

/******************************在线设备检测**********************************************/
router.get('/return_online', function (req,res) {
    res.send(global.online_device);
})


/***************************我懒得改了，以下部分必须放最后***********************************/
router.get('/file/:fileName',function(req,res,next){
//实现文件下载
    var fileName=req.params.fileName;

//    var filepath=path.join(__dirname,fileName);
//    var filepath=path.join("C:/Users/Administrator/Desktop/abc",fileName);
    var filepath=path.join("/mnt/test",fileName);
    console.log("======================================filepath==================================================");
    console.log(filepath);
    var stats=fs.statSync(filepath);
    if(stats.isFile()) {
        res.set({
            'Content-Type': 'application/octet-stream',
            'Content-Disposition': 'attachment;filename=' + fileName,
            'Content-Length': stats.size
        });
        fs.createReadStream(filepath).pipe(res);


    }
    else
    {
        res.end(404);
    }
});



module.exports = router;
