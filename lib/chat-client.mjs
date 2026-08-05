import net from 'node:net';
import readline from 'node:readline';
import chalk from 'chalk';

export default class ChatClient {
  constructor(port, address) {
    if (!port || !address) {
      throw new Error('Need port and address');
    }
    this.port = port;
    this.address = address;
  }
  connect() {
    // stdin/stdout 显式使用 utf8，避免交互式输入中文时出现乱码或被拆字
    process.stdin.setEncoding('utf8');
    process.stdout.setDefaultEncoding('utf8');

    this.socket = net.createConnection(this.port, this.address, () => {
      console.log(chalk.green(`connected to ${this.address}:${this.port}`));
    });
    // socket 同样显式声明 utf8 编码，保证收发的中文正确解码/编码
    this.socket.setEncoding('utf8');
    this.socket.setDefaultEncoding('utf8');

    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: true,
    });

    this.addListener();
    return this;
  }
  addListener() {
    this.socket.on('data', data => {
      // 收到服务端消息时先清空当前正在编辑的行，打印后再恢复输入提示，避免消息和输入内容混在一起
      readline.clearLine(process.stdout, 0);
      readline.cursorTo(process.stdout, 0);
      process.stdout.write(data);
      this.rl.prompt(true);
    });
    this.socket.on('close', () => {
      console.log(chalk.yellow('connection closed'));
      this.rl.close();
      process.exit(0);
    });
    this.socket.on('error', err => {
      console.error(chalk.red('connection error:'), err.message);
      this.rl.close();
      process.exit(1);
    });

    this.rl.on('line', line => {
      this.socket.write(line + '\n', 'utf8');
    });
    this.rl.on('close', () => {
      this.socket.end();
      process.exit(0);
    });
  }
}
