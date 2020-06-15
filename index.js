const connect = require('./socket-core');
const api = require('./bot-api');
let accounts = require('./config');

let args = process.argv.slice(2);


//you need install npm package 'forever' for this feature
if (args.includes('-reboot')) {
    let rindex = args.findIndex((i) => (i === '-reboot'));
    let rebootTimeMinutes = 240;
    if (args[rindex + 1]) {
        rebootTimeMinutes = Number(args[rindex + 1]) || rebootTimeMinutes;
    }
    console.log(`Script will rebooted every ${rebootTimeMinutes} minutes.`)
    setTimeout(() => {
        throw new Error("restartme");
    }, 1000 * 60 * rebootTimeMinutes);
}


accounts = accounts.map(a => {
    a.isNeedReboot = true;
    return a;
});

const loop = async (account) => {
    const accountIndex = accounts.findIndex(a => a.id === account.id);
    let socket = connect('https://rgsgames.ru:8105', account.proxy || null);
    const mem = new api(account.id, account.auth_key);
    let joinedToLobby = false;
    let usersInGame = [];
    let attackNumber = 0;
    let accountInfo;

    // console.log(await mem.requestToClan(46));
    // console.log(await mem.getInventory());
    // console.log(await mem.openCase(0));
    // console.log(await mem.buyWeapon(43, 0));
    // console.log(await mem.pickWeapon(43));
    // console.log(await mem.buyFood(5));
    // process.exit(1);

    socket.on('connect', async function (data) {
        console.log(`[${accountIndex}]`, "Connected...");
        accounts[accountIndex].socket = socket;
        accountInfo = await mem.getUserInfo();
        console.table(accountInfo);
        if ((100 - Number(accountInfo.energy)) >= 25) {
            console.log(`[${accountIndex}]`, "Eat energy...");
            mem.eatEnergy().then(() => {
                socket.emit("authorization", `${account.id},${account.auth_key}`);
            });
        } else {
            socket.emit("authorization", `${account.id},${account.auth_key}`);
        }
    });

    socket.on("*", async function (event, data) {
            let ignorePackets = ['invsndata', 'ToBattleTimer', 'SetTimer', 'BattleStarted', 'SetTurnPlayer', 'UpdateUsers', 'BattleEnd', 'AttackFromTurn', 'cntatccoft'];
            if (!ignorePackets.includes(event)) {
                console.log(`[${accountIndex}]`, event, data);
            }
            switch (event) {
                case "Authorized":
                    socket.emit("*", { "name": "invasion", "data": { "ev": "join" } });
                    for (let i = 0; i < 40; i++) {
                        socket.emit("*", { "name": "invasion", "data": { "ev": "atc" } });
                    }
                    socket.emit("*", { "name": "invasion", "data": { "ev": "leave" } });
                    for (let i = 1; i <= 4; i++) {
                        socket.emit("*", { "name": "map", "data": { "ev": "getbaseinf", "id": i } });
                    }
                    for (let i = 1; i <= 22; i++) {
                        socket.emit("*", { "name": "map", "data": { "ev": "teratcstart", "id": i } });
                        socket.emit("*", { "name": "map", "data": { "ev": "teratcadd", "id": i } });
                    }
                    socket.emit("getBattleTypes", "");
                    break;
                case "showbase":
                    if (data) {
                        if (!accounts.find(a => a.id === Number(data.owner))) {
                            if (accountInfo.currentBaseDamage > 20) {
                                let winRightNow = data.power > accountInfo.currentBaseDamage;
                                let winByHit = data.power > accountInfo.baseDamage;
                                if (winRightNow || !winByHit) {
                                    socket.emit("*", { "name": "map", "data": { "ev": "attackbase", "id": data.baseid } });
                                }
                            }
                        }
                    }
                    break;
                case "InLobbyCount":
                    //turn this if vse bad
                    if (args.includes('-badguy')) {
                        if (Number(data) < (5 + accountIndex)) {
                            accounts[accountIndex].isNeedReboot = true;
                        }
                    }
                    break;
                case "BattleTypes":
                    socket.emit("jointobattle", `${account.id},${account.auth_key},${data}`);
                    setTimeout(() => {
                        if (!joinedToLobby) {
                            setTimeout(() => {
                                accounts[accountIndex].isNeedReboot = true;
                            }, 120000)
                        }
                    }, 7000);
                    break;
                case "YouInLobby":
                    joinedToLobby = true;
                    break;
                case "ToBattleTimer":
                    let timer = Number(data);
                    if (timer === 9 || timer === 998) {
                        console.log(`[${accountIndex}]`, "Send Ping");
                        socket.emit("Ping", "");
                    }
                    break;
                case "BattleStarted":
                    let players = JSON.parse(data.split(']]{|}')[0] + `]]`);
                    console.table(players.map(player => {
                        player[11] = null;
                        return player;
                    }));

                    usersInGame = players;
                    // game.position = players.indexOf(player => (player[2].toString() === account.id.toString()));
                    break;
                case "UpdateUsers":
                    let uplayers = JSON.parse(data.split(']]{|}')[0] + `]]`);
                    console.table(uplayers.map(player => {
                        player[11] = null;
                        return player;
                    }));

                    usersInGame = uplayers;
                    break;
                case "AttackFromTurn":
                    let attackArgs = data.split('{|}');
                    console.log(`[${accountIndex}]`, attackArgs);
                    break;
                case "SetTimer":
                    let t = Number(data);
                    if (t === 3) {
                        // socket.emit("UseLuck", "");
                        socket.emit("TryAttack", "100,0");
                        attackNumber += 1;
                        if (usersInGame.length >= 3 && attackNumber > 1) {
                            socket.emit("UseBottle", "");
                        }
                    }
                    break;
                case "crush":
                    setTimeout(() => {
                        accounts[accountIndex].isNeedReboot = true;
                    }, 120000);
                    break;
                case "BattleEnd":
                    attackNumber = 0;
                    let result = JSON.parse(data);
                    if (result) {
                        console.table(result);
                    }
                    accounts[accountIndex].isNeedReboot = true;
                    break;
            }
        }
    );

    socket.on('close', async function (data) {
        console.log(`[${accountIndex}]`, "closing...");
        accounts[accountIndex].isNeedReboot = true;
    });

    mem.downloadTorrent();
    mem.sendEatForFriends(accounts.map(i => i.id));
    mem.getPresent();
    mem.getDayBonus();
    // mem.openCase(0);

    return socket;
};

setInterval(async () => {
    accounts.forEach(((account, index) => {
        if (account.isNeedReboot) {
            try {
                loop(account);
                account.isNeedReboot = false;
                if (account.socket) {
                    account.socket.close();
                }
            } catch (e) {
                console.error(e);
            }
        }
    }));
}, 1000);
