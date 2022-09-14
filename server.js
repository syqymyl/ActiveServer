var http = require("http");
var fs = require("fs");
var url = require("url");
const { homedir } = require("os");
var port = process.argv[2];

if (!port) {
  console.log("请指定端口号好不啦？\nnode server.js 8888 这样不会吗？");
  process.exit(1);
}

var server = http.createServer(function (request, response) {
  var parsedUrl = url.parse(request.url, true);
  var pathWithQuery = request.url;
  var queryString = "";
  if (pathWithQuery.indexOf("?") >= 0) {
    queryString = pathWithQuery.substring(pathWithQuery.indexOf("?"));
  }
  var path = parsedUrl.pathname;
  var query = parsedUrl.query;
  var method = request.method;

  /******** 从这里开始看，上面不要看 ************/

  const session = JSON.parse(fs.readFileSync("./session.json"));

  console.log("有个傻子发请求过来啦！路径（带查询参数）为：" + pathWithQuery);

  if (path === "/sign_in" && method === "POST") {
    const userArray = JSON.parse(fs.readFileSync("./db/users.json"));

    const array = [];
    request.on("data", (chunk) => {
      array.push(chunk);
    });
    request.on("end", () => {
      const string = Buffer.concat(array).toString();
      const obj = JSON.parse(string); // name password

      // 将用户提交的登录名和密码与数据库中的进行匹配，找得到则返回第一个符合的值，找不到返回undefined
      const user = userArray.find(
        (user) => user.name === obj.name && user.password === obj.password
      );
      if (user === undefined) {
        response.statusCode = 400;
        response.setHeader("Content-Type", "text/json;charset=utf-8");
        response.end(`{"errorCode":4001}`); // 每个公司都应该要有一个自己的errorCode编码
      } else {
        response.statusCode = 200;

        // 设置cookie，HttpOnly用于阻止Js通过Document.cookie访问cookie
        // response.end()要在end事件回调里做的.否则response.end()执行早于end事件回调，response.setHeader就会报错
        // response.setHeader("Set-Cookie", `user_id=${user.id}; HttpOnly`);

        // 产生随机id，存储在session.json文件中
        const random = Math.random();
        session[random] = { user_id: user.id };
        fs.writeFileSync("./session.json", JSON.stringify(session));
        response.setHeader("Set-Cookie", `session_id=${random}; HttpOnly`);
        response.end();
      }
    });
  } else if (path === "/home.html") {
    // 获取cookie,用法可查阅node.js中文文档
    const cookie = request.headers["cookie"];

    // 从cookie中获取sessionId
    let sessionId;
    try {
      sessionId = cookie
        .split(";")
        .filter((string) => string.indexOf("session_id=") >= 0)[0]
        .split("=")[1];
    } catch (error) {}

    if (sessionId && session[sessionId]) {
      const userId = session[sessionId].user_id;
      const userArray = JSON.parse(fs.readFileSync("./db/users.json"));

      // 在数据库中匹配这个userId
      const user = userArray.find((user) => user.id === userId); // 这里的userId是number类型
      const homeHtml = fs.readFileSync("./public/home.html").toString();
      let string = ""; //string必须为字符串类型，否则response.write(string);会报错
      if (user) {
        string = homeHtml
          .replace("{{loginStatus}}", "已登录")
          .replace("{{user.name}}", user.name);
      }
      response.write(string);
    } else {
      const homeHtml = fs.readFileSync("./public/home.html").toString();
      const string = homeHtml
        .replace("{{loginStatus}}", "未登录")
        .replace("{{user.name}}", "");
      response.write(string);
    }
    response.end();
  } else if (path === "/register" && method === "POST") {
    response.setHeader("Content-Type", "text/html;charset=utf-8");

    // 读数据库
    const userArray = JSON.parse(fs.readFileSync("./db/users.json"));

    // 数据可能分段，因为提交地方数据长度可能很长也可能很短，要把它们存在一个数组里
    const array = [];
    request.on("data", (chunk) => {
      array.push(chunk);
    });
    request.on("end", () => {
      // 此时数组中存的都是隔开的编码，需要转换并且连接起来
      const string = Buffer.concat(array).toString();
      const obj = JSON.parse(string);

      // 获取数据库中最后一位用户的数据
      const lastUser = userArray[userArray.length - 1];

      // 创建新用户对象
      const newUser = {
        id: lastUser ? lastUser.id + 1 : 1,
        name: obj.name,
        password: obj.password,
      };

      userArray.push(newUser);
      fs.writeFileSync("./db/users.json", JSON.stringify(userArray));
      response.end();
    });
  } else {
    response.statusCode = 200;

    // 默认首页
    const filePath = path === "/" ? "/index.html" : path;
    const index = filePath.lastIndexOf("."); // 获取点的位置
    const suffix = filePath.substring(index); // 获取文件类型
    const fileTypes = {
      ".html": "text/html",
      ".css": "text/css",
      ".js": "text/javascript",
      ".png": "image/png",
      ".jpg": "text/jpeg",
    };

    // 当请求的路径没有文件后缀名，或者文件后缀名不在fileTypes中，则默认为html类型
    response.setHeader(
      "Content-Type",
      `${fileTypes[suffix] || "text/html"};charset=utf-8`
    );
    let content;
    try {
      content = fs.readFileSync(`./public${filePath}`);
    } catch (error) {
      content = "文件不存在";
      response.statusCode = 404;
    }
    response.write(content);
    response.end();
  }

  /******** 代码结束，下面不要看 ************/
});

server.listen(port);
console.log(
  "监听 " +
    port +
    " 成功\n请用在空中转体720度然后用电饭煲打开 http://localhost:" +
    port
);
