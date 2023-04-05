var express = require('express');
var bodyParser = require('body-parser');
var expressValidator = require('express-validator');
var expressSession = require('express-session');
var db = require('./db');
var path = require('path');
var mysql = require('mysql');
var async = require('async');

var admin = require('./routes/admin');
var app = express();


app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({
  extended: false
}));
app.use(bodyParser.json());
app.use(expressValidator());
app.use(expressSession({
  secret: 'ATP3',
  saveUninitialized: false,
  resave: false
}));


app.use(express.static('./public'));


var connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'pharmacare'
});

connection.connect();


app.get('/search', function (req, res) {
  connection.query('SELECT Medicine_Name from medicine_information where Medicine_Name like "%' + req.query.key + '%"', function (err, rows, fields) {
    if (err) throw err;
    var data = [];
    for (i = 0; i < rows.length; i++) {
      data.push(rows[i].Medicine_Name);
    }
    res.end(JSON.stringify(data));
  });
});

app.get('/registration', function (req, res) {
  res.render('custreg', {
    title: 'Registration',
    message: '',
    message_type: '',
    errors: ''
  });
});


// var sql = `INSERT INTO contacts (f_name, l_name, email, message, created_at) VALUES ("${f_name}", "${l_name}", "${email}", "${message}", NOW())`;
app.post('/registration', function (req, res) {

  var id=Math.floor(Math.random() * 90 + 10);
  var custname=req.body.name;
  var custusername= req.body.custname;
  var email=req.body.email;
  var gender='N/A';
  var age='N/A';
  var dob='2001-01-01';
  var address='N/A';
  var contact=00;
  var blood_group='N/A';
  var ms='N/A';
  var join_date='2001-01-01';
  var salary=00;
  var custname= req.body.custname;
  var custpass= req.body.custpass;
  var usertype= 'Customer';


  var userinfoquery = `INSERT INTO user_information (ID, Name, Email, Gender, Date_of_Birth, Age, Address, Contact, Blood_Group, Marital_Status, Join_Date, Salary, Username) VALUES ("${id}", "${custname}", "${email}","${gender}","${dob}","${age}","${address}","${contact}","${blood_group}","${ms}","${join_date}","${salary}","${custusername}")`;

  var sql = `INSERT INTO user_access (username, password, Usertype) VALUES ("${custusername}", "${custpass}", "${usertype}")`;


  db.getData(sql, function (err, result) {
    db.getData(userinfoquery, function (err, result) {
      if (err) throw err;
      console.log(result);
      console.log('record inserted');
      res.redirect('/');
    });
  });
});



app.get('/custbuy', function (req, res) {
  var query = "SELECT b.*, m.Medicine_Name, s.Supplier_Name FROM batch b INNER JOIN medicine_information m on b.Medicine_ID = m.ID INNER JOIN supplier s on b.Supplier_ID = s.ID";

  db.getData(query, null, function (rows) {
    var data = {
      user: req.session,
      'batch': rows
    };
    res.render('custhome', data);
  });
});

app.get('/', function (req, res) {
  res.render('view_login', {
    title: 'Login Panel',
    message: '',
    message_type: '',
    errors: ''
  });
});

app.post('/', function (req, res) {


  req.checkBody('username', 'Username is required').notEmpty();
  req.checkBody('password', 'Password is required').notEmpty();

  req.getValidationResult().then(function (result) {
    if (!result.isEmpty()) {
      res.render('view_login', {
        title: 'Login Panel',
        message: '',
        message_type: '',
        errors: result.array(),
        user: req.session.loggedUser,

      });

    } else {
      var user = {
        username: req.body.username,
        password: req.body.password,
        UserType: ''
      }

      var query = "SELECT * FROM user_access WHERE username = ? AND password = ?";
      db.getData(query, [user.username, user.password], function (rows) {
        console.log(rows[0]);
        if (!rows[0]) {
          res.render('view_login', {
            title: 'User Login',
            message: 'Login Failed! Enter Correct Credentials.',
            message_type: 'alert-danger',
            errors: ''
          });
        } else {
          if (rows[0].Usertype == 'Admin') {

            user.UserType = 'Admin';
            req.session.loggedUser = user;

            res.redirect('/admin');

          } else if (rows[0].Usertype == 'Staff') {

            user.UserType = 'Staff';
            req.session.loggedUser = user;

            res.redirect('/admin');

          }
          else if (rows[0].Usertype == 'Customer') {

            user.UserType = 'Customer';
            req.session.loggedUser = user;

            res.redirect('/admin/custmed');

          }

        }
      });

    }

  });

});



app.get('/admin', function (req, res) {

  if (!req.session.loggedUser) {
    res.redirect('/');
    return;
  }

  var connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'pharmacare'
  });

  var totalSell = "select ROUND(SUM(Total_Payable),2) AS sells_count from bill_information";
  var todaySell = "select ROUND(SUM(Total_Payable),2) AS sells_count_today from bill_information where Date = CURDATE()";
  var totalUser = "SELECT COUNT(*) AS users_count FROM user_information";
  var totalBatch = "SELECT COUNT(*) AS batch_count FROM batch";
  var totalMedicine = "SELECT COUNT(*) AS med_count FROM medicine_information";
  var totalSupplier = "SELECT COUNT(*) AS sup_count FROM supplier";
  var totalCategory = "SELECT COUNT(*) AS cat_count FROM category";
  var totalGeneric = "SELECT COUNT(*) AS generic_count FROM drug_generic_name";
  var totalManufac = "SELECT COUNT(*) AS manufac_count FROM manufacturer";

  async.parallel([
    function (callback) {
      connection.query(totalSell, callback)
    },
    function (callback) {
      connection.query(todaySell, callback)
    },
    function (callback) {
      connection.query(totalUser, callback)
    },
    function (callback) {
      connection.query(totalBatch, callback)
    },
    function (callback) {
      connection.query(totalMedicine, callback)
    },
    function (callback) {
      connection.query(totalSupplier, callback)
    },
    function (callback) {
      connection.query(totalCategory, callback)
    },
    function (callback) {
      connection.query(totalGeneric, callback)
    },
    function (callback) {
      connection.query(totalManufac, callback)
    }
  ], function (err, rows) {


    console.log(rows[0][0]);
    console.log(rows[1][0]);
    console.log(rows[2][0]);


    res.render('view_admin', {
      'totalSell': rows[0][0],
      'todaySell': rows[1][0],
      'totalUser': rows[2][0],
      'totalBatch': rows[3][0],
      'totalMedicine': rows[4][0],
      'totalSupplier': rows[5][0],
      'totalCategory': rows[6][0],
      'totalGeneric': rows[7][0],
      'totalManufac': rows[8][0],
      'user': req.session.loggedUser
    });
  });



});



app.use('/admin', admin);


app.listen(5000, function () {
  console.log('server started at port 5000');
});

module.exports = app;