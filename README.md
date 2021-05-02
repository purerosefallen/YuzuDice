# YuzuDice

下一代的骰娘。

## 环境变量

* `DB_HOST` `DB_PORT` `DB_USER` `DB_PASS` `DB_NAME` 数据库配置。

* `CQ_ID` QQ 号。

* `CQ_SERVER` OneBot 服务端地址。

* `CQ_TOKEN` OneBot 密钥。

* `ADMIN_TOKEN` http api 密钥，请求需要放在 `Authorization` 头。

* `DICE_MAX_COUNT` 最大的骰子数量。 默认 1000。

* `DICE_MAX_SIZE` 最大的骰子面数。 默认 1000。

## 推荐 docker-compose

```yaml
version: '2.4'
services:
  mysql:
    restart: always
    image: mariadb:10
    volumes:
      - './db:/var/lib/mysql'
    environment:
      MYSQL_ROOT_PASSWORD: db_rootpass
      MYSQL_DATABASE: yuzudice
      MYSQL_USER: yuzudice
      MYSQL_PASSWORD: db_pass
  cqhttp:
    restart: always
    image: git-registry.mycard.moe/nanahira/docker-mirai-cqhttp:novnc
    ports:
      - 11180:8080
    volumes:
      - ./cqhttp/data:/usr/src/app/data
      - ./cqhttp/config:/usr/src/app/config
      - ./cqhttp/bots:/usr/src/app/bots
    environment:
      QQ_ID: 11111111
      QQ_PASS: qq_pass
      WS_TOKEN: cq_token
  yuzudice:
    restart: always
    image: git-registry.mycard.moe/nanahira/yuzudice
    ports:
      - 3000:3000
    environment:
      DB_HOST: mysql
      DB_PORT: 3306
      DB_USER: yuzudice
      DB_PASS: db_pass
      CQ_ID: 11111111
      CQ_SERVER: ws://cqhttp
      CQ_TOKEN: cq_token
      ADMIN_TOKEN: admin_token
      DICE_MAX_COUNT: 1000
      DICE_MAX_SIZE: 1000
```

登录过程中可能需要划验证码。访问 `http://<服务器IP>:11180/vnc.html` 划即可。

之后使用命令 `curl -H 'Authorization: admin_token' http://<服务器IP>:3000/api/user -d 'id=<你的QQ号>' -d 'permissions=0xffffffff'` 赋予自己管理员权限。

## Installation

```bash
$ npm install
```

## Running the app

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## License

AGPLv3
