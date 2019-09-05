var userModel = require('../models/userModel.js');
var entryModel = require('../models/entryModel.js');
var consoleModel = require('../models/photoModel.js');

var passwordHash = require('password-hash');
//var bcrypt = require('bcrypt');
const secureRandom = require('secure-random');
var EC = require('elliptic').ec;
var FS = require('fs');
const WebSocket = require('ws');
var mkdirp = require('mkdirp');

/**
 * userController.js
 *
 * @description :: Server-side logic for managing users.
 */
 
 
const ec = new EC('secp256k1');
//const privateKeyLocation = process.env.PRIVATE_KEY || 'node/wallet/private_key';
var privateKeyLocation = '';// = privateKeyFolders;

//TODO




// function getPrivateFromWallet(){	
	// const buffer = FS.readFileSync(privateKeyLocation, 'utf8');
    // return buffer.toString();
// }

// function getPublicFromWallet(){
    // const privateKey = getPrivateFromWallet();
    // const key = ec.keyFromPrivate(privateKey, 'hex');
    // return key.getPublic().encode('hex');
// };

function getPrivateFromWallet(uname){	
	const buffer = FS.readFileSync('node/wallet/'+uname+'/private_key', 'utf8');
    return buffer.toString();
}

function getPublicFromWallet(uname){
    const privateKey = getPrivateFromWallet(uname);
    const key = ec.keyFromPrivate(privateKey, 'hex');
    return key.getPublic().encode('hex');
};

function generatePrivateKey(){
    const keyPair = ec.genKeyPair();
    const privateKey = keyPair.getPrivate();
    return privateKey.toString(16);
};


function initWallet(){
    // let's not override existing private keys
    if (FS.existsSync(privateKeyHierarchy)) {
        console.log("You already have a private key, so none created");
        return;
    }
    const newPrivateKey = generatePrivateKey();

	console.log("creating private key");
    FS.writeFileSync(privateKeyHierarchy, newPrivateKey);
    console.log('new wallet with private key created to : %s', privateKeyHierarchy);
	

};


function initWalletNew(username){
	console.log("tu smo");
	if (FS.existsSync('node/wallet/'+username+'/private_key')) {
        console.log("You already have a private key, so none created");
        return;
    }
    const newPrivateKey = generatePrivateKey();
		mkdirp('node/wallet/'+username, function(err) { 
		console.log("Creating new directory and key...");//PUSTI TA IZPIS KER NE KREIRA KEYA BREZ NJEGA (BUG)
		
		const path = 'node/wallet/'+username+'/private_key';
		FS.writeFileSync('node/wallet/'+username+'/private_key', newPrivateKey);
		console.log('new wallet with private key created to : %s', 'node/wallet/'+username+'/private_key');
		
		privateKeyLocation = 'node/wallet/'+username+'/private_key';
	});
	console.log("exited function");
	return true;

}

function deleteWallet(){
    if (FS.existsSync(privateKeyLocation)) {
        FS.unlinkSync(privateKeyLocation);
    }
};



module.exports = {

    /**
     * userController.list()
     */
    list: function (req, res) {
        userModel.find(function (err, users) {
            if (err) {
                return res.status(500).json({
                    message: 'Error when getting user.',
                    error: err
                });
            }
            return res.json(users);
        });
    },

    /**
     * userController.show()
     */
    show: function (req, res) {
        var id = req.params.id;
        userModel.findOne({_id: id}, function (err, user) {
            if (err) {
                return res.status(500).json({
                    message: 'Error when getting user.',
                    error: err
                });
            }
            if (!user) {
                return res.status(404).json({
                    message: 'No such user'
                });
            }
            return res.json(user);
        });
    },

	indexPage: function(req,res){
		return res.render('user/index');
	},

	showMarket: function(req,res){
		userModel.findById(req.session.userId).exec(function (error, user) {
			  if (error) {
				return next(error);
			  } 
			  else {
				if (user === null) {
					var err = new Error('Not authorized! Go back!');
					err.status = 400;
					//return next(err);
					res.redirect('/users/login');
				} else {
					res.render('user/market', user);
				}
			  }
		});
	},
	
	
	mine: function(req,res){//TODO amount?
		var port = req.body.socket;
		if(port == ""){
			port = 6001;
		}
		var object = {
			'type' : 9,
			'data' : {
				'p_key' : getPrivateFromWallet(req.session.username)
			}
		};
		const url = 'ws://localhost:'+port;
		try{
			const connection = new WebSocket(url);			
			connection.onopen = function (event) {
				connection.send(JSON.stringify(object));
			};
		}
		catch(err){
			console.log("Socket not working ("+port+")")
		}
		res.redirect('/users/receive');
	},
	
	getBalance: function(req,res){
		//console.log("getBalance");
		var port = req.body.socket;
		if(port == ""){
			port = 6001;
		}
		var object = {
			'type' : 10,
			'data' : {
				'p_key' : getPrivateFromWallet(req.session.username)
			}
		};
		const url = 'ws://localhost:'+port;
		try{
			const connection = new WebSocket(url);			
			connection.onopen = function (event) {
				connection.send(JSON.stringify(object));
			};
		}
		catch(err){
			console.log("Socket not working ("+port+")")
		}
		res.redirect('/users/receive');
	},
	
	getBalanceVictory: function(req,res){
		//console.log("getBalanceVictory");
		var port = req.body.socket;
		if(port == ""){
			port = 6001;
		}
		var object = {
			'type' : 11,
			'data' : {
				'p_key' : getPrivateFromWallet(req.session.username)
			}
		};
		const url = 'ws://localhost:'+port;
		try{
			const connection = new WebSocket(url);			
			connection.onopen = function (event) {
				connection.send(JSON.stringify(object));
			};
		}
		catch(err){
			console.log("Socket not working ("+port+")")
		}
		res.redirect('/users/receive');
	},
	
	mineTransaction: function(req,res){
		var port = req.body.socket;
		var addr = req.body.address;
		var amount = req.body.amount;
		if(port == "" || addr == "" || amount == ""){
			console.log("Expected data is incorrect!");
			return;
		}
		var object = {
			'type' : 12,
			'data' : {
				'p_key' : getPrivateFromWallet(req.session.username),
				'address' : addr,
				'amount' : amount
			}
		};
		const url = 'ws://localhost:'+port;
		try{
			const connection = new WebSocket(url);			
			connection.onopen = function (event) {
				connection.send(JSON.stringify(object));
			};
		}
		catch(err){
			console.log("Socket not working ("+port+")")
		}
		res.redirect('/users/receive');	
	},
	
	blocks: function(req, res){
		var port = req.body.socket;
		if(port == ""){
			port = 6001;
		}
		var object = {
			'type' : 13,
			'data' : {
				'p_key' : getPrivateFromWallet(req.session.username)
			}
		};
		const url = 'ws://localhost:'+port;
		try{
			const connection = new WebSocket(url);			
			connection.onopen = function (event) {
				connection.send(JSON.stringify(object));
			};
		}
		catch(err){
			console.log("Socket not working ("+port+")")
		}
		res.redirect('/users/receive');
	},

	sendShow: function(req,res){
		return res.render('user/send');
	},
	receiveShow: function(req,res){
		userModel.findById(req.session.userId).exec(function (error, user) {
			  if (error) {
				return next(error);
			  } 
			  else {
				if (user === null) {
					var err = new Error('Not authorized! Go back!');
					err.status = 400;
					//return next(err);
					res.redirect('/users/login');
				} else {
						return res.render('user/receive', user);
				}
			  }
		});
		
	},

    /**
     * userController.create()
     */
    create: function (req, res) {

		var uname = req.body.username;

		initWalletNew(uname);
		
		
		var hashedPassword = passwordHash.generate(req.body.password);
		
		//privateKeyHierarchy='/node/wallet/private_key';
		
		function stateChange(newState) {
			setTimeout(function () {
				
			}, 2000);
		}
		
		setTimeout(function(){ 
			pkey = getPublicFromWallet(uname); 

				var user = new userModel({
					email : req.body.email,
					username : uname,
					password : hashedPassword,
					public_key : pkey,
					//private_key : getPrivateFromWallet(),
					cash : 1000,
					v_pts : 1000

				});

				user.save(function (err, user) {
					if (err) {
						return res.status(500).json({
							message: 'Error when creating user',
							error: err
						});
					}
					
					//initWallet();
					return res.redirect('users/login');
					//return res.status(201).json(user);
				});
					
			
			
			}, 3000);
				
		//})
				
		
		
		

    },
    /**
     * userController.login()
     */
    showLogin: function (req, res) {
         res.render('user/login');
    }
    ,
	loginPage: function (req, res) {
         res.render('/users/login');
    },
    showRegister: function (req, res) {
        res.render('user/register');
    },
	
    login: function (req, res,next) {
		
		userModel.findOne({ username: req.body.username }).exec(function (err, user) {
		  if (err) {
			//return callback(err)
			next(err);
		  } 
		  else if (!user) {
			var err = new Error('User not found.');
			err.status = 401;
			return next(err);
		  }
		  initWalletNew(req.body.username);
		  
		  //privateKeyHierarchy=privateKeyFolders+req.body.username+'/private_key';
		  
		  if(passwordHash.verify(req.body.password, user.password)){
			  req.session.userId = user._id;
			  req.session.username = user.username;
			  //initWallet();
			  return res.redirect('/users/market'); 
		  }
		  else{
			var err = new Error('Wrong username or password');
			err.status = 401;
			return next(err);
		  }	  
		  
		});

	},
    /**
     * userController.login()
     */

    logout: function (req, res,next) {
		if (req.session) {
    // delete session object
			req.session.destroy(function (err) {
				  if (err) {
					return next(err);
				  } 
				  else {
						consoleModel.deleteMany(function (err, photo) {
							if (err) {
								console.log("Error logging out");
								return;
							}
						});				  

						return res.redirect('/');
				  }
			});
		}
	},
        /**
     * userController.profil()
     */

    profile: function (req, res,next) {
		userModel.findById(req.session.userId).exec(function (error, user) {
		if (error) {
			return next(error);
		} 
		else {
			if (user === null) {
				var err = new Error('Not authorized! Go back!');
				err.status = 400;
			  //return next(err);
				res.redirect('/users/login');
			} 
			else {
			  res.render('user/profile', user);
			}
		}
		});
	},
    /**
     * userController.update()
     */
    update: function (req, res) {
        var id = req.params.id;
        userModel.findOne({_id: id}, function (err, user) {
            if (err) {
                return res.status(500).json({
                    message: 'Error when getting user',
                    error: err
                });
            }
            if (!user) {
                return res.status(404).json({
                    message: 'No such user'
                });
            }

            user.email = req.body.email ? req.body.email : user.email;
			user.username = req.body.username ? req.body.username : user.username;
			user.password = req.body.password ? req.body.password : user.password;
			user.cash = req.body.cash ? req.body.cash : user.cash;
			user.v_pts = req.body.v_pts ? req.body.v_pts : user.v_pts;
			
            user.save(function (err, user) {
                if (err) {
                    return res.status(500).json({
                        message: 'Error when updating user.',
                        error: err
                    });
                }

                return res.json(user);
            });
        });
    },

    /**
     * userController.remove()
     */
    remove: function (req, res) {
        var id = req.params.id;
        userModel.findByIdAndRemove(id, function (err, user) {
            if (err) {
                return res.status(500).json({
                    message: 'Error when deleting the user.',
                    error: err
                });
            }
            return res.status(204).json();
        });
    }
	

	
	// testTransaction: function(req, res){
		// var object = {
			// 'type' : 8,
			// 'data' : {
				// 'address' : "04bfcab8722991ae774db48f934ca79cfb7dd991229153b9f732ba5334aafcd8e7266e47076996b55a14bf9913ee3145ce0cfc1372ada8ada74bd287450313534b",
				// 'amount' : 35
			// }
		// };
		// const url = 'ws://localhost:6001';
		// const connection = new WebSocket(url);			
		// connection.onopen = function (event) {
			// connection.send(JSON.stringify(object));
		// };
			
		// //console.log("shit sent");
		
	// },

	
	
	
};
