/**
 * Created by fiver on 2017/3/31.
 */
var express = require('express');
var router = express.Router();

/* GET users listing. */
router.get('/', function(req, res, next) {
    res.render('login', { title: 'Express' });
});
router.get('/judge',function(req,res,next){
    var user=req.username;
    var password=req.password;
    if(user=="admin" && password==""){

    }

})

module.exports = router;