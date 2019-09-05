var entryModel = require('../models/entryModel.js');
var userModel = require('../models/userModel.js');
var WebSocket = require('ws');

var EC = require('elliptic').ec;
var FS = require('fs');


const ec = new EC('secp256k1');



function getPrivateFromWallet(uname){	
	const buffer = FS.readFileSync('node/wallet/'+uname+'/private_key', 'utf8');
    return buffer.toString();
}

function getPublicFromWallet(uname){
    const privateKey = getPrivateFromWallet(uname);
    const key = ec.keyFromPrivate(privateKey, 'hex');
    return key.getPublic().encode('hex');
};


/**
 * entryController.js
 *
 * @description :: Server-side logic for managing entrys.
 */
module.exports = {

    /**
     * entryController.list()
     */
    list: function (req, res) {
        entryModel.find(function (err, entrys) {
            if (err) {
                return res.status(500).json({
                    message: 'Error when getting entry.',
                    error: err
                });
            }
            //return res.json(entrys);
			res.render('entry/list', entrys);
        });
    },
	
	listGraph: function(req,res){
        entryModel.find(function (err, entrys) {
            if (err) {
				console.log(err);
				return;
            }
            //return res.json(entrys);
			res.render('user/graph',entrys);
        });		
	},
	
	
	testTransaction: function(req, res){
		var object = {
			'type' : 8,
			'data' : {
				'address' : "04bfcab8722991ae774db48f934ca79cfb7dd991229153b9f732ba5334aafcd8e7266e47076996b55a14bf9913ee3145ce0cfc1372ada8ada74bd287450313534b",
				'amount' : 35
			}
		};
		const url = 'ws://localhost:6001';
		const connection = new WebSocket(url);			
		connection.onopen = function (event) {
			connection.send(JSON.stringify(object));
		};
			
		//console.log("shit sent");
		
	},
	

	
	
	
	
	trade: function (req, res){
		var id = req.body.offer;
		entryModel.findOne({_id: id}, function (err, entry) {
            if (err) {
                return res.status(500).json({
                    message: 'Error when getting entry.',
                    error: err
                });
            }
            if (!entry) {
                return res.status(404).json({
                    message: 'No such entry'
                });
            }
            //return res.json(entry);
			//found specific entry, result is entry
			var user_id = req.session.userId;
			userModel.findOne({_id: user_id}, function (err, user) {
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
				//return res.json(user);
				//found myself, result is user
				
				if(entry.buy_sell == "sell"){//session bo kupil nekaj
					if(user.cash >= entry.price){//ma dovol dnarja, sessionu amount of item, -cash, drugemu userju + cash, -amount of item
						userModel.findOne({_id: entry.user_id}, function (err, user2) {
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
							//ce ma user2 dovol enot se preverja ze na uploadu entrija tak da ni panike
							//return res.json(user2);
							//found seller/buyer, result is user2
							
							//user == session, user2 == entry owner
							var pwd = user.password;
							
							user.email = user.email;
							user.username = user.username;
							user.password = pwd;
							user.cash = user.cash - entry.price;
							user.v_pts = user.v_pts + entry.amount;//TODO ni nujno da v_pts
							
							user.save(function (err, user) {
								if (err) {
									return res.status(500).json({
										message: 'Error when updating user.',
										error: err
									});
								}
								
								pwd = user2.password;
								
								user2.email = user2.email;
								user2.username = user2.username;
								user2.password = pwd;
								user2.cash = user2.cash + entry.price;
								user2.v_pts = user2.v_pts - entry.amount;//TODO ni nujno da v_pts
								
								user2.save(function (err, user2) {
									if (err) {
										return res.status(500).json({
											message: 'Error when updating user.',
											error: err
										});
									}

									entryModel.findOneAndDelete(entry._id, function (err, entry) {
										if (err) {
											return res.status(500).json({
												message: 'Error when deleting the entry.',
												error: err
											});
										}
										//REDIRECT MAYBE?
										
										var numF = parseInt(req.body.price);
										numF = -numF; //TODO V ELSU ISTO ZA numS
										console.log("numF: "+numF);
										var objectF = {
											'type' : 12,
											'data' : {
												'address' : req.body.address,
												'amount' : numF,
												'p_key' : getPrivateFromWallet(req.session.username)
											}
										};
										var numS = parseInt(req.body.amount);
										console.log("numS: "+numS);
										var objectS = {
											'type' : 14,
											'data' : {
												'address' : req.body.address,
												'amount' : numS,
												'p_key' : getPrivateFromWallet(req.session.username)
											}
										};
										const url = 'ws://localhost:6001';
										const connection = new WebSocket(url);			
										connection.onopen = function (event) {
											connection.send(JSON.stringify(objectF));
											connection.send(JSON.stringify(objectS));
										};
										res.redirect("/users/market");
									});
								});
							});
						});	
					}
				}
				else{//session bo prodal nekaj
					if(user.v_pts >= entry.amount){//ma dovol dnarja, sessionu amount of item, -cash, drugemu userju + cash, -amount of item
						userModel.findOne({_id: entry.user_id}, function (err, user2) {
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
							//ce ma user2 dovol enot se preverja ze na uploadu entrija tak da ni panike
							//return res.json(user2);
							//found seller/buyer, result is user2
							
							//user == session, user2 == entry owner
							var pwd = user.password;
							
							user.email = user.email;
							user.username = user.username;
							user.password = pwd;
							user.cash = user.cash + entry.price;
							user.v_pts = user.v_pts - entry.amount;//TODO ni nujno da v_pts
							
							user.save(function (err, user) {
								if (err) {
									return res.status(500).json({
										message: 'Error when updating user.',
										error: err
									});
								}
								
								pwd = user2.password;
								
								user2.email = user2.email;
								user2.username = user2.username;
								user2.password = pwd;
								user2.cash = user2.cash - entry.price;
								user2.v_pts = user2.v_pts + entry.amount;//TODO ni nujno da v_pts
								
								user2.save(function (err, user2) {
									if (err) {
										return res.status(500).json({
											message: 'Error when updating user.',
											error: err
										});
									}

									//return res.json(user);
									//console.log("SUCCESS");
									//USPESNO TREJDANO
									//NEED TO DELETE ENTRY
									//var id = req.params.id;
									entryModel.findOneAndDelete(entry._id, function (err, entry) {
										if (err) {
											return res.status(500).json({
												message: 'Error when deleting the entry.',
												error: err
											});
										}
										var object = {
											'type' : 8,
											'data' : {
												'address' : req.body.address,
												'amount' : req.body.amount,
												'p_key' : getPrivateFromWallet(req.session.username)
											}
										};
										const url = 'ws://localhost:6001';
										const connection = new WebSocket(url);			
										connection.onopen = function (event) {
											connection.send(JSON.stringify(object));
										};										
										//REDIRECT MAYBE?
										res.redirect("/users/market");
									});
								});
							});
						});	
					}					
				
				}
			});
        });
	},

    /**
     * entryController.show()
     */
    show: function (req, res) {
        var id = req.params.id;
        entryModel.findOne({_id: id}, function (err, entry) {
            if (err) {
                return res.status(500).json({
                    message: 'Error when getting entry.',
                    error: err
                });
            }
            if (!entry) {
                return res.status(404).json({
                    message: 'No such entry'
                });
            }
            return res.json(entry);
        });
    },

    /**
     * entryController.create()
     */
    create: function (req, res) {
		
		var b_s;
		if(req.body.buy_sell == true){
			b_s = "buy";
		}
		else{
			b_s = "sell";
		}
		
		var timestamp = new Date();
        var entry = new entryModel({
			currency : req.body.currency,
			amount : req.body.amount,
			user : req.body.user,
			user_id : req.body.user_id,
			user_public : getPublicFromWallet(req.session.username),
			buy_sell : b_s,
			price : req.body.price,
			time : timestamp

        });

        entry.save(function (err, entry) {
            if (err) {
                return res.status(500).json({
                    message: 'Error when creating entry',
                    error: err
                });
            }
            //return res.status(201).json(entry);
			res.redirect("/users/market")
        });
		
    },

    /**
     * entryController.update()
     */
    update: function (req, res) {
        var id = req.params.id;
        entryModel.findOne({_id: id}, function (err, entry) {
            if (err) {
                return res.status(500).json({
                    message: 'Error when getting entry',
                    error: err
                });
            }
            if (!entry) {
                return res.status(404).json({
                    message: 'No such entry'
                });
            }

            entry.currency = req.body.currency ? req.body.currency : entry.currency;
			entry.amount = req.body.amount ? req.body.amount : entry.amount;
			entry.user = req.body.user ? req.body.user : entry.user;
			entry.user_id = req.body.user_id ? req.body.user_id : entry.user_id;
			entry.buy_sell = req.body.buy_sell ? req.body.buy_sell : entry.buy_sell;
			entry.price = req.body.price ? req.body.price : entry.price;
			entry.time = req.body.time ? req.body.time : entry.time;
			
            entry.save(function (err, entry) {
                if (err) {
                    return res.status(500).json({
                        message: 'Error when updating entry.',
                        error: err
                    });
                }

                return res.json(entry);
            });
        });
    },

    /**
     * entryController.remove()
     */
    remove: function (req, res) {
        var id = req.params.id;
        entryModel.findByIdAndRemove(id, function (err, entry) {
            if (err) {
                return res.status(500).json({
                    message: 'Error when deleting the entry.',
                    error: err
                });
            }
            return res.status(204).json();
        });
    }
};
