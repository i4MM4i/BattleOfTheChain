import * as WebSocket from 'ws';
import {Server} from 'ws';
import {
    addBlockToChain, Block, getBlockchain, getLatestBlock, handleReceivedTransaction, isValidBlockStructure,
    replaceChain, handleReceivedTransactionVictoryPoints,sendTransaction,generateNextBlock,generatenextBlockWithTransaction,
	getAccountBalance,getAccountBalanceVictoryPoints,sendTransactionVictoryPoints
} from './blockchain';
import {Transaction} from './transaction';
import {isMaster,getP2PPort} from './main';
import {getTransactionPool} from './transactionPool';
import {getTransactionPoolVictoryPoints} from './transactionPoolVictoryPoints';
import {changeKeyToOperateWith, resetKey, getPublicFromWallet} from './wallet'

var userModel = require('../../WEB/models/userModel.js');

const sockets: WebSocket[] = [];

enum MessageType {
    QUERY_LATEST = 0,
    QUERY_ALL = 1,
    RESPONSE_BLOCKCHAIN = 2,
    QUERY_TRANSACTION_POOL = 3,
    RESPONSE_TRANSACTION_POOL = 4,
    QUERY_TRANSACTION_POOL_VICTORY_POINTS = 5,
    RESPONSE_TRANSACTION_POOL_VICTORY_POINTS = 6,
	ADD_PEER = 7,
	SEND_TRANSACTION = 8,
	MINE = 9,
	BALANCE = 10,
	BALANCE_V_POINTS = 11,
	MINE_TRANSACTION = 12,
	BLOCKS = 13,
	SEND_TRANSACTION_VICTORY = 14
	
	
	
}

class Message {
    public type: MessageType;
    public data: any;
}


const respondToWebsite = (message: string) => {
	try{
		const url = 'ws://localhost:4000';
		const connection = new WebSocket(url);			
		connection.onopen = function (event) {
			connection.send(message);
		};
	}
	catch(err){
		console.log(err);
	}

	return;
}


const initP2PServer = (p2pPort: number) => {
    const server: Server = new WebSocket.Server({port: p2pPort});
    server.on('connection', (ws: WebSocket) => {
        initConnection(ws);
    });
    console.log('listening websocket p2p port on: ' + p2pPort);
};

const getSockets = () => sockets;

const initConnection = (ws: WebSocket) => {
    sockets.push(ws);
    initMessageHandler(ws);
    initErrorHandler(ws);
    write(ws, queryChainLengthMsg());

    // query transactions pool only some time after chain query
    setTimeout(() => {
        broadcast(queryTransactionPoolMsg());
    }, 500);
};

const JSONToObject = <T>(data: string): T => {
    try {
        return JSON.parse(data);
    } catch (e) {
        console.log(e);
        return null;
    }
};

const initMessageHandler = (ws: WebSocket) => {
    ws.on('message', (data: string) => {

        try {
            const message: Message = JSONToObject<Message>(data);
            if (message === null) {
                console.log('could not parse received JSON message: ' + data);
                return;
            }
            console.log('Received message: %s', JSON.stringify(message, null, 2));
            switch (message.type) {
					case MessageType.QUERY_LATEST:
						write(ws, responseLatestMsg());
						break;
					case MessageType.QUERY_ALL:
						write(ws, responseChainMsg());
						break;
					case MessageType.RESPONSE_BLOCKCHAIN:
						const receivedBlocks: Block[] = JSONToObject<Block[]>(message.data);
						if (receivedBlocks === null) {
							console.log('invalid blocks received: %s', JSON.stringify(message.data, null, 2));
							break;
						}
						handleBlockchainResponse(receivedBlocks);
						break;
					case MessageType.QUERY_TRANSACTION_POOL:
						write(ws, responseTransactionPoolMsg());
						break;
					case MessageType.QUERY_TRANSACTION_POOL_VICTORY_POINTS:
						write(ws, responseTransactionPoolVictoryPointsMsg());
						break;
					case MessageType.RESPONSE_TRANSACTION_POOL:
						const receivedTransactions: Transaction[] = JSONToObject<Transaction[]>(message.data);
						if (receivedTransactions === null) {
							console.log('invalid transaction received: %s', JSON.stringify(message.data, null, 2));
							break;
						}
						receivedTransactions.forEach((transaction: Transaction) => {
							try {
								handleReceivedTransaction(transaction);
								// if no error is thrown, transaction was indeed added to the pool
								// let's broadcast transaction pool
								broadCastTransactionPool();
							} catch (e) {
								console.log(e.message);
							}
						});
						break;
					case MessageType.RESPONSE_TRANSACTION_POOL_VICTORY_POINTS:
						const receivedTransactionsVictoryPoints: Transaction[] = JSONToObject<Transaction[]>(message.data);
						if (receivedTransactionsVictoryPoints === null) {
							console.log('invalid transaction received: %s', JSON.stringify(message.data, null, 2));
							break;
						}
						receivedTransactionsVictoryPoints.forEach((transaction: Transaction) => {
							try {
								handleReceivedTransactionVictoryPoints(transaction);
								// if no error is thrown, transaction was indeed added to the pool
								// let's broadcast transaction pool
								broadCastTransactionPoolVictoryPoints();
							} catch (e) {
								console.log(e.message);
							}
						});
						break;
					case MessageType.ADD_PEER:
						if(message.data != null){
							var peerToAdd = message.data;
							connectToPeers('ws://localhost:'+peerToAdd);
						}
						break;
						
					case MessageType.SEND_TRANSACTION:
						//console.log("RECEIVED");
						//console.log(message.data.amount);
						try {
							var address = message.data.address;
							var amount = message.data.amount;
							var p_key = message.data.p_key;

							if (address === undefined || amount === undefined || p_key == undefined) {
								throw Error('invalid address or amount or p_key');
							}
							
							changeKeyToOperateWith(p_key);
							var resp = sendTransaction(address, amount);

							//res.send(resp);
							console.log(resp);
						} 
						catch (e) {
							console.log(e.message);
							//res.status(400).send(e.message);
						}	
						resetKey();						
						break
						
					case MessageType.MINE:
						var p_key = message.data.p_key;
						if(p_key != null){
							changeKeyToOperateWith(p_key);
							try{
								const newBlock: Block = generateNextBlock();
								if (newBlock === null) {
									//res.status(400).send('could not generate block');
									console.log('could not generate block');
								} 
								else {
									//res.send(JSON.stringify(newBlock, null, 2)); //JSON.stringify(obj, null, 2);  res.send(newBlock);
									console.log(JSON.stringify(newBlock, null, 2));
									respondToWebsite("BLOCK MINED");
									console.log("BLOCK MINED");
									userModel.findOne({public_key: getPublicFromWallet()}, function (err, user) {
										console.log("we here?");
										if (err) {
											console.log(err);
											return;
										}
										if (!user) {
											console.log("no such user!");
											return;
										}
										
										
										console.log("we here");
										user.email = user.email;
										user.username = user.username;
										user.password = user.password;
										user.cash = user.cash + 50;
										user.v_pts = user.v_pts + 50;
										console.log("we here2");
										user.save(function (err, user) {
											console.log("we here3");
											if (err) {
												console.log(err);
												return;
											}
											console.log("topping up is successfull!");
											return;
										});
									});
								}
							}
							catch(err){
								console.log(err);
							}
							resetKey();
						}
						else{
							console.log("Private key not valid!");
						}

					
						break;
					case MessageType.BALANCE:
						var p_key = message.data.p_key;
						if(p_key != null){
							changeKeyToOperateWith(p_key);
							try{
								const balance: number = getAccountBalance();
								if (balance === null) {
									//res.status(400).send('could not generate block');
									console.log('Could not fetch balance');
								} 
								else {
									//res.send(JSON.stringify(newBlock, null, 2)); //JSON.stringify(obj, null, 2);  res.send(newBlock);
									//console.log(JSON.stringify(newBlock, null, 2));
									console.log("Balance of "+ p_key + " is " + balance);
									respondToWebsite("Balance of "+ p_key + " (me) is " + balance);
									
								}
							}
							catch(err){
								console.log(err);
							}
							resetKey();
						}
						else{
							console.log("Privat key not valid!");
						}						
						break;
					case MessageType.BALANCE_V_POINTS: //multi data
						var p_key = message.data.p_key;
						if(p_key != null){
							changeKeyToOperateWith(p_key);
							try{
								const balance: number = getAccountBalanceVictoryPoints();
								if (balance === null) {
									//res.status(400).send('could not generate block');
									console.log('Could not fetch balance');
								} 
								else {
									//res.send(JSON.stringify(newBlock, null, 2)); //JSON.stringify(obj, null, 2);  res.send(newBlock);
									//console.log(JSON.stringify(newBlock, null, 2));
									console.log("Balance (victory points) of "+ p_key + " is " + balance);
									respondToWebsite("Balance (victory points) of "+ p_key + " is " + balance);
								}
							}
							catch(err){
								console.log(err);
							}
							resetKey();
						}
						else{
							console.log("Privat key not valid!");
						}					
						break;
					
					case MessageType.MINE_TRANSACTION:
						//const resp = generatenextBlockWithTransaction(address, amount);	
						try {
							var address = message.data.address;
							var amount = message.data.amount;
							var p_key = message.data.p_key;

							if (address === undefined || amount === undefined || p_key == undefined) {
								throw Error('invalid address or amount or p_key');
							}
							
							changeKeyToOperateWith(p_key);
							const resp = generatenextBlockWithTransaction(address, amount);

							//res.send(resp);
							//console.log(resp);
							console.log("Transaction mined!");
						} 
						catch (e) {
							console.log(e.message);
							//res.status(400).send(e.message);
						}	
						resetKey();	
						respondToWebsite("Transaction successfull");						
						break;
						
					case MessageType.BLOCKS:
						var p_key = message.data.p_key;
						if(p_key != null){
							changeKeyToOperateWith(p_key);
							try{
								var bcNUM = getBlockchain();
								if (bcNUM === null) {
									//res.status(400).send('could not generate block');
									console.log('Could not fetch blockChain');
								} 
								else {
									console.log(" OR There are " + bcNUM.length + " blocks in the chain");
									respondToWebsite("There are " + bcNUM.length + " blocks in the chain");
									
								}
							}
							catch(err){
								console.log(err);
							}
							resetKey();
						}
						else{
							console.log("Privat key not valid!");
						}	
						break;
						
					case MessageType.SEND_TRANSACTION_VICTORY:
						try {
							var address = message.data.address;
							var amount = message.data.amount;
							var p_key = message.data.p_key;

							if (address === undefined || amount === undefined || p_key == undefined) {
								throw Error('invalid address or amount or p_key');
							}
							
							changeKeyToOperateWith(p_key);
							var resp = sendTransactionVictoryPoints(address, amount);

							//res.send(resp);
							console.log(resp);
						} 
						catch (e) {
							console.log(e.message);
							//res.status(400).send(e.message);
						}	
						resetKey();						
						break					
					}
					
					

				} 
				catch (e) {
					console.log(e);
				}
    });
};

const write = (ws: WebSocket, message: Message): void => ws.send(JSON.stringify(message));
const broadcast = (message: Message): void => sockets.forEach((socket) => write(socket, message));

const queryChainLengthMsg = (): Message => ({'type': MessageType.QUERY_LATEST, 'data': null});

const queryAllMsg = (): Message => ({'type': MessageType.QUERY_ALL, 'data': null});

const responseChainMsg = (): Message => ({
    'type': MessageType.RESPONSE_BLOCKCHAIN, 'data': JSON.stringify(getBlockchain())
});

const responseLatestMsg = (): Message => ({
    'type': MessageType.RESPONSE_BLOCKCHAIN,
    'data': JSON.stringify([getLatestBlock()])
});

const queryTransactionPoolMsg = (): Message => ({
    'type': MessageType.QUERY_TRANSACTION_POOL,
    'data': null
});

const queryTransactionPoolVictoryPointsMsg = (): Message => ({
    'type': MessageType.QUERY_TRANSACTION_POOL_VICTORY_POINTS,
    'data': null
});

const responseTransactionPoolMsg = (): Message => ({
    'type': MessageType.RESPONSE_TRANSACTION_POOL,
    'data': JSON.stringify(getTransactionPool())
});

const responseTransactionPoolVictoryPointsMsg = (): Message => ({
    'type': MessageType.RESPONSE_TRANSACTION_POOL_VICTORY_POINTS,
    'data': JSON.stringify(getTransactionPoolVictoryPoints())
});

const initErrorHandler = (ws: WebSocket) => {
    const closeConnection = (myWs: WebSocket) => {
        console.log('connection failed to peer: ' + myWs.url);
        sockets.splice(sockets.indexOf(myWs), 1);
    };
    ws.on('close', () => closeConnection(ws));
    ws.on('error', () => closeConnection(ws));
};

const handleBlockchainResponse = (receivedBlocks: Block[]) => {
    if (receivedBlocks.length === 0) {
        console.log('received block chain size of 0');
        return;
    }
    const latestBlockReceived: Block = receivedBlocks[receivedBlocks.length - 1];
    if (!isValidBlockStructure(latestBlockReceived)) {
        console.log('block structuture not valid');
        return;
    }
    const latestBlockHeld: Block = getLatestBlock();
    if (latestBlockReceived.index > latestBlockHeld.index) {
        console.log('blockchain possibly behind. We got: '
            + latestBlockHeld.index + ' Peer got: ' + latestBlockReceived.index);
        if (latestBlockHeld.hash === latestBlockReceived.previousHash) {
            if (addBlockToChain(latestBlockReceived)) {
                broadcast(responseLatestMsg());
            }
        } else if (receivedBlocks.length === 1) {
            console.log('We have to query the chain from our peer');
            broadcast(queryAllMsg());
        } else {
            console.log('Received blockchain is longer than current blockchain');
            replaceChain(receivedBlocks);
        }
    } else {
        console.log('received blockchain is not longer than received blockchain. Do nothing');
    }
};

const broadcastLatest = (): void => {
    broadcast(responseLatestMsg());
};

const connectToPeers = (newPeer: string): void => {
    const ws: WebSocket = new WebSocket(newPeer);
    ws.on('open', () => {
        initConnection(ws);
    });
    ws.on('error', () => {
        console.log('connection failed');
    });
};

const broadCastTransactionPool = () => {
    broadcast(responseTransactionPoolMsg());
};

const broadCastTransactionPoolVictoryPoints = () => {
    broadcast(responseTransactionPoolVictoryPointsMsg());
};



// var masterSocket = new WebSocket('ws://localhost:3001');
// function addToNetwork(){
		// var peerObj = { 
			// type: 7,
			// data: "ws://localhost:"+getP2PPort(),
		// };
		// if(isMaster() == false){
			// write(masterSocket, peerObj);
		// }
		// console.log("Connected to peer 3001!");
		
		// //console.log(peerObj.peer);
// }















export {connectToPeers, broadcastLatest, broadCastTransactionPool, initP2PServer, getSockets, broadCastTransactionPoolVictoryPoints, write};
