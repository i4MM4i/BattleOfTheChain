# Blockchain part of BattleOfTheChain
The blockchain is based on naivecoin, it has two available currencies which will be used in the game. These are the games base currency (in-game money) and Victory Points.

Below is an example how to run and test the blockchain.

#### Install necessary dependencies:
npm install ws lodash ellpitic crypto-js body-parser mongoose

##### To start the first node:
```
npm start OR HTTP_PORT=3001 P2P_PORT=6001
```
#### Here you can run as many as you'd like, just don't forget to have different ports and keys
```
HTTP_PORT=3002 P2P_PORT=6002 PRIVATE_KEY=75d8efd17cc4e21934e9b084cdde851f457377e0d6eff18cf65eb7a31c38a778 npm start

HTTP_PORT=3003 P2P_PORT=6003 PRIVATE_KEY=75d8efd17cc4e21934e9b084cdde851f457377e0d6eff18cf65eb7a31c38a776 npm start
```

#### Connect those peers with each other:
```
curl -H "Content-type:application/json" --data '{"peer" : "ws://localhost:6002"}' http://localhost:3001/addPeer
curl -H "Content-type:application/json" --data '{"peer" : "ws://localhost:6003"}' http://localhost:3001/addPeer

curl -H "Content-type:application/json" --data '{"peer" : "ws://localhost:6001"}' http://localhost:3002/addPeer
curl -H "Content-type:application/json" --data '{"peer" : "ws://localhost:6003"}' http://localhost:3002/addPeer

curl -H "Content-type:application/json" --data '{"peer" : "ws://localhost:6001"}' http://localhost:3003/addPeer
curl -H "Content-type:application/json" --data '{"peer" : "ws://localhost:6002"}' http://localhost:3003/addPeer
```

## Then finally in another terminal you can use the following commands with curl:


#### Query peers
```
curl http://localhost:3001/peers
```

#### Query blocks
```
curl http://localhost:3001/blocks
```

#### Get balance
```
curl http://localhost:3001/blocks
```


#### Mine block
```
curl -X POST http://localhost:3001/mineBlock
```

#### Send transaction
```
curl -H "Content-type: application/json" --data '{"address": "04f04ba012ac1a1f7c195dce22dab29c915721bfaccc0ee8e895505ef1fb22971b13c85dc0108bad29c4d72c3eb31854c684128c6332a54450c729187c6faaa698", "amount" : 35}' http://localhost:3002/sendTransaction
```

#### Mine transaction
```
curl -H "Content-type: application/json" --data '{"address": "04f04ba012ac1a1f7c195dce22dab29c915721bfaccc0ee8e895505ef1fb22971b13c85dc0108bad29c4d72c3eb31854c684128c6332a54450c729187c6faaa698", "amount" : 35}' http://localhost:3002/mineTransaction
```
