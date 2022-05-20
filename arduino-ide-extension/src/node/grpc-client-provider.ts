import {
  inject,
  injectable,
  postConstruct,
} from '@theia/core/shared/inversify';
import { ILogger } from '@theia/core/lib/common/logger';
import { MaybePromise } from '@theia/core/lib/common/types';
import { ConfigServiceImpl } from './config-service-impl';
import { ArduinoDaemonImpl } from './arduino-daemon-impl';

@injectable()
export abstract class GrpcClientProvider<C> {
  @inject(ILogger)
  protected readonly logger: ILogger;

  @inject(ArduinoDaemonImpl)
  protected readonly daemon: ArduinoDaemonImpl;

  @inject(ConfigServiceImpl)
  protected readonly configService: ConfigServiceImpl;

  protected _port: string | undefined;
  protected _client: C | Error | undefined;

  @postConstruct()
  protected init(): void {
    this.configService.onConfigChange(() => {
      // Only reconcile the gRPC client if the port is known. Hence the CLI daemon is running.
      if (this._port) {
        this.reconcileClient(this._port);
      }
    });
    this.daemon.getPort().then((port) => this.reconcileClient(port));
    this.daemon.onDaemonStopped(() => {
      if (this._client && !(this._client instanceof Error)) {
        this.close(this._client);
      }
      this._client = undefined;
      this._port = undefined;
    });
  }

  async client(): Promise<C | Error | undefined> {
    try {
      await this.daemon.getPort();
      return this._client;
    } catch (error) {
      return error;
    }
  }

  protected async reconcileClient(port: string): Promise<void> {
    this._port = port;
    if (this._client && !(this._client instanceof Error)) {
      this.close(this._client);
      this._client = undefined;
    }
    try {
      const client = await this.createClient(this._port);
      this._client = client;
    } catch (error) {
      this.logger.error('Could not create client for gRPC.', error);
      this._client = error;
    }
  }

  protected abstract createClient(port: string | number): MaybePromise<C>;

  protected abstract close(client: C): void;

  protected get channelOptions(): Record<string, unknown> {
    const pjson = require('../../package.json') || { version: '0.0.0' };
    return {
      'grpc.max_send_message_length': 512 * 1024 * 1024,
      'grpc.max_receive_message_length': 512 * 1024 * 1024,
      'grpc.primary_user_agent': `arduino-ide/${pjson.version}`,
    };
  }
}
