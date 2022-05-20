import * as fs from 'fs';
// import * as net from 'net';
import * as path from 'path';
import * as temp from 'temp';
import { expect } from 'chai';
import { ChildProcess } from 'child_process';
import { safeLoad, safeDump } from 'js-yaml';
import { ArduinoDaemonImpl } from '../../node/arduino-daemon-impl';
import { spawnCommand } from '../../node/exec-util';
import { CLI_CONFIG } from '../../node/cli-config';

const track = temp.track();

class SilentArduinoDaemonImpl extends ArduinoDaemonImpl {
  constructor(private logFormat: 'text' | 'json') {
    super();
  }

  override onData(data: string): void {
    // NOOP
  }

  override async spawnDaemonProcess(): Promise<{ daemon: ChildProcess; port: string }> {
    return super.spawnDaemonProcess();
  }

  protected override async getSpawnArgs(): Promise<string[]> {
    const cliConfigPath = await this.initCliConfig();
    return [
      'daemon',
      '--format',
      'jsonmini',
      '--port',
      '0',
      '--config-file',
      cliConfigPath,
      '-v',
      '--log-format',
      this.logFormat,
    ];
  }

  private async initCliConfig(): Promise<string> {
    const cliPath = await this.getExecPath();
    const destDir = track.mkdirSync();
    await spawnCommand(`"${cliPath}"`, [
      'config',
      'init',
      '--dest-dir',
      destDir,
    ]);
    const content = fs.readFileSync(path.join(destDir, CLI_CONFIG), {
      encoding: 'utf8',
    });
    const cliConfig = safeLoad(content) as any;
    // cliConfig.daemon.port = String(this.port);
    const modifiedContent = safeDump(cliConfig);
    fs.writeFileSync(path.join(destDir, CLI_CONFIG), modifiedContent, {
      encoding: 'utf8',
    });
    return path.join(destDir, CLI_CONFIG);
  }
}

describe('arduino-daemon-impl', () => {
  after(() => {
    track.cleanupSync();
  });

  // it('should parse an error - address already in use error [json]', async function (): Promise<void> {
  //     if (process.platform === 'win32') {
  //         this.skip();
  //     }
  //     let server: net.Server | undefined = undefined;
  //     try {
  //         server = await new Promise<net.Server>(resolve => {
  //             const server = net.createServer();
  //             server.listen(() => resolve(server));
  //         });
  //         const address = server.address() as net.AddressInfo;
  //         await new SilentArduinoDaemonImpl(address.port, 'json').spawnDaemonProcess();
  //         fail('Expected a failure.')
  //     } catch (e) {
  //         expect(e).to.be.instanceOf(DaemonError);
  //         expect(e.code).to.be.equal(DaemonError.ADDRESS_IN_USE);
  //     } finally {
  //         if (server) {
  //             server.close();
  //         }
  //     }
  // });

  // it('should parse an error - address already in use error [text]', async function (): Promise<void> {
  //     if (process.platform === 'win32') {
  //         this.skip();
  //     }
  //     let server: net.Server | undefined = undefined;
  //     try {
  //         server = await new Promise<net.Server>(resolve => {
  //             const server = net.createServer();
  //             server.listen(() => resolve(server));
  //         });
  //         const address = server.address() as net.AddressInfo;
  //         await new SilentArduinoDaemonImpl(address.port, 'text').spawnDaemonProcess();
  //         fail('Expected a failure.')
  //     } catch (e) {
  //         expect(e).to.be.instanceOf(DaemonError);
  //         expect(e.code).to.be.equal(DaemonError.ADDRESS_IN_USE);
  //     } finally {
  //         if (server) {
  //             server.close();
  //         }
  //     }
  // });

  it('should parse the port address when the log format is json', async () => {
    const { daemon, port } = await new SilentArduinoDaemonImpl(
      'json'
    ).spawnDaemonProcess();

    expect(port).not.to.be.undefined;
    expect(port).not.to.be.equal('0');
    daemon.kill();
  });

  it('should parse the port address when the log format is text', async () => {
    const { daemon, port } = await new SilentArduinoDaemonImpl(
      'text'
    ).spawnDaemonProcess();

    expect(port).not.to.be.undefined;
    expect(port).not.to.be.equal('0');
    daemon.kill();
  });
});
