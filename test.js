const fs = require("fs");

// 读数据库
const userString = fs.readFileSync("./db/users.json").toString();
const userArray = JSON.parse(userString); // 序列化
// console.log(userArray);

// 写数据库
const user3 = { id: 2, name: "苏流西", password: "010" };
userArray.push(user3);
const string = JSON.stringify(userArray); // 反序列化
fs.writeFileSync("./db/users.json", string);
// console.log(userArray);
