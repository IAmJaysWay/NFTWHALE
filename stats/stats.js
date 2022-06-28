const Moralis = require("moralis/node");
const fs = require("fs");

const serverUrl ="xxx";

const appId="xxx";

const contractAddress = "0x23581767a106ae21c074b2276D25e5C3e136a68b"; //Moonbirds


Array.prototype.getUnique = function(){
    var uniques = [];
    for(var i = 0, l = this.length; i < l; ++i){
        if(this.lastIndexOf(this[i]) == this.indexOf(this[i])) {
            uniques.push(this[i]);
        }
    }
    return uniques;
  }

const averagePrice = (array) => {
    const filteredZero = array.filter(item => item !== 0);
    const filtered = filteredZero.getUnique();

    if(filtered.length > 1){
        return (filtered.reduce((a, b) => Number(a) + Number(b)) / filtered.length) / 1e18;
      }else if(filtered.length === 1){
        return filtered[0] / 1e18;
      }else{
        return 0;
      }
  
};

const averageDaySinceBuy = (array) => {
    let ms;

    if(array.length > 1){
        ms = array.reduce((a, b) => new Date(a).getTime() + new Date(b).getTime()) / array.length;
      } else {
        ms = new Date(array[0]).getTime()
    }

    const diff = Math.floor((new Date().getTime() - ms) / 86400000);

    return diff;
  
}

async function getAllOwners() {

    await Moralis.start({ serverUrl: serverUrl, appId: appId });
    let cursor = null;
    let owners = {};
    let history = {};
    let res;
    let accountedTokens = [];

    let date = new Date();

    date.setDate(date.getDate() - 30);

    const blockoptions = {
        chain: "Eth",
        date: date,
    };

    const block = await Moralis.Web3API.native.getDateToBlock(blockoptions);

    const monthBlock =  Number(block.block);


    do{

        const response = await Moralis.Web3API.token.getContractNFTTransfers({
            address: contractAddress,
            chain: "eth",
            limit: 100,
            cursor: cursor,
          });

          res = response;
          console.log(
            `Got page ${response.page} of ${Math.ceil(
              response.total / response.page_size
            )}, ${response.total} total`
          );


          for (const transfer of res.result) {

            let recentTx = 0;
            if(monthBlock < Number(transfer.block_number)){
                recentTx = 1;
            } 

            if (!owners[transfer.to_address] && !accountedTokens.includes(transfer.token_id)) {

                owners[transfer.to_address] = {
                    address: transfer.to_address,
                    amount: Number(transfer.amount),
                    tokenId: [transfer.token_id],
                    prices: [Number(transfer.value)],
                    dates: [transfer.block_timestamp],
                    recentTx: recentTx,
                    avgHold: averageDaySinceBuy([transfer.block_timestamp]),
                    avgPrice: Number(transfer.value) / 1e18,
                  } 

                  accountedTokens.push(transfer.token_id);

            }else if(!accountedTokens.includes(transfer.token_id)) {
                
                owners[transfer.to_address].amount++;
                owners[transfer.to_address].tokenId.push(transfer.token_id);
                owners[transfer.to_address].prices.push(Number(transfer.value));
                owners[transfer.to_address].dates.push(transfer.block_timestamp);
                owners[transfer.to_address].recentTx = owners[transfer.to_address].recentTx + recentTx;
                owners[transfer.to_address].avgHold = averageDaySinceBuy(owners[transfer.to_address].dates);
                owners[transfer.to_address].avgPrice = averagePrice(owners[transfer.to_address].prices);

                accountedTokens.push(transfer.token_id);
            }

            if(owners[transfer.from_address] && recentTx === 1){
                owners[transfer.from_address].recentTx = owners[transfer.from_address].recentTx - recentTx;
            } else if (!owners[transfer.from_address] && recentTx === 1){
                owners[transfer.from_address] = {
                address: transfer.from_address,
                amount: 0,
                tokenId: [],
                prices: [],
                dates: [],
                recentTx: -recentTx,
                avgHold: 0,
                avgPrice: 0,
                };
            }


            if (!history[transfer.to_address]) {
                history[transfer.to_address] = [
                  {
                    to: transfer.to_address,
                    from: transfer.from_address,
                    price: transfer.value,
                    date: transfer.block_timestamp,
                    tokenId: transfer.token_id,
                  },
                ]
              } else {
                history[transfer.to_address].push({
                  to: transfer.to_address,
                  from: transfer.from_address,
                  price: transfer.value,
                  date: transfer.block_timestamp,
                  tokenId: transfer.token_id,
                });
              } 
              
              
              if (!history[transfer.from_address]) {
                history[transfer.from_address] = [
                  {
                    to: transfer.to_address,
                    from: transfer.from_address,
                    price: transfer.value,
                    date: transfer.block_timestamp,
                    tokenId: transfer.token_id,
                  },
                ]
              } else {
                history[transfer.from_address].push({
                  to: transfer.to_address,
                  from: transfer.from_address,
                  price: transfer.value,
                  date: transfer.block_timestamp,
                  tokenId: transfer.token_id,
                });
              }   
                        

            } 


          cursor = res.cursor;

    } while (cursor != "" && cursor != null);


    const jsonContentOwners = JSON.stringify(owners);
    const jsonContentHistory = JSON.stringify(history);

    fs.writeFile("moonbirdsOwners.json", jsonContentOwners, "utf8", function (err) {
        if (err) {
          console.log("An error occured while writing JSON Object to File.");
          return console.log(err);
        }
    
        console.log("JSON file has been saved.");
      });

      fs.writeFile("moonbirdsHistory.json", jsonContentHistory, "utf8", function (err) {
        if (err) {
          console.log("An error occured while writing JSON Object to File.");
          return console.log(err);
        }
    
        console.log("JSON file has been saved.");
      });
}


getAllOwners();