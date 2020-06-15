const util = require('util');
const request = util.promisify(require('request'));
const URLSearchParams = require('@ungap/url-search-params');

let appDebug = true;

class MemBattleOfflineManager {
    constructor(uid, auth_key, debug = false) {
        this.app_url = "https://rgsgames.ru/";
        this.uid = uid;
        this.auth_key = auth_key;
        appDebug = debug;
    }

    /*display user information*/
    async getUserInfo() {
        const userResponse = await this.sendRequest("connect.php", {});
        const userInfo = JSON.parse(userResponse)[0];
        const baseDamageData = userInfo[38].split("|");
        
        let humanReadable = {
            nickname: userInfo[1],
            level: userInfo[2],
            smiles: userInfo[3],
            dollars: userInfo[4],
            // unknown5: userInfo[5],
            nextLvlExp: userInfo[7],
            exp: userInfo[8],
            // unknown9: userInfo[9],
            // unknown10: userInfo[10],
            refEnergy: userInfo[11],
            energy: userInfo[12],
            bottles: userInfo[16],
            mmr: userInfo[25],
            matches: userInfo[26],
            avgDamage: userInfo[27],
            currentBaseDamage: Number(baseDamageData[0] || 0),
            baseDamage: Number(baseDamageData[1] || 0),
        };
        debug(humanReadable);
        
        return humanReadable;
    }

    /*pick weapon by id*/
    async pickWeapon(id) {
        let response = await this.sendRequest("buysomething.php", { "whatneed": "pickweapon", "weaponid": id });
        debug("Pick weapon id" + id + "...", response);
        return response;
    }

    /*set nickname*/
    async setNickname(nickname) {
        let response = await this.sendRequest("buysomething.php", { "whatneed": "setNickname", "nickname": nickname });
        debug("Setting nickname ...", response);
        return response;
    }

    /*every 24 hrs*/
    async getDayBonus() {
        let response = await this.sendRequest("daybonus.php", { "whatneed": "getbonus" });
        debug("Getting daily bonus...", response);
        return response;
    }

    /*update current available eat*/
    async updateAvailableEat() {
        let response = await this.sendRequest("foodSystem.php", { "whatneed": "babkaFood" });
        debug("Updating available eat...", response);
        return response;
    }

    /* 75 per hour regen */
    async eatEnergy() {
        await this.updateAvailableEat();
        let response = await this.sendRequest("foodSystem.php", { "whatneed": "eatFrmHldnk" });
        debug("Eating...", response);
        return response;
    }

    /* unknown */
    async getPresent() {
        let response = await this.sendRequest("buysomething.php", { "whatneed": "podarok" });
        debug("Getting a present...", response);
        return response;
    }

    /* every 12hrs */
    async sendEatForFriends(friends) {
        let response = await this.sendRequest("foodSystem.php", {
            "whatneed": "foodtofriends",
            "friends": friends.join(",")
        });
        debug("Sending eat for friends...", response);
        return response;
    }

    /* every 2hrs */
    async downloadTorrent() {
        let response = await this.sendRequest("foodSystem.php", { "whatneed": "useTrnt" });
        debug("Downloading torrent...", response);
        return response;
    }


    /* buy the weapon */
    async buyWeapon(weaponid, buytype) {
        let response = await this.sendRequest("buysomething.php", {
            "whatneed": "buyweapon",
            "weaponid": weaponid,
            "buytype": buytype
        });
        debug("Buying weapon...", response);
        return response;
    }

    async buyFood(foodtype) {
        let response = await this.sendRequest("buysomething.php", {
            "whatneed": "buyfood",
            "foodtype": foodtype,
        });
        debug("Buying weapon...", response);
        return response;
    }

    async saveNewFace(setting_string) {
        if (!setting_string) {
            return false;
        }
        let response = await this.sendRequest("buysomething.php", {
            "whatneed": "saveface",
            "faces": setting_string,
        });
        debug("Setting new face...", response);
        return response;
    }

    /*get friend info*/
    async getFriendInfo(friendid) {
        let response = await this.sendRequest("getfriends.php", {
            "whatneed": "getfriendinfo",
            "frienduid": friendid,
        });
        debug("Get " + friendid + " info...", response);
        return response;
    }

    /* copy friend face */
    async grabFriendFace(friendid) {
        let response = await this.getFriendInfo(friendid);
        let face_str = response.split("&")[2];
        this.saveNewFace(face_str);
        debug("Grabbing player face...", response);
        return response;
    }

    async getInventory() {
        let response = await this.sendRequest("invcases.php", {
            "whatneed": "getInventory",
        });
        debug("Getting inventory", response);
        return response;
    }

    async openCase(caseid) {
        let response = await this.sendRequest("invcases.php", {
            "whatneed": "openCaseRoll",
            "caseid": caseid,
        });
        debug("Opening case...", response);
        return response;
    }

    async requestToClan(clanid) {
        let response = await this.sendRequest("clansystem.php", {
            "whatneed": "reqToClan",
            "clanid": clanid,
        });
        debug("requestToClan...", response);
        return response;
    }

    async addClanBalance(type, amount) {
        let response = await this.sendRequest("clansystem.php", {
            "whatneed": "addkazna",
            "type": type,
            "value": amount,
        });
        debug("requestToClan...", response);
        return response;
    }

    async sendRequest(url, data) {
        try {
            let dataString = new URLSearchParams();
            dataString.append('uid', this.uid);
            dataString.append('token', this.auth_key);

            for (const [key, value] of Object.entries(data)) {
                dataString.append(key, value);
            }

            let req = await request({
                url: 'https://rgsgames.ru/' + url,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: "" + dataString
            });

            // console.log(req.body);
            return req.body;
        } catch (e) {
            console.error(e.message);
            return false;
        }
    }

}

async function debug(...o) {
    if (appDebug == true) {
        for (let val of o) {
            console.log(val);
        }
    }
}

module.exports = MemBattleOfflineManager;