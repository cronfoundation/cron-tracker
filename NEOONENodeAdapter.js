"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const node_core_1 = require("@neo-one/node-core");
const server_plugin_1 = require("@neo-one/server-plugin");
const cross_fetch_1 = tslib_1.__importDefault(require("cross-fetch"));
const execa_1 = tslib_1.__importDefault(require("execa"));
const fs = tslib_1.__importStar(require("fs-extra"));
const lodash_1 = tslib_1.__importDefault(require("lodash"));
const path = tslib_1.__importStar(require("path"));
const operators_1 = require("rxjs/operators");
const NodeAdapter_1 = require("./NodeAdapter");
const DEFAULT_RPC_URLS = [
    'http://192.168.88.196:10332',
];
const DEFAULT_SEEDS = [
    { type: 'tcp', host: '159.69.91.74', port: 10313 },
    { type: 'tcp', host: '159.69.91.74', port: 10323 },
    { type: 'tcp', host: '95.216.216.41', port: 10333 },
    { type: 'tcp', host: '95.216.216.41', port: 10343 },
];
const makeDefaultConfig = (dataPath) => ({
    log: {
        level: 'info',
        maxSize: 10 * 1024 * 1024,
        maxFiles: 5,
    },
    settings: {
        test: false,
    },
    environment: {
        dataPath: path.resolve(dataPath, 'node'),
        rpc: {},
        node: {},
        network: {},
    },
    options: {
        node: {
            consensus: {
                enabled: false,
                options: { privateKey: 'default', privateNet: false },
            },
            rpcURLs: [...DEFAULT_RPC_URLS],
        },
        network: {
            seeds: DEFAULT_SEEDS.map(node_core_1.createEndpoint),
        },
        rpc: {
            server: {
                keepAliveTimeout: 60000,
            },
            liveHealthCheck: {
                rpcURLs: DEFAULT_RPC_URLS,
                offset: 1,
                timeoutMS: 5000,
            },
            readyHealthCheck: {
                rpcURLs: DEFAULT_RPC_URLS,
                offset: 1,
                timeoutMS: 5000,
            },
        },
    },
});
exports.createNodeConfig = ({ dataPath, defaultConfig = makeDefaultConfig(dataPath), }) => new server_plugin_1.Config({
    name: 'node',
    defaultConfig,
    schema: {
        type: 'object',
        required: ['log'],
        properties: {
            log: {
                type: 'object',
                required: ['level', 'maxSize', 'maxFiles'],
                properties: {
                    level: { type: 'string' },
                    maxSize: { type: 'number' },
                    maxFiles: { type: 'number' },
                },
            },
            settings: {
                type: 'object',
                required: ['test'],
                properties: {
                    test: { type: 'boolean' },
                    privateNet: { type: 'boolean' },
                    secondsPerBlock: { type: 'number' },
                    standbyValidators: { type: 'array', items: { type: 'string' } },
                },
            },
            environment: {
                type: 'object',
                required: ['dataPath', 'rpc', 'node', 'network'],
                properties: {
                    dataPath: { type: 'string' },
                    rpc: {
                        type: 'object',
                        required: [],
                        properties: {
                            http: {
                                type: 'object',
                                required: ['host', 'port'],
                                properties: {
                                    host: { type: 'string' },
                                    port: { type: 'number' },
                                },
                            },
                            https: {
                                type: 'object',
                                required: ['host', 'port', 'key', 'cert'],
                                properties: {
                                    host: { type: 'string' },
                                    port: { type: 'number' },
                                    key: { type: 'string' },
                                    cert: { type: 'string' },
                                },
                            },
                        },
                    },
                    node: {
                        type: 'object',
                        required: [],
                        properties: {
                            externalPort: { type: 'number' },
                        },
                    },
                    network: {
                        type: 'object',
                        required: [],
                        properties: {
                            listenTCP: {
                                type: 'object',
                                required: ['port'],
                                properties: {
                                    host: { type: 'string' },
                                    port: { type: 'number' },
                                },
                            },
                            externalEndpoints: {
                                type: 'array',
                                items: { type: 'string' },
                            },
                            connectPeersDelayMS: { type: 'number' },
                            socketTimeoutMS: { type: 'number' },
                        },
                    },
                },
            },
            options: {
                type: 'object',
                required: ['node', 'network', 'rpc'],
                properties: {
                    node: {
                        type: 'object',
                        required: ['consensus', 'rpcURLs'],
                        properties: {
                            consensus: {
                                type: 'object',
                                required: ['enabled', 'options'],
                                properties: {
                                    enabled: { type: 'boolean' },
                                    options: {
                                        type: 'object',
                                        required: ['privateKey', 'privateNet'],
                                        properties: {
                                            privateKey: { type: 'string' },
                                            privateNet: { type: 'boolean' },
                                        },
                                    },
                                },
                            },
                            rpcURLs: { type: 'array', items: { type: 'string' } },
                        },
                    },
                    network: {
                        type: 'object',
                        required: ['seeds'],
                        properties: {
                            seeds: { type: 'array', items: { type: 'string' } },
                            maxConnectedPeers: { type: 'number' },
                        },
                    },
                    rpc: {
                        type: 'object',
                        required: ['server', 'liveHealthCheck', 'readyHealthCheck'],
                        properties: {
                            server: {
                                type: 'object',
                                required: ['keepAliveTimeout'],
                                properties: {
                                    keepAliveTimeout: { type: 'number' },
                                },
                            },
                            liveHealthCheck: {
                                type: 'object',
                                required: ['rpcURLs', 'offset', 'timeoutMS'],
                                properties: {
                                    rpcURLs: { type: 'array', items: { type: 'string' } },
                                    offset: { type: 'number' },
                                    timeoutMS: { type: 'number' },
                                },
                            },
                            readyHealthCheck: {
                                type: 'object',
                                required: ['rpcURLs', 'offset', 'timeoutMS'],
                                properties: {
                                    rpcURLs: { type: 'array', items: { type: 'string' } },
                                    offset: { type: 'number' },
                                    timeoutMS: { type: 'number' },
                                },
                            },
                        },
                    },
                },
            },
        },
    },
    configPath: dataPath,
});
class NEOONENodeAdapter extends NodeAdapter_1.NodeAdapter {
    constructor({ monitor, name, binary, dataPath, settings, }) {
        super({
            monitor: monitor.at('neo_one_node_adapter'),
            name,
            binary,
            dataPath,
            settings,
        });
    }
    getDebug() {
        return super
            .getDebug()
            .concat([
            ['Process ID', this.mutableProcess === undefined ? 'null' : `${this.mutableProcess.pid}`],
            ['Config Path', this.mutableConfig === undefined ? 'null' : this.mutableConfig.configPath],
        ]);
    }
    getNodeStatus() {
        return {
            rpcAddress: this.getAddress('/rpc'),
            tcpAddress: `localhost:${this.mutableSettings.listenTCPPort}`,
            telemetryAddress: `http://localhost:${this.mutableSettings.telemetryPort}/metrics`,
        };
    }
    async isLive() {
        return this.checkRPC('/live_health_check');
    }
    async isReady() {
        return this.checkRPC('/ready_health_check');
    }
    async createInternal() {
        await this.writeSettings(this.mutableSettings);
    }
    async updateInternal(settings) {
        const restart = await this.writeSettings(settings);
        if (restart && this.mutableProcess !== undefined) {
            await this.stop();
            await this.start();
        }
    }
    async startInternal() {
        if (this.mutableProcess === undefined) {
            const child = execa_1.default(this.binary.cmd, this.binary.firstArgs.concat(['start', 'node', this.dataPath]), {
                // @ts-ignore
                windowsHide: true,
                stdio: 'ignore',
            });
            this.mutableProcess = child;
            // tslint:disable-next-line no-floating-promises
            child
                .then(() => {
                this.monitor.log({
                    name: 'neo_node_adapter_node_exit',
                    message: 'Child process exited',
                });
                this.mutableProcess = undefined;
            })
                .catch((error) => {
                this.monitor.logError({
                    name: 'neo_node_adapter_node_error',
                    message: 'Child process exited with an error.',
                    error,
                });
                this.mutableProcess = undefined;
            });
        }
    }
    async stopInternal() {
        const child = this.mutableProcess;
        this.mutableProcess = undefined;
        if (child !== undefined) {
            await server_plugin_1.killProcess(child.pid);
        }
    }
    async checkRPC(rpcPath) {
        try {
            const response = await cross_fetch_1.default(this.getAddress(rpcPath));
            return response.ok;
        }
        catch (error) {
            if (error.code !== 'ECONNREFUSED') {
                this.monitor.withData({ [this.monitor.labels.HTTP_PATH]: rpcPath }).logError({
                    name: 'http_client_request',
                    message: 'Failed to check RPC.',
                    error,
                });
            }
            return false;
        }
    }
    getAddress(rpcPath) {
        return `http://localhost:${this.mutableSettings.rpcPort}${rpcPath}`;
    }
    async writeSettings(settings) {
        let config = this.mutableConfig;
        if (config === undefined) {
            config = exports.createNodeConfig({
                dataPath: this.dataPath,
                defaultConfig: this.createConfig(settings),
            });
            this.mutableConfig = config;
        }
        const nodeConfig = await config.config$.pipe(operators_1.take(1)).toPromise();
        const newNodeConfig = this.createConfig(settings);
        await fs.ensureDir(newNodeConfig.environment.dataPath);
        await config.update({ config: newNodeConfig });
        return !(lodash_1.default.isEqual(nodeConfig.settings, newNodeConfig.settings) &&
            lodash_1.default.isEqual(nodeConfig.environment, newNodeConfig.environment));
    }
    createConfig(settings) {
        return {
            log: {
                level: 'info',
                maxSize: 10 * 1024 * 1024,
                maxFiles: 5,
            },
            settings: {
                test: settings.isTestNet,
                privateNet: settings.privateNet,
                secondsPerBlock: settings.secondsPerBlock,
                standbyValidators: settings.standbyValidators,
                address: settings.address,
            },
            environment: {
                dataPath: path.resolve(this.dataPath, 'chain'),
                rpc: {
                    http: {
                        port: settings.rpcPort,
                        host: '0.0.0.0',
                    },
                },
                node: {
                    externalPort: settings.listenTCPPort,
                },
                network: {
                    listenTCP: {
                        port: settings.listenTCPPort,
                        host: '0.0.0.0',
                    },
                },
                telemetry: {
                    port: settings.telemetryPort,
                },
            },
            options: {
                node: {
                    consensus: settings.consensus,
                    rpcURLs: settings.rpcEndpoints,
                },
                network: {
                    seeds: settings.seeds,
                },
                rpc: {
                    server: {
                        keepAliveTimeout: 60000,
                    },
                    liveHealthCheck: {
                        rpcURLs: settings.rpcEndpoints,
                        offset: 1,
                        timeoutMS: 5000,
                    },
                    readyHealthCheck: {
                        rpcURLs: settings.rpcEndpoints,
                        offset: 1,
                        timeoutMS: 5000,
                    },
                },
            },
        };
    }
}
exports.NEOONENodeAdapter = NEOONENodeAdapter;

//# sourceMappingURL=data:application/json;charset=utf8;base64,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LENBQUMsWUFBWTtpQkFDL0I7Z0JBQ0QsT0FBTyxFQUFFO29CQUNQLEtBQUssRUFBRSxRQUFRLENBQUMsS0FBSztpQkFDdEI7Z0JBQ0QsR0FBRyxFQUFFO29CQUNILE1BQU0sRUFBRTt3QkFDTixnQkFBZ0IsRUFBRSxLQUFLO3FCQUN4QjtvQkFDRCxlQUFlLEVBQUU7d0JBQ2YsT0FBTyxFQUFFLFFBQVEsQ0FBQyxZQUFZO3dCQUM5QixNQUFNLEVBQUUsQ0FBQzt3QkFDVCxTQUFTLEVBQUUsSUFBSTtxQkFDaEI7b0JBQ0QsZ0JBQWdCLEVBQUU7d0JBQ2hCLE9BQU8sRUFBRSxRQUFRLENBQUMsWUFBWTt3QkFDOUIsTUFBTSxFQUFFLENBQUM7d0JBQ1QsU0FBUyxFQUFFLElBQUk7cUJBQ2hCO2lCQUNGO2FBQ0Y7U0FDRixDQUFDO0lBQ0osQ0FBQztDQUNGO0FBL01ELDhDQStNQyIsImZpbGUiOiJuZW8tb25lLXNlcnZlci1wbHVnaW4tbmV0d29yay9zcmMvbm9kZS9ORU9PTkVOb2RlQWRhcHRlci5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IE1vbml0b3IgfSBmcm9tICdAbmVvLW9uZS9tb25pdG9yJztcbmltcG9ydCB7IEZ1bGxOb2RlRW52aXJvbm1lbnQsIEZ1bGxOb2RlT3B0aW9ucyB9IGZyb20gJ0BuZW8tb25lL25vZGUnO1xuaW1wb3J0IHsgY3JlYXRlRW5kcG9pbnQsIEVuZHBvaW50Q29uZmlnIH0gZnJvbSAnQG5lby1vbmUvbm9kZS1jb3JlJztcbmltcG9ydCB7IEJpbmFyeSwgQ29uZmlnLCBEZXNjcmliZVRhYmxlLCBraWxsUHJvY2VzcyB9IGZyb20gJ0BuZW8tb25lL3NlcnZlci1wbHVnaW4nO1xuaW1wb3J0IGZldGNoIGZyb20gJ2Nyb3NzLWZldGNoJztcbmltcG9ydCBleGVjYSBmcm9tICdleGVjYSc7XG5pbXBvcnQgKiBhcyBmcyBmcm9tICdmcy1leHRyYSc7XG5pbXBvcnQgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0ICogYXMgcGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCB7IHRha2UgfSBmcm9tICdyeGpzL29wZXJhdG9ycyc7XG5pbXBvcnQgeyBOb2RlU2V0dGluZ3MgfSBmcm9tICcuLi90eXBlcyc7XG5pbXBvcnQgeyBOb2RlQWRhcHRlciwgTm9kZVN0YXR1cyB9IGZyb20gJy4vTm9kZUFkYXB0ZXInO1xuXG5leHBvcnQgaW50ZXJmYWNlIE5vZGVDb25maWcge1xuICByZWFkb25seSBsb2c6IHtcbiAgICByZWFkb25seSBsZXZlbDogc3RyaW5nO1xuICAgIHJlYWRvbmx5IG1heFNpemU6IG51bWJlcjtcbiAgICByZWFkb25seSBtYXhGaWxlczogbnVtYmVyO1xuICB9O1xuXG4gIHJlYWRvbmx5IHNldHRpbmdzOiB7XG4gICAgcmVhZG9ubHkgdGVzdD86IGJvb2xlYW47XG4gICAgcmVhZG9ubHkgcHJpdmF0ZU5ldD86IGJvb2xlYW47XG4gICAgcmVhZG9ubHkgc2Vjb25kc1BlckJsb2NrPzogbnVtYmVyO1xuICAgIHJlYWRvbmx5IHN0YW5kYnlWYWxpZGF0b3JzPzogUmVhZG9ubHlBcnJheTxzdHJpbmc+O1xuICAgIHJlYWRvbmx5IGFkZHJlc3M/OiBzdHJpbmc7XG4gIH07XG5cbiAgcmVhZG9ubHkgZW52aXJvbm1lbnQ6IEZ1bGxOb2RlRW52aXJvbm1lbnQ7XG4gIHJlYWRvbmx5IG9wdGlvbnM6IEZ1bGxOb2RlT3B0aW9ucztcbn1cblxuY29uc3QgREVGQVVMVF9SUENfVVJMUzogUmVhZG9ubHlBcnJheTxzdHJpbmc+ID0gW1xuICAnaHR0cDovL25vZGUxLm55YzMuYnJpZGdlcHJvdG9jb2wuaW86MTAzMzInLFxuICAnaHR0cDovL25vZGUyLm55YzMuYnJpZGdlcHJvdG9jb2wuaW86MTAzMzInLFxuICAnaHR0cHM6Ly9zZWVkMS5zd2l0Y2hlby5uZXR3b3JrOjEwMzMxJyxcbiAgJ2h0dHBzOi8vc2VlZDIuc3dpdGNoZW8ubmV0d29yazoxMDMzMScsXG4gICdodHRwczovL3NlZWQzLnN3aXRjaGVvLm5ldHdvcms6MTAzMzEnLFxuICAnaHR0cDovL3NlZWQxLmFwaGVsaW9uLW5lby5jb206MTAzMzInLFxuICAnaHR0cDovL3NlZWQyLmFwaGVsaW9uLW5lby5jb206MTAzMzInLFxuICAnaHR0cDovL3NlZWQzLmFwaGVsaW9uLW5lby5jb206MTAzMzInLFxuICAnaHR0cDovL3NlZWQ0LmFwaGVsaW9uLW5lby5jb206MTAzMzInLFxuXTtcblxuY29uc3QgREVGQVVMVF9TRUVEUzogUmVhZG9ubHlBcnJheTxFbmRwb2ludENvbmZpZz4gPSBbXG4gIHsgdHlwZTogJ3RjcCcsIGhvc3Q6ICdub2RlMS5ueWMzLmJyaWRnZXByb3RvY29sLmlvJywgcG9ydDogMTAzMzMgfSxcbiAgeyB0eXBlOiAndGNwJywgaG9zdDogJ25vZGUyLm55YzMuYnJpZGdlcHJvdG9jb2wuaW8nLCBwb3J0OiAxMDMzMyB9LFxuICB7IHR5cGU6ICd0Y3AnLCBob3N0OiAnc2VlZDEuc3dpdGNoZW8uY29tJywgcG9ydDogMTAzMzMgfSxcbiAgeyB0eXBlOiAndGNwJywgaG9zdDogJ3NlZWQyLnN3aXRjaGVvLmNvbScsIHBvcnQ6IDEwMzMzIH0sXG4gIHsgdHlwZTogJ3RjcCcsIGhvc3Q6ICdzZWVkMy5zd2l0Y2hlby5jb20nLCBwb3J0OiAxMDMzMyB9LFxuICB7IHR5cGU6ICd0Y3AnLCBob3N0OiAnc2VlZDEuYXBoZWxpb24tbmVvLmNvbScsIHBvcnQ6IDEwMzMzIH0sXG4gIHsgdHlwZTogJ3RjcCcsIGhvc3Q6ICdzZWVkMi5hcGhlbGlvbi1uZW8uY29tJywgcG9ydDogMTAzMzMgfSxcbiAgeyB0eXBlOiAndGNwJywgaG9zdDogJ3NlZWQzLmFwaGVsaW9uLW5lby5jb20nLCBwb3J0OiAxMDMzMyB9LFxuICB7IHR5cGU6ICd0Y3AnLCBob3N0OiAnc2VlZDQuYXBoZWxpb24tbmVvLmNvbScsIHBvcnQ6IDEwMzMzIH0sXG5dO1xuXG5jb25zdCBtYWtlRGVmYXVsdENvbmZpZyA9IChkYXRhUGF0aDogc3RyaW5nKTogTm9kZUNvbmZpZyA9PiAoe1xuICBsb2c6IHtcbiAgICBsZXZlbDogJ2luZm8nLFxuICAgIG1heFNpemU6IDEwICogMTAyNCAqIDEwMjQsXG4gICAgbWF4RmlsZXM6IDUsXG4gIH0sXG4gIHNldHRpbmdzOiB7XG4gICAgdGVzdDogZmFsc2UsXG4gIH0sXG4gIGVudmlyb25tZW50OiB7XG4gICAgZGF0YVBhdGg6IHBhdGgucmVzb2x2ZShkYXRhUGF0aCwgJ25vZGUnKSxcbiAgICBycGM6IHt9LFxuICAgIG5vZGU6IHt9LFxuICAgIG5ldHdvcms6IHt9LFxuICB9LFxuICBvcHRpb25zOiB7XG4gICAgbm9kZToge1xuICAgICAgY29uc2Vuc3VzOiB7XG4gICAgICAgIGVuYWJsZWQ6IGZhbHNlLFxuICAgICAgICBvcHRpb25zOiB7IHByaXZhdGVLZXk6ICdkZWZhdWx0JywgcHJpdmF0ZU5ldDogZmFsc2UgfSxcbiAgICAgIH0sXG4gICAgICBycGNVUkxzOiBbLi4uREVGQVVMVF9SUENfVVJMU10sXG4gICAgfSxcbiAgICBuZXR3b3JrOiB7XG4gICAgICBzZWVkczogREVGQVVMVF9TRUVEUy5tYXAoY3JlYXRlRW5kcG9pbnQpLFxuICAgIH0sXG4gICAgcnBjOiB7XG4gICAgICBzZXJ2ZXI6IHtcbiAgICAgICAga2VlcEFsaXZlVGltZW91dDogNjAwMDAsXG4gICAgICB9LFxuICAgICAgbGl2ZUhlYWx0aENoZWNrOiB7XG4gICAgICAgIHJwY1VSTHM6IERFRkFVTFRfUlBDX1VSTFMsXG4gICAgICAgIG9mZnNldDogMSxcbiAgICAgICAgdGltZW91dE1TOiA1MDAwLFxuICAgICAgfSxcbiAgICAgIHJlYWR5SGVhbHRoQ2hlY2s6IHtcbiAgICAgICAgcnBjVVJMczogREVGQVVMVF9SUENfVVJMUyxcbiAgICAgICAgb2Zmc2V0OiAxLFxuICAgICAgICB0aW1lb3V0TVM6IDUwMDAsXG4gICAgICB9LFxuICAgIH0sXG4gIH0sXG59KTtcblxuZXhwb3J0IGNvbnN0IGNyZWF0ZU5vZGVDb25maWcgPSAoe1xuICBkYXRhUGF0aCxcbiAgZGVmYXVsdENvbmZpZyA9IG1ha2VEZWZhdWx0Q29uZmlnKGRhdGFQYXRoKSxcbn06IHtcbiAgcmVhZG9ubHkgZGF0YVBhdGg6IHN0cmluZztcbiAgcmVhZG9ubHkgZGVmYXVsdENvbmZpZz86IE5vZGVDb25maWc7XG59KTogQ29uZmlnPE5vZGVDb25maWc+ID0+XG4gIG5ldyBDb25maWcoe1xuICAgIG5hbWU6ICdub2RlJyxcbiAgICBkZWZhdWx0Q29uZmlnLFxuICAgIHNjaGVtYToge1xuICAgICAgdHlwZTogJ29iamVjdCcsXG4gICAgICByZXF1aXJlZDogWydsb2cnXSxcbiAgICAgIHByb3BlcnRpZXM6IHtcbiAgICAgICAgbG9nOiB7XG4gICAgICAgICAgdHlwZTogJ29iamVjdCcsXG4gICAgICAgICAgcmVxdWlyZWQ6IFsnbGV2ZWwnLCAnbWF4U2l6ZScsICdtYXhGaWxlcyddLFxuICAgICAgICAgIHByb3BlcnRpZXM6IHtcbiAgICAgICAgICAgIGxldmVsOiB7IHR5cGU6ICdzdHJpbmcnIH0sXG4gICAgICAgICAgICBtYXhTaXplOiB7IHR5cGU6ICdudW1iZXInIH0sXG4gICAgICAgICAgICBtYXhGaWxlczogeyB0eXBlOiAnbnVtYmVyJyB9LFxuICAgICAgICAgIH0sXG4gICAgICAgIH0sXG4gICAgICAgIHNldHRpbmdzOiB7XG4gICAgICAgICAgdHlwZTogJ29iamVjdCcsXG4gICAgICAgICAgcmVxdWlyZWQ6IFsndGVzdCddLFxuICAgICAgICAgIHByb3BlcnRpZXM6IHtcbiAgICAgICAgICAgIHRlc3Q6IHsgdHlwZTogJ2Jvb2xlYW4nIH0sXG4gICAgICAgICAgICBwcml2YXRlTmV0OiB7IHR5cGU6ICdib29sZWFuJyB9LFxuICAgICAgICAgICAgc2Vjb25kc1BlckJsb2NrOiB7IHR5cGU6ICdudW1iZXInIH0sXG4gICAgICAgICAgICBzdGFuZGJ5VmFsaWRhdG9yczogeyB0eXBlOiAnYXJyYXknLCBpdGVtczogeyB0eXBlOiAnc3RyaW5nJyB9IH0sXG4gICAgICAgICAgfSxcbiAgICAgICAgfSxcbiAgICAgICAgZW52aXJvbm1lbnQ6IHtcbiAgICAgICAgICB0eXBlOiAnb2JqZWN0JyxcbiAgICAgICAgICByZXF1aXJlZDogWydkYXRhUGF0aCcsICdycGMnLCAnbm9kZScsICduZXR3b3JrJ10sXG4gICAgICAgICAgcHJvcGVydGllczoge1xuICAgICAgICAgICAgZGF0YVBhdGg6IHsgdHlwZTogJ3N0cmluZycgfSxcbiAgICAgICAgICAgIHJwYzoge1xuICAgICAgICAgICAgICB0eXBlOiAnb2JqZWN0JyxcbiAgICAgICAgICAgICAgcmVxdWlyZWQ6IFtdLFxuICAgICAgICAgICAgICBwcm9wZXJ0aWVzOiB7XG4gICAgICAgICAgICAgICAgaHR0cDoge1xuICAgICAgICAgICAgICAgICAgdHlwZTogJ29iamVjdCcsXG4gICAgICAgICAgICAgICAgICByZXF1aXJlZDogWydob3N0JywgJ3BvcnQnXSxcbiAgICAgICAgICAgICAgICAgIHByb3BlcnRpZXM6IHtcbiAgICAgICAgICAgICAgICAgICAgaG9zdDogeyB0eXBlOiAnc3RyaW5nJyB9LFxuICAgICAgICAgICAgICAgICAgICBwb3J0OiB7IHR5cGU6ICdudW1iZXInIH0sXG4gICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICBodHRwczoge1xuICAgICAgICAgICAgICAgICAgdHlwZTogJ29iamVjdCcsXG4gICAgICAgICAgICAgICAgICByZXF1aXJlZDogWydob3N0JywgJ3BvcnQnLCAna2V5JywgJ2NlcnQnXSxcbiAgICAgICAgICAgICAgICAgIHByb3BlcnRpZXM6IHtcbiAgICAgICAgICAgICAgICAgICAgaG9zdDogeyB0eXBlOiAnc3RyaW5nJyB9LFxuICAgICAgICAgICAgICAgICAgICBwb3J0OiB7IHR5cGU6ICdudW1iZXInIH0sXG4gICAgICAgICAgICAgICAgICAgIGtleTogeyB0eXBlOiAnc3RyaW5nJyB9LFxuICAgICAgICAgICAgICAgICAgICBjZXJ0OiB7IHR5cGU6ICdzdHJpbmcnIH0sXG4gICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgbm9kZToge1xuICAgICAgICAgICAgICB0eXBlOiAnb2JqZWN0JyxcbiAgICAgICAgICAgICAgcmVxdWlyZWQ6IFtdLFxuICAgICAgICAgICAgICBwcm9wZXJ0aWVzOiB7XG4gICAgICAgICAgICAgICAgZXh0ZXJuYWxQb3J0OiB7IHR5cGU6ICdudW1iZXInIH0sXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgbmV0d29yazoge1xuICAgICAgICAgICAgICB0eXBlOiAnb2JqZWN0JyxcbiAgICAgICAgICAgICAgcmVxdWlyZWQ6IFtdLFxuICAgICAgICAgICAgICBwcm9wZXJ0aWVzOiB7XG4gICAgICAgICAgICAgICAgbGlzdGVuVENQOiB7XG4gICAgICAgICAgICAgICAgICB0eXBlOiAnb2JqZWN0JyxcbiAgICAgICAgICAgICAgICAgIHJlcXVpcmVkOiBbJ3BvcnQnXSxcbiAgICAgICAgICAgICAgICAgIHByb3BlcnRpZXM6IHtcbiAgICAgICAgICAgICAgICAgICAgaG9zdDogeyB0eXBlOiAnc3RyaW5nJyB9LFxuICAgICAgICAgICAgICAgICAgICBwb3J0OiB7IHR5cGU6ICdudW1iZXInIH0sXG4gICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgICAgICBleHRlcm5hbEVuZHBvaW50czoge1xuICAgICAgICAgICAgICAgICAgdHlwZTogJ2FycmF5JyxcbiAgICAgICAgICAgICAgICAgIGl0ZW1zOiB7IHR5cGU6ICdzdHJpbmcnIH0sXG4gICAgICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgICAgIGNvbm5lY3RQZWVyc0RlbGF5TVM6IHsgdHlwZTogJ251bWJlcicgfSxcbiAgICAgICAgICAgICAgICBzb2NrZXRUaW1lb3V0TVM6IHsgdHlwZTogJ251bWJlcicgfSxcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgfSxcbiAgICAgICAgfSxcbiAgICAgICAgb3B0aW9uczoge1xuICAgICAgICAgIHR5cGU6ICdvYmplY3QnLFxuICAgICAgICAgIHJlcXVpcmVkOiBbJ25vZGUnLCAnbmV0d29yaycsICdycGMnXSxcbiAgICAgICAgICBwcm9wZXJ0aWVzOiB7XG4gICAgICAgICAgICBub2RlOiB7XG4gICAgICAgICAgICAgIHR5cGU6ICdvYmplY3QnLFxuICAgICAgICAgICAgICByZXF1aXJlZDogWydjb25zZW5zdXMnLCAncnBjVVJMcyddLFxuICAgICAgICAgICAgICBwcm9wZXJ0aWVzOiB7XG4gICAgICAgICAgICAgICAgY29uc2Vuc3VzOiB7XG4gICAgICAgICAgICAgICAgICB0eXBlOiAnb2JqZWN0JyxcbiAgICAgICAgICAgICAgICAgIHJlcXVpcmVkOiBbJ2VuYWJsZWQnLCAnb3B0aW9ucyddLFxuICAgICAgICAgICAgICAgICAgcHJvcGVydGllczoge1xuICAgICAgICAgICAgICAgICAgICBlbmFibGVkOiB7IHR5cGU6ICdib29sZWFuJyB9LFxuICAgICAgICAgICAgICAgICAgICBvcHRpb25zOiB7XG4gICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ29iamVjdCcsXG4gICAgICAgICAgICAgICAgICAgICAgcmVxdWlyZWQ6IFsncHJpdmF0ZUtleScsICdwcml2YXRlTmV0J10sXG4gICAgICAgICAgICAgICAgICAgICAgcHJvcGVydGllczoge1xuICAgICAgICAgICAgICAgICAgICAgICAgcHJpdmF0ZUtleTogeyB0eXBlOiAnc3RyaW5nJyB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgcHJpdmF0ZU5ldDogeyB0eXBlOiAnYm9vbGVhbicgfSxcbiAgICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHJwY1VSTHM6IHsgdHlwZTogJ2FycmF5JywgaXRlbXM6IHsgdHlwZTogJ3N0cmluZycgfSB9LFxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG5ldHdvcms6IHtcbiAgICAgICAgICAgICAgdHlwZTogJ29iamVjdCcsXG4gICAgICAgICAgICAgIHJlcXVpcmVkOiBbJ3NlZWRzJ10sXG4gICAgICAgICAgICAgIHByb3BlcnRpZXM6IHtcbiAgICAgICAgICAgICAgICBzZWVkczogeyB0eXBlOiAnYXJyYXknLCBpdGVtczogeyB0eXBlOiAnc3RyaW5nJyB9IH0sXG4gICAgICAgICAgICAgICAgbWF4Q29ubmVjdGVkUGVlcnM6IHsgdHlwZTogJ251bWJlcicgfSxcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBycGM6IHtcbiAgICAgICAgICAgICAgdHlwZTogJ29iamVjdCcsXG4gICAgICAgICAgICAgIHJlcXVpcmVkOiBbJ3NlcnZlcicsICdsaXZlSGVhbHRoQ2hlY2snLCAncmVhZHlIZWFsdGhDaGVjayddLFxuICAgICAgICAgICAgICBwcm9wZXJ0aWVzOiB7XG4gICAgICAgICAgICAgICAgc2VydmVyOiB7XG4gICAgICAgICAgICAgICAgICB0eXBlOiAnb2JqZWN0JyxcbiAgICAgICAgICAgICAgICAgIHJlcXVpcmVkOiBbJ2tlZXBBbGl2ZVRpbWVvdXQnXSxcbiAgICAgICAgICAgICAgICAgIHByb3BlcnRpZXM6IHtcbiAgICAgICAgICAgICAgICAgICAga2VlcEFsaXZlVGltZW91dDogeyB0eXBlOiAnbnVtYmVyJyB9LFxuICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIGxpdmVIZWFsdGhDaGVjazoge1xuICAgICAgICAgICAgICAgICAgdHlwZTogJ29iamVjdCcsXG4gICAgICAgICAgICAgICAgICByZXF1aXJlZDogWydycGNVUkxzJywgJ29mZnNldCcsICd0aW1lb3V0TVMnXSxcbiAgICAgICAgICAgICAgICAgIHByb3BlcnRpZXM6IHtcbiAgICAgICAgICAgICAgICAgICAgcnBjVVJMczogeyB0eXBlOiAnYXJyYXknLCBpdGVtczogeyB0eXBlOiAnc3RyaW5nJyB9IH0sXG4gICAgICAgICAgICAgICAgICAgIG9mZnNldDogeyB0eXBlOiAnbnVtYmVyJyB9LFxuICAgICAgICAgICAgICAgICAgICB0aW1lb3V0TVM6IHsgdHlwZTogJ251bWJlcicgfSxcbiAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICByZWFkeUhlYWx0aENoZWNrOiB7XG4gICAgICAgICAgICAgICAgICB0eXBlOiAnb2JqZWN0JyxcbiAgICAgICAgICAgICAgICAgIHJlcXVpcmVkOiBbJ3JwY1VSTHMnLCAnb2Zmc2V0JywgJ3RpbWVvdXRNUyddLFxuICAgICAgICAgICAgICAgICAgcHJvcGVydGllczoge1xuICAgICAgICAgICAgICAgICAgICBycGNVUkxzOiB7IHR5cGU6ICdhcnJheScsIGl0ZW1zOiB7IHR5cGU6ICdzdHJpbmcnIH0gfSxcbiAgICAgICAgICAgICAgICAgICAgb2Zmc2V0OiB7IHR5cGU6ICdudW1iZXInIH0sXG4gICAgICAgICAgICAgICAgICAgIHRpbWVvdXRNUzogeyB0eXBlOiAnbnVtYmVyJyB9LFxuICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICB9LFxuICAgICAgICB9LFxuICAgICAgfSxcbiAgICB9LFxuICAgIGNvbmZpZ1BhdGg6IGRhdGFQYXRoLFxuICB9KTtcblxuZXhwb3J0IGNsYXNzIE5FT09ORU5vZGVBZGFwdGVyIGV4dGVuZHMgTm9kZUFkYXB0ZXIge1xuICBwcml2YXRlIG11dGFibGVDb25maWc6IENvbmZpZzxOb2RlQ29uZmlnPiB8IHVuZGVmaW5lZDtcbiAgcHJpdmF0ZSBtdXRhYmxlUHJvY2VzczogZXhlY2EuRXhlY2FDaGlsZFByb2Nlc3MgfCB1bmRlZmluZWQ7XG5cbiAgcHVibGljIGNvbnN0cnVjdG9yKHtcbiAgICBtb25pdG9yLFxuICAgIG5hbWUsXG4gICAgYmluYXJ5LFxuICAgIGRhdGFQYXRoLFxuICAgIHNldHRpbmdzLFxuICB9OiB7XG4gICAgcmVhZG9ubHkgbW9uaXRvcjogTW9uaXRvcjtcbiAgICByZWFkb25seSBuYW1lOiBzdHJpbmc7XG4gICAgcmVhZG9ubHkgYmluYXJ5OiBCaW5hcnk7XG4gICAgcmVhZG9ubHkgZGF0YVBhdGg6IHN0cmluZztcbiAgICByZWFkb25seSBzZXR0aW5nczogTm9kZVNldHRpbmdzO1xuICB9KSB7XG4gICAgc3VwZXIoe1xuICAgICAgbW9uaXRvcjogbW9uaXRvci5hdCgnbmVvX29uZV9ub2RlX2FkYXB0ZXInKSxcbiAgICAgIG5hbWUsXG4gICAgICBiaW5hcnksXG4gICAgICBkYXRhUGF0aCxcbiAgICAgIHNldHRpbmdzLFxuICAgIH0pO1xuICB9XG5cbiAgcHVibGljIGdldERlYnVnKCk6IERlc2NyaWJlVGFibGUge1xuICAgIHJldHVybiBzdXBlclxuICAgICAgLmdldERlYnVnKClcbiAgICAgIC5jb25jYXQoW1xuICAgICAgICBbJ1Byb2Nlc3MgSUQnLCB0aGlzLm11dGFibGVQcm9jZXNzID09PSB1bmRlZmluZWQgPyAnbnVsbCcgOiBgJHt0aGlzLm11dGFibGVQcm9jZXNzLnBpZH1gXSxcbiAgICAgICAgWydDb25maWcgUGF0aCcsIHRoaXMubXV0YWJsZUNvbmZpZyA9PT0gdW5kZWZpbmVkID8gJ251bGwnIDogdGhpcy5tdXRhYmxlQ29uZmlnLmNvbmZpZ1BhdGhdLFxuICAgICAgXSk7XG4gIH1cblxuICBwdWJsaWMgZ2V0Tm9kZVN0YXR1cygpOiBOb2RlU3RhdHVzIHtcbiAgICByZXR1cm4ge1xuICAgICAgcnBjQWRkcmVzczogdGhpcy5nZXRBZGRyZXNzKCcvcnBjJyksXG4gICAgICB0Y3BBZGRyZXNzOiBgbG9jYWxob3N0OiR7dGhpcy5tdXRhYmxlU2V0dGluZ3MubGlzdGVuVENQUG9ydH1gLFxuICAgICAgdGVsZW1ldHJ5QWRkcmVzczogYGh0dHA6Ly9sb2NhbGhvc3Q6JHt0aGlzLm11dGFibGVTZXR0aW5ncy50ZWxlbWV0cnlQb3J0fS9tZXRyaWNzYCxcbiAgICB9O1xuICB9XG5cbiAgcHJvdGVjdGVkIGFzeW5jIGlzTGl2ZSgpOiBQcm9taXNlPGJvb2xlYW4+IHtcbiAgICByZXR1cm4gdGhpcy5jaGVja1JQQygnL2xpdmVfaGVhbHRoX2NoZWNrJyk7XG4gIH1cblxuICBwcm90ZWN0ZWQgYXN5bmMgaXNSZWFkeSgpOiBQcm9taXNlPGJvb2xlYW4+IHtcbiAgICByZXR1cm4gdGhpcy5jaGVja1JQQygnL3JlYWR5X2hlYWx0aF9jaGVjaycpO1xuICB9XG5cbiAgcHJvdGVjdGVkIGFzeW5jIGNyZWF0ZUludGVybmFsKCk6IFByb21pc2U8dm9pZD4ge1xuICAgIGF3YWl0IHRoaXMud3JpdGVTZXR0aW5ncyh0aGlzLm11dGFibGVTZXR0aW5ncyk7XG4gIH1cblxuICBwcm90ZWN0ZWQgYXN5bmMgdXBkYXRlSW50ZXJuYWwoc2V0dGluZ3M6IE5vZGVTZXR0aW5ncyk6IFByb21pc2U8dm9pZD4ge1xuICAgIGNvbnN0IHJlc3RhcnQgPSBhd2FpdCB0aGlzLndyaXRlU2V0dGluZ3Moc2V0dGluZ3MpO1xuICAgIGlmIChyZXN0YXJ0ICYmIHRoaXMubXV0YWJsZVByb2Nlc3MgIT09IHVuZGVmaW5lZCkge1xuICAgICAgYXdhaXQgdGhpcy5zdG9wKCk7XG4gICAgICBhd2FpdCB0aGlzLnN0YXJ0KCk7XG4gICAgfVxuICB9XG5cbiAgcHJvdGVjdGVkIGFzeW5jIHN0YXJ0SW50ZXJuYWwoKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgaWYgKHRoaXMubXV0YWJsZVByb2Nlc3MgPT09IHVuZGVmaW5lZCkge1xuICAgICAgY29uc3QgY2hpbGQgPSBleGVjYSh0aGlzLmJpbmFyeS5jbWQsIHRoaXMuYmluYXJ5LmZpcnN0QXJncy5jb25jYXQoWydzdGFydCcsICdub2RlJywgdGhpcy5kYXRhUGF0aF0pLCB7XG4gICAgICAgIC8vIEB0cy1pZ25vcmVcbiAgICAgICAgd2luZG93c0hpZGU6IHRydWUsXG4gICAgICAgIHN0ZGlvOiAnaWdub3JlJyxcbiAgICAgIH0pO1xuXG4gICAgICB0aGlzLm11dGFibGVQcm9jZXNzID0gY2hpbGQ7XG4gICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmUgbm8tZmxvYXRpbmctcHJvbWlzZXNcbiAgICAgIGNoaWxkXG4gICAgICAgIC50aGVuKCgpID0+IHtcbiAgICAgICAgICB0aGlzLm1vbml0b3IubG9nKHtcbiAgICAgICAgICAgIG5hbWU6ICduZW9fbm9kZV9hZGFwdGVyX25vZGVfZXhpdCcsXG4gICAgICAgICAgICBtZXNzYWdlOiAnQ2hpbGQgcHJvY2VzcyBleGl0ZWQnLFxuICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgdGhpcy5tdXRhYmxlUHJvY2VzcyA9IHVuZGVmaW5lZDtcbiAgICAgICAgfSlcbiAgICAgICAgLmNhdGNoKChlcnJvcjogRXJyb3IpID0+IHtcbiAgICAgICAgICB0aGlzLm1vbml0b3IubG9nRXJyb3Ioe1xuICAgICAgICAgICAgbmFtZTogJ25lb19ub2RlX2FkYXB0ZXJfbm9kZV9lcnJvcicsXG4gICAgICAgICAgICBtZXNzYWdlOiAnQ2hpbGQgcHJvY2VzcyBleGl0ZWQgd2l0aCBhbiBlcnJvci4nLFxuICAgICAgICAgICAgZXJyb3IsXG4gICAgICAgICAgfSk7XG5cbiAgICAgICAgICB0aGlzLm11dGFibGVQcm9jZXNzID0gdW5kZWZpbmVkO1xuICAgICAgICB9KTtcbiAgICB9XG4gIH1cblxuICBwcm90ZWN0ZWQgYXN5bmMgc3RvcEludGVybmFsKCk6IFByb21pc2U8dm9pZD4ge1xuICAgIGNvbnN0IGNoaWxkID0gdGhpcy5tdXRhYmxlUHJvY2VzcztcbiAgICB0aGlzLm11dGFibGVQcm9jZXNzID0gdW5kZWZpbmVkO1xuICAgIGlmIChjaGlsZCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICBhd2FpdCBraWxsUHJvY2VzcyhjaGlsZC5waWQpO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgY2hlY2tSUEMocnBjUGF0aDogc3RyaW5nKTogUHJvbWlzZTxib29sZWFuPiB7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgZmV0Y2godGhpcy5nZXRBZGRyZXNzKHJwY1BhdGgpKTtcblxuICAgICAgcmV0dXJuIHJlc3BvbnNlLm9rO1xuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICBpZiAoZXJyb3IuY29kZSAhPT0gJ0VDT05OUkVGVVNFRCcpIHtcbiAgICAgICAgdGhpcy5tb25pdG9yLndpdGhEYXRhKHsgW3RoaXMubW9uaXRvci5sYWJlbHMuSFRUUF9QQVRIXTogcnBjUGF0aCB9KS5sb2dFcnJvcih7XG4gICAgICAgICAgbmFtZTogJ2h0dHBfY2xpZW50X3JlcXVlc3QnLFxuICAgICAgICAgIG1lc3NhZ2U6ICdGYWlsZWQgdG8gY2hlY2sgUlBDLicsXG4gICAgICAgICAgZXJyb3IsXG4gICAgICAgIH0pO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBnZXRBZGRyZXNzKHJwY1BhdGg6IHN0cmluZyk6IHN0cmluZyB7XG4gICAgcmV0dXJuIGBodHRwOi8vbG9jYWxob3N0OiR7dGhpcy5tdXRhYmxlU2V0dGluZ3MucnBjUG9ydH0ke3JwY1BhdGh9YDtcbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgd3JpdGVTZXR0aW5ncyhzZXR0aW5nczogTm9kZVNldHRpbmdzKTogUHJvbWlzZTxib29sZWFuPiB7XG4gICAgbGV0IGNvbmZpZyA9IHRoaXMubXV0YWJsZUNvbmZpZztcbiAgICBpZiAoY29uZmlnID09PSB1bmRlZmluZWQpIHtcbiAgICAgIGNvbmZpZyA9IGNyZWF0ZU5vZGVDb25maWcoe1xuICAgICAgICBkYXRhUGF0aDogdGhpcy5kYXRhUGF0aCxcbiAgICAgICAgZGVmYXVsdENvbmZpZzogdGhpcy5jcmVhdGVDb25maWcoc2V0dGluZ3MpLFxuICAgICAgfSk7XG5cbiAgICAgIHRoaXMubXV0YWJsZUNvbmZpZyA9IGNvbmZpZztcbiAgICB9XG5cbiAgICBjb25zdCBub2RlQ29uZmlnID0gYXdhaXQgY29uZmlnLmNvbmZpZyQucGlwZSh0YWtlKDEpKS50b1Byb21pc2UoKTtcbiAgICBjb25zdCBuZXdOb2RlQ29uZmlnID0gdGhpcy5jcmVhdGVDb25maWcoc2V0dGluZ3MpO1xuICAgIGF3YWl0IGZzLmVuc3VyZURpcihuZXdOb2RlQ29uZmlnLmVudmlyb25tZW50LmRhdGFQYXRoKTtcbiAgICBhd2FpdCBjb25maWcudXBkYXRlKHsgY29uZmlnOiBuZXdOb2RlQ29uZmlnIH0pO1xuXG4gICAgcmV0dXJuICEoXG4gICAgICBfLmlzRXF1YWwobm9kZUNvbmZpZy5zZXR0aW5ncywgbmV3Tm9kZUNvbmZpZy5zZXR0aW5ncykgJiZcbiAgICAgIF8uaXNFcXVhbChub2RlQ29uZmlnLmVudmlyb25tZW50LCBuZXdOb2RlQ29uZmlnLmVudmlyb25tZW50KVxuICAgICk7XG4gIH1cblxuICBwcml2YXRlIGNyZWF0ZUNvbmZpZyhzZXR0aW5nczogTm9kZVNldHRpbmdzKTogTm9kZUNvbmZpZyB7XG4gICAgcmV0dXJuIHtcbiAgICAgIGxvZzoge1xuICAgICAgICBsZXZlbDogJ2luZm8nLFxuICAgICAgICBtYXhTaXplOiAxMCAqIDEwMjQgKiAxMDI0LFxuICAgICAgICBtYXhGaWxlczogNSxcbiAgICAgIH0sXG4gICAgICBzZXR0aW5nczoge1xuICAgICAgICB0ZXN0OiBzZXR0aW5ncy5pc1Rlc3ROZXQsXG4gICAgICAgIHByaXZhdGVOZXQ6IHNldHRpbmdzLnByaXZhdGVOZXQsXG4gICAgICAgIHNlY29uZHNQZXJCbG9jazogc2V0dGluZ3Muc2Vjb25kc1BlckJsb2NrLFxuICAgICAgICBzdGFuZGJ5VmFsaWRhdG9yczogc2V0dGluZ3Muc3RhbmRieVZhbGlkYXRvcnMsXG4gICAgICAgIGFkZHJlc3M6IHNldHRpbmdzLmFkZHJlc3MsXG4gICAgICB9LFxuICAgICAgZW52aXJvbm1lbnQ6IHtcbiAgICAgICAgZGF0YVBhdGg6IHBhdGgucmVzb2x2ZSh0aGlzLmRhdGFQYXRoLCAnY2hhaW4nKSxcbiAgICAgICAgcnBjOiB7XG4gICAgICAgICAgaHR0cDoge1xuICAgICAgICAgICAgcG9ydDogc2V0dGluZ3MucnBjUG9ydCxcbiAgICAgICAgICAgIGhvc3Q6ICcwLjAuMC4wJyxcbiAgICAgICAgICB9LFxuICAgICAgICB9LFxuICAgICAgICBub2RlOiB7XG4gICAgICAgICAgZXh0ZXJuYWxQb3J0OiBzZXR0aW5ncy5saXN0ZW5UQ1BQb3J0LFxuICAgICAgICB9LFxuICAgICAgICBuZXR3b3JrOiB7XG4gICAgICAgICAgbGlzdGVuVENQOiB7XG4gICAgICAgICAgICBwb3J0OiBzZXR0aW5ncy5saXN0ZW5UQ1BQb3J0LFxuICAgICAgICAgICAgaG9zdDogJzAuMC4wLjAnLFxuICAgICAgICAgIH0sXG4gICAgICAgIH0sXG4gICAgICAgIHRlbGVtZXRyeToge1xuICAgICAgICAgIHBvcnQ6IHNldHRpbmdzLnRlbGVtZXRyeVBvcnQsXG4gICAgICAgIH0sXG4gICAgICB9LFxuICAgICAgb3B0aW9uczoge1xuICAgICAgICBub2RlOiB7XG4gICAgICAgICAgY29uc2Vuc3VzOiBzZXR0aW5ncy5jb25zZW5zdXMsXG4gICAgICAgICAgcnBjVVJMczogc2V0dGluZ3MucnBjRW5kcG9pbnRzLFxuICAgICAgICB9LFxuICAgICAgICBuZXR3b3JrOiB7XG4gICAgICAgICAgc2VlZHM6IHNldHRpbmdzLnNlZWRzLFxuICAgICAgICB9LFxuICAgICAgICBycGM6IHtcbiAgICAgICAgICBzZXJ2ZXI6IHtcbiAgICAgICAgICAgIGtlZXBBbGl2ZVRpbWVvdXQ6IDYwMDAwLFxuICAgICAgICAgIH0sXG4gICAgICAgICAgbGl2ZUhlYWx0aENoZWNrOiB7XG4gICAgICAgICAgICBycGNVUkxzOiBzZXR0aW5ncy5ycGNFbmRwb2ludHMsXG4gICAgICAgICAgICBvZmZzZXQ6IDEsXG4gICAgICAgICAgICB0aW1lb3V0TVM6IDUwMDAsXG4gICAgICAgICAgfSxcbiAgICAgICAgICByZWFkeUhlYWx0aENoZWNrOiB7XG4gICAgICAgICAgICBycGNVUkxzOiBzZXR0aW5ncy5ycGNFbmRwb2ludHMsXG4gICAgICAgICAgICBvZmZzZXQ6IDEsXG4gICAgICAgICAgICB0aW1lb3V0TVM6IDUwMDAsXG4gICAgICAgICAgfSxcbiAgICAgICAgfSxcbiAgICAgIH0sXG4gICAgfTtcbiAgfVxufVxuIl19
