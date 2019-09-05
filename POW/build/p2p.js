"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const WebSocket = require("ws");
const blockchain_1 = require("./blockchain");
const transactionPool_1 = require("./transactionPool");
const transactionPoolVictoryPoints_1 = require("./transactionPoolVictoryPoints");
const wallet_1 = require("./wallet");
var userModel = require('../../WEB/models/userModel.js');
const sockets = [];
var MessageType;
(function (MessageType) {
    MessageType[MessageType["QUERY_LATEST"] = 0] = "QUERY_LATEST";
    MessageType[MessageType["QUERY_ALL"] = 1] = "QUERY_ALL";
    MessageType[MessageType["RESPONSE_BLOCKCHAIN"] = 2] = "RESPONSE_BLOCKCHAIN";
    MessageType[MessageType["QUERY_TRANSACTION_POOL"] = 3] = "QUERY_TRANSACTION_POOL";
    MessageType[MessageType["RESPONSE_TRANSACTION_POOL"] = 4] = "RESPONSE_TRANSACTION_POOL";
    MessageType[MessageType["QUERY_TRANSACTION_POOL_VICTORY_POINTS"] = 5] = "QUERY_TRANSACTION_POOL_VICTORY_POINTS";
    MessageType[MessageType["RESPONSE_TRANSACTION_POOL_VICTORY_POINTS"] = 6] = "RESPONSE_TRANSACTION_POOL_VICTORY_POINTS";
    MessageType[MessageType["ADD_PEER"] = 7] = "ADD_PEER";
    MessageType[MessageType["SEND_TRANSACTION"] = 8] = "SEND_TRANSACTION";
    MessageType[MessageType["MINE"] = 9] = "MINE";
    MessageType[MessageType["BALANCE"] = 10] = "BALANCE";
    MessageType[MessageType["BALANCE_V_POINTS"] = 11] = "BALANCE_V_POINTS";
    MessageType[MessageType["MINE_TRANSACTION"] = 12] = "MINE_TRANSACTION";
    MessageType[MessageType["BLOCKS"] = 13] = "BLOCKS";
    MessageType[MessageType["SEND_TRANSACTION_VICTORY"] = 14] = "SEND_TRANSACTION_VICTORY";
})(MessageType || (MessageType = {}));
class Message {
}
const respondToWebsite = (message) => {
    try {
        const url = 'ws://localhost:4000';
        const connection = new WebSocket(url);
        connection.onopen = function (event) {
            connection.send(message);
        };
    }
    catch (err) {
        console.log(err);
    }
    return;
};
const initP2PServer = (p2pPort) => {
    const server = new WebSocket.Server({ port: p2pPort });
    server.on('connection', (ws) => {
        initConnection(ws);
    });
    console.log('listening websocket p2p port on: ' + p2pPort);
};
exports.initP2PServer = initP2PServer;
const getSockets = () => sockets;
exports.getSockets = getSockets;
const initConnection = (ws) => {
    sockets.push(ws);
    initMessageHandler(ws);
    initErrorHandler(ws);
    write(ws, queryChainLengthMsg());
    // query transactions pool only some time after chain query
    setTimeout(() => {
        broadcast(queryTransactionPoolMsg());
    }, 500);
};
const JSONToObject = (data) => {
    try {
        return JSON.parse(data);
    }
    catch (e) {
        console.log(e);
        return null;
    }
};
const initMessageHandler = (ws) => {
    ws.on('message', (data) => {
        try {
            const message = JSONToObject(data);
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
                    const receivedBlocks = JSONToObject(message.data);
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
                    const receivedTransactions = JSONToObject(message.data);
                    if (receivedTransactions === null) {
                        console.log('invalid transaction received: %s', JSON.stringify(message.data, null, 2));
                        break;
                    }
                    receivedTransactions.forEach((transaction) => {
                        try {
                            blockchain_1.handleReceivedTransaction(transaction);
                            // if no error is thrown, transaction was indeed added to the pool
                            // let's broadcast transaction pool
                            broadCastTransactionPool();
                        }
                        catch (e) {
                            console.log(e.message);
                        }
                    });
                    break;
                case MessageType.RESPONSE_TRANSACTION_POOL_VICTORY_POINTS:
                    const receivedTransactionsVictoryPoints = JSONToObject(message.data);
                    if (receivedTransactionsVictoryPoints === null) {
                        console.log('invalid transaction received: %s', JSON.stringify(message.data, null, 2));
                        break;
                    }
                    receivedTransactionsVictoryPoints.forEach((transaction) => {
                        try {
                            blockchain_1.handleReceivedTransactionVictoryPoints(transaction);
                            // if no error is thrown, transaction was indeed added to the pool
                            // let's broadcast transaction pool
                            broadCastTransactionPoolVictoryPoints();
                        }
                        catch (e) {
                            console.log(e.message);
                        }
                    });
                    break;
                case MessageType.ADD_PEER:
                    if (message.data != null) {
                        var peerToAdd = message.data;
                        connectToPeers('ws://localhost:' + peerToAdd);
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
                        wallet_1.changeKeyToOperateWith(p_key);
                        var resp = blockchain_1.sendTransaction(address, amount);
                        //res.send(resp);
                        console.log(resp);
                    }
                    catch (e) {
                        console.log(e.message);
                        //res.status(400).send(e.message);
                    }
                    wallet_1.resetKey();
                    break;
                case MessageType.MINE:
                    var p_key = message.data.p_key;
                    if (p_key != null) {
                        wallet_1.changeKeyToOperateWith(p_key);
                        try {
                            const newBlock = blockchain_1.generateNextBlock();
                            if (newBlock === null) {
                                //res.status(400).send('could not generate block');
                                console.log('could not generate block');
                            }
                            else {
                                //res.send(JSON.stringify(newBlock, null, 2)); //JSON.stringify(obj, null, 2);  res.send(newBlock);
                                console.log(JSON.stringify(newBlock, null, 2));
                                respondToWebsite("BLOCK MINED");
                                console.log("BLOCK MINED");
                                userModel.findOne({ public_key: wallet_1.getPublicFromWallet() }, function (err, user) {
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
                        catch (err) {
                            console.log(err);
                        }
                        wallet_1.resetKey();
                    }
                    else {
                        console.log("Private key not valid!");
                    }
                    break;
                case MessageType.BALANCE:
                    var p_key = message.data.p_key;
                    if (p_key != null) {
                        wallet_1.changeKeyToOperateWith(p_key);
                        try {
                            const balance = blockchain_1.getAccountBalance();
                            if (balance === null) {
                                //res.status(400).send('could not generate block');
                                console.log('Could not fetch balance');
                            }
                            else {
                                //res.send(JSON.stringify(newBlock, null, 2)); //JSON.stringify(obj, null, 2);  res.send(newBlock);
                                //console.log(JSON.stringify(newBlock, null, 2));
                                console.log("Balance of " + p_key + " is " + balance);
                                respondToWebsite("Balance of " + p_key + " (me) is " + balance);
                            }
                        }
                        catch (err) {
                            console.log(err);
                        }
                        wallet_1.resetKey();
                    }
                    else {
                        console.log("Privat key not valid!");
                    }
                    break;
                case MessageType.BALANCE_V_POINTS://multi data
                    var p_key = message.data.p_key;
                    if (p_key != null) {
                        wallet_1.changeKeyToOperateWith(p_key);
                        try {
                            const balance = blockchain_1.getAccountBalanceVictoryPoints();
                            if (balance === null) {
                                //res.status(400).send('could not generate block');
                                console.log('Could not fetch balance');
                            }
                            else {
                                //res.send(JSON.stringify(newBlock, null, 2)); //JSON.stringify(obj, null, 2);  res.send(newBlock);
                                //console.log(JSON.stringify(newBlock, null, 2));
                                console.log("Balance (victory points) of " + p_key + " is " + balance);
                                respondToWebsite("Balance (victory points) of " + p_key + " is " + balance);
                            }
                        }
                        catch (err) {
                            console.log(err);
                        }
                        wallet_1.resetKey();
                    }
                    else {
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
                        wallet_1.changeKeyToOperateWith(p_key);
                        const resp = blockchain_1.generatenextBlockWithTransaction(address, amount);
                        //res.send(resp);
                        //console.log(resp);
                        console.log("Transaction mined!");
                    }
                    catch (e) {
                        console.log(e.message);
                        //res.status(400).send(e.message);
                    }
                    wallet_1.resetKey();
                    respondToWebsite("Transaction successfull");
                    break;
                case MessageType.BLOCKS:
                    var p_key = message.data.p_key;
                    if (p_key != null) {
                        wallet_1.changeKeyToOperateWith(p_key);
                        try {
                            var bcNUM = blockchain_1.getBlockchain();
                            if (bcNUM === null) {
                                //res.status(400).send('could not generate block');
                                console.log('Could not fetch blockChain');
                            }
                            else {
                                console.log(" OR There are " + bcNUM.length + " blocks in the chain");
                                respondToWebsite("There are " + bcNUM.length + " blocks in the chain");
                            }
                        }
                        catch (err) {
                            console.log(err);
                        }
                        wallet_1.resetKey();
                    }
                    else {
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
                        wallet_1.changeKeyToOperateWith(p_key);
                        var resp = blockchain_1.sendTransactionVictoryPoints(address, amount);
                        //res.send(resp);
                        console.log(resp);
                    }
                    catch (e) {
                        console.log(e.message);
                        //res.status(400).send(e.message);
                    }
                    wallet_1.resetKey();
                    break;
            }
        }
        catch (e) {
            console.log(e);
        }
    });
};
const write = (ws, message) => ws.send(JSON.stringify(message));
exports.write = write;
const broadcast = (message) => sockets.forEach((socket) => write(socket, message));
const queryChainLengthMsg = () => ({ 'type': MessageType.QUERY_LATEST, 'data': null });
const queryAllMsg = () => ({ 'type': MessageType.QUERY_ALL, 'data': null });
const responseChainMsg = () => ({
    'type': MessageType.RESPONSE_BLOCKCHAIN, 'data': JSON.stringify(blockchain_1.getBlockchain())
});
const responseLatestMsg = () => ({
    'type': MessageType.RESPONSE_BLOCKCHAIN,
    'data': JSON.stringify([blockchain_1.getLatestBlock()])
});
const queryTransactionPoolMsg = () => ({
    'type': MessageType.QUERY_TRANSACTION_POOL,
    'data': null
});
const queryTransactionPoolVictoryPointsMsg = () => ({
    'type': MessageType.QUERY_TRANSACTION_POOL_VICTORY_POINTS,
    'data': null
});
const responseTransactionPoolMsg = () => ({
    'type': MessageType.RESPONSE_TRANSACTION_POOL,
    'data': JSON.stringify(transactionPool_1.getTransactionPool())
});
const responseTransactionPoolVictoryPointsMsg = () => ({
    'type': MessageType.RESPONSE_TRANSACTION_POOL_VICTORY_POINTS,
    'data': JSON.stringify(transactionPoolVictoryPoints_1.getTransactionPoolVictoryPoints())
});
const initErrorHandler = (ws) => {
    const closeConnection = (myWs) => {
        console.log('connection failed to peer: ' + myWs.url);
        sockets.splice(sockets.indexOf(myWs), 1);
    };
    ws.on('close', () => closeConnection(ws));
    ws.on('error', () => closeConnection(ws));
};
const handleBlockchainResponse = (receivedBlocks) => {
    if (receivedBlocks.length === 0) {
        console.log('received block chain size of 0');
        return;
    }
    const latestBlockReceived = receivedBlocks[receivedBlocks.length - 1];
    if (!blockchain_1.isValidBlockStructure(latestBlockReceived)) {
        console.log('block structuture not valid');
        return;
    }
    const latestBlockHeld = blockchain_1.getLatestBlock();
    if (latestBlockReceived.index > latestBlockHeld.index) {
        console.log('blockchain possibly behind. We got: '
            + latestBlockHeld.index + ' Peer got: ' + latestBlockReceived.index);
        if (latestBlockHeld.hash === latestBlockReceived.previousHash) {
            if (blockchain_1.addBlockToChain(latestBlockReceived)) {
                broadcast(responseLatestMsg());
            }
        }
        else if (receivedBlocks.length === 1) {
            console.log('We have to query the chain from our peer');
            broadcast(queryAllMsg());
        }
        else {
            console.log('Received blockchain is longer than current blockchain');
            blockchain_1.replaceChain(receivedBlocks);
        }
    }
    else {
        console.log('received blockchain is not longer than received blockchain. Do nothing');
    }
};
const broadcastLatest = () => {
    broadcast(responseLatestMsg());
};
exports.broadcastLatest = broadcastLatest;
const connectToPeers = (newPeer) => {
    const ws = new WebSocket(newPeer);
    ws.on('open', () => {
        initConnection(ws);
    });
    ws.on('error', () => {
        console.log('connection failed');
    });
};
exports.connectToPeers = connectToPeers;
const broadCastTransactionPool = () => {
    broadcast(responseTransactionPoolMsg());
};
exports.broadCastTransactionPool = broadCastTransactionPool;
const broadCastTransactionPoolVictoryPoints = () => {
    broadcast(responseTransactionPoolVictoryPointsMsg());
};
exports.broadCastTransactionPoolVictoryPoints = broadCastTransactionPoolVictoryPoints;
//# sourceMappingURL=p2p.js.map