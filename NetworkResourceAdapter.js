"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const client_common_1 = require("@neo-one/client-common");
const client_core_1 = require("@neo-one/client-core");
const client_full_core_1 = require("@neo-one/client-full-core");
const node_core_1 = require("@neo-one/node-core");
const server_plugin_1 = require("@neo-one/server-plugin");
const utils_1 = require("@neo-one/utils");
const fs = tslib_1.__importStar(require("fs-extra"));
const path = tslib_1.__importStar(require("path"));
const rxjs_1 = require("rxjs");
const operators_1 = require("rxjs/operators");
const constants_1 = require("./constants");
const node_1 = require("./node");
const types_1 = require("./types");
const NODES_PATH = 'nodes';
const NODES_OPTIONS_PATH = 'options';
const DEFAULT_MAIN_SEEDS = [
    { type: 'tcp', host: '159.69.91.74', port: 10313 },
    { type: 'tcp', host: '159.69.91.74', port: 10323 },
    { type: 'tcp', host: '95.216.216.41', port: 10333 },
    { type: 'tcp', host: '95.216.216.41', port: 10343 },
];
const DEFAULT_TEST_SEEDS = [
    { type: 'tcp', host: 'seed1.neo.org', port: 20333 },
    { type: 'tcp', host: 'seed2.neo.org', port: 20333 },
    { type: 'tcp', host: 'seed3.neo.org', port: 20333 },
    { type: 'tcp', host: 'seed4.neo.org', port: 20333 },
    { type: 'tcp', host: 'seed5.neo.org', port: 20333 },
];
class NetworkResourceAdapter {
    constructor({ name, type, dataPath, resourceType, nodesPath, nodesOptionsPath, nodes: nodesIn, }) {
        this.live = async () => {
            await Promise.all(this.nodes.map(async (node) => {
                try {
                    await node.live(30);
                }
                catch (_a) {
                    await node.stop();
                    await node.start();
                    await node.live(30);
                }
            }));
        };
        this.ready = async () => {
            await Promise.all(this.nodes.map(async (node) => {
                try {
                    await node.ready(30);
                }
                catch (_a) {
                    await node.stop();
                    await node.start();
                    await node.ready(30);
                }
            }));
        };
        this.name = name;
        this.type = type;
        this.dataPath = dataPath;
        this.resourceType = resourceType;
        this.nodesPath = nodesPath;
        this.nodesOptionsPath = nodesOptionsPath;
        this.nodes$ = new rxjs_1.BehaviorSubject(nodesIn);
        this.state = 'stopped';
        this.resource$ = this.nodes$.pipe(operators_1.switchMap((nodes) => rxjs_1.combineLatest(rxjs_1.timer(0, 2500), rxjs_1.combineLatest(nodes.map((node) => node.node$))).pipe(utils_1.mergeScanLatest(
        // tslint:disable-next-line no-unused
        async (_prev, [_time, currentNodes]) => {
            const readyNode = currentNodes.find((node) => node.ready) ||
                currentNodes.find((node) => node.live) ||
                currentNodes[0];
            let height;
            let peers;
            if (readyNode !== undefined) {
                const client = new client_full_core_1.ReadClient(new client_core_1.NEOONEDataProvider({
                    network: this.name,
                    rpcURL: readyNode.rpcAddress,
                }));
                try {
                    [height, peers] = await Promise.all([client.getBlockCount(), client.getConnectedPeers()]);
                }
                catch (_a) {
                    // ignore errors
                }
            }
            return {
                plugin: this.resourceType.plugin.name,
                resourceType: this.resourceType.name,
                name: this.name,
                baseName: this.name,
                state: this.state,
                type: this.type,
                height,
                peers: peers === undefined ? peers : peers.length,
                nodes: currentNodes,
                live: this.live,
                ready: this.ready,
            };
        }))), operators_1.shareReplay(1));
    }
    static async init(options) {
        const staticOptions = this.getStaticOptions(options);
        const files = await fs.readdir(staticOptions.nodesOptionsPath);
        const nodeOptionss = await Promise.all(files.map(async (file) => this.readNodeOptions(staticOptions, path.resolve(staticOptions.nodesOptionsPath, file))));
        const nodes = nodeOptionss.map((nodeOptions) => this.createNodeAdapter(staticOptions, nodeOptions));
        return new this({
            name: staticOptions.name,
            binary: staticOptions.binary,
            dataPath: staticOptions.dataPath,
            portAllocator: staticOptions.portAllocator,
            resourceType: staticOptions.resourceType,
            nodesPath: staticOptions.nodesPath,
            nodesOptionsPath: staticOptions.nodesOptionsPath,
            type: nodeOptionss[0].type,
            nodes,
        });
    }
    static create(adapterOptions, options) {
        const staticOptions = this.getStaticOptions(adapterOptions);
        let type;
        let nodeSettings;
        if (staticOptions.name === constants_1.constants.NETWORK_NAME.MAIN) {
            type = types_1.NetworkType.Main;
            nodeSettings = [[staticOptions.name, this.getMainSettings(staticOptions)]];
        }
        else if (staticOptions.name === constants_1.constants.NETWORK_NAME.TEST) {
            type = types_1.NetworkType.Test;
            nodeSettings = [[staticOptions.name, this.getTestSettings(staticOptions)]];
        }
        else {
            type = types_1.NetworkType.Private;
            nodeSettings = this.getPrivateNetSettings(staticOptions);
        }
        const nodeOptionss = nodeSettings.map(([name, settings]) => ({
            type,
            name,
            dataPath: path.resolve(staticOptions.nodesPath, name),
            settings,
            options,
        }));
        const nodeOptionsAndNodes = nodeOptionss.map((nodeOptions) => [
            nodeOptions,
            this.createNodeAdapter(staticOptions, nodeOptions),
        ]);
        return new server_plugin_1.TaskList({
            initialContext: {
                resourceAdapter: new this({
                    name: staticOptions.name,
                    binary: staticOptions.binary,
                    dataPath: staticOptions.dataPath,
                    portAllocator: staticOptions.portAllocator,
                    resourceType: staticOptions.resourceType,
                    nodesPath: staticOptions.nodesPath,
                    nodesOptionsPath: staticOptions.nodesOptionsPath,
                    type: nodeSettings[0][1].type,
                    nodes: nodeOptionsAndNodes.map((value) => value[1]),
                }),
                dependencies: [],
            },
            tasks: [
                {
                    title: 'Create data directories',
                    task: async () => {
                        await Promise.all([fs.ensureDir(staticOptions.nodesPath), fs.ensureDir(staticOptions.nodesOptionsPath)]);
                    },
                },
                {
                    title: 'Create nodes',
                    task: () => new server_plugin_1.TaskList({
                        tasks: nodeOptionsAndNodes.map(([nodeOptions, node]) => ({
                            title: `Create node ${nodeOptions.name}`,
                            task: async () => {
                                await this.writeNodeOptions(staticOptions, nodeOptions);
                                await node.create();
                            },
                        })),
                        concurrent: true,
                    }),
                },
            ],
        });
    }
    static getStaticOptions(options) {
        return {
            name: options.name,
            binary: options.binary,
            dataPath: options.dataPath,
            portAllocator: options.portAllocator,
            resourceType: options.resourceType,
            nodesPath: path.resolve(options.dataPath, NODES_PATH),
            nodesOptionsPath: path.resolve(options.dataPath, NODES_OPTIONS_PATH),
        };
    }
    static getPrivateNetSettings(options) {
        const primaryPrivateKey = client_common_1.crypto.wifToPrivateKey(constants_1.constants.PRIVATE_NET_PRIVATE_KEY, client_common_1.common.NEO_PRIVATE_KEY_VERSION);
        const primaryPublicKey = client_common_1.common.stringToECPoint(constants_1.constants.PRIVATE_NET_PUBLIC_KEY);
        client_common_1.crypto.addPublicKey(primaryPrivateKey, primaryPublicKey);
        const primaryAddress = client_common_1.common.uInt160ToString(client_common_1.crypto.privateKeyToScriptHash(primaryPrivateKey));
        const configurationName = `${options.name}-0`;
        const configuration = [
            {
                name: configurationName,
                rpcPort: this.getRPCPort(options, configurationName),
                listenTCPPort: this.getListenTCPPort(options, configurationName),
                telemetryPort: this.getTelemetryPort(options, configurationName),
                privateKey: primaryPrivateKey,
                publicKey: primaryPublicKey,
            },
        ];
        const secondsPerBlock = 15;
        const standbyValidators = configuration.map(({ publicKey }) => client_common_1.common.ecPointToString(publicKey));
        return configuration.map((config) => {
            const { name, rpcPort, listenTCPPort, telemetryPort, privateKey } = config;
            const otherConfiguration = configuration.filter(({ name: otherName }) => name !== otherName);
            const settings = {
                type: types_1.NetworkType.Private,
                isTestNet: false,
                rpcPort,
                listenTCPPort,
                telemetryPort,
                privateNet: true,
                secondsPerBlock,
                standbyValidators,
                address: primaryAddress,
                consensus: {
                    enabled: true,
                    options: {
                        privateKey: client_common_1.common.privateKeyToString(privateKey),
                        privateNet: true,
                    },
                },
                seeds: otherConfiguration.map((otherConfig) => node_core_1.createEndpoint({
                    type: 'tcp',
                    host: 'localhost',
                    port: otherConfig.listenTCPPort,
                })),
                rpcEndpoints: otherConfiguration.map((otherConfig) => `http://localhost:${otherConfig.rpcPort}/rpc`),
            };
            return [name, settings];
        });
    }
    static getMainSettings(options) {
        return {
            type: types_1.NetworkType.Main,
            isTestNet: false,
            rpcPort: this.getRPCPort(options, options.name),
            listenTCPPort: this.getListenTCPPort(options, options.name),
            telemetryPort: this.getTelemetryPort(options, options.name),
            consensus: {
                enabled: false,
                options: {
                    privateKey: 'doesntmatter',
                    privateNet: false,
                },
            },
            seeds: DEFAULT_MAIN_SEEDS.map(node_core_1.createEndpoint),
            rpcEndpoints: [
                'http://192.168.88.196:10332',
            ],
        };
    }
    static getTestSettings(options) {
        return {
            type: types_1.NetworkType.Test,
            isTestNet: true,
            rpcPort: this.getRPCPort(options, options.name),
            listenTCPPort: this.getListenTCPPort(options, options.name),
            telemetryPort: this.getTelemetryPort(options, options.name),
            consensus: {
                enabled: false,
                options: {
                    privateKey: 'doesntmatter',
                    privateNet: false,
                },
            },
            seeds: DEFAULT_TEST_SEEDS.map(node_core_1.createEndpoint),
            rpcEndpoints: [
                'http://test1.cityofzion.io:8880',
                'http://test2.cityofzion.io:8880',
                'http://test3.cityofzion.io:8880',
                'http://test4.cityofzion.io:8880',
                'http://test5.cityofzion.io:8880',
                'https://seed1.neo.org:20332',
                'http://seed2.neo.org:20332',
                'http://seed3.neo.org:20332',
                'http://seed4.neo.org:20332',
                'http://seed5.neo.org:20332',
            ],
        };
    }
    static createNodeAdapter({ resourceType, binary }, { name, dataPath, settings, options }) {
        if (options.type === undefined || options.type === 'neo-one') {
            return new node_1.NEOONENodeAdapter({
                monitor: resourceType.plugin.monitor,
                name,
                binary,
                dataPath,
                settings,
            });
        }
        throw new Error(`Unknown Node type ${options.type}`);
    }
    static getRPCPort(options, name) {
        return this.getPort(options, `${name}-rpc-http`);
    }
    static getListenTCPPort(options, name) {
        return this.getPort(options, `${name}-listen-tcp`);
    }
    static getTelemetryPort(options, name) {
        return this.getPort(options, `${name}-telemetry`);
    }
    static getPort(options, name) {
        return options.portAllocator.allocatePort({
            plugin: options.resourceType.plugin.name,
            resourceType: options.resourceType.name,
            resource: options.name,
            name,
        });
    }
    static async writeNodeOptions(options, nodeOptions) {
        try {
            const nodeOptionsPath = this.getNodeOptionsPath(options, nodeOptions.name);
            await fs.writeFile(nodeOptionsPath, JSON.stringify(nodeOptions));
        }
        catch (error) {
            options.resourceType.plugin.monitor
                .withData({
                [utils_1.labels.NODE_NAME]: nodeOptions.name,
            })
                .logError({
                name: 'neo_network_resource_adapter_write_node_options_error',
                message: 'Failed to persist node options',
                error,
            });
            throw error;
        }
    }
    static async readNodeOptions({ resourceType }, nodeOptionsPath) {
        try {
            const contents = await fs.readFile(nodeOptionsPath, 'utf8');
            return JSON.parse(contents);
        }
        catch (error) {
            resourceType.plugin.monitor
                .withData({
                [utils_1.labels.NODE_OPTIONSPATH]: nodeOptionsPath,
            })
                .logError({
                name: 'neo_network_resource_adapter_read_node_options_error',
                message: 'Failed to read node options.',
                error,
            });
            throw error;
        }
    }
    static getNodeOptionsPath({ nodesOptionsPath }, name) {
        return path.resolve(nodesOptionsPath, `${name}.json`);
    }
    getDebug() {
        return [
            ['Type', this.type],
            ['Data Path', this.dataPath],
            ['Nodes Path', this.nodesPath],
            ['Nodes Options Path', this.nodesOptionsPath],
            ['State', this.state],
            [
                'Nodes',
                {
                    type: 'describe',
                    table: this.nodes.map((node) => [
                        node.name,
                        { type: 'describe', table: node.getDebug() },
                    ]),
                },
            ],
        ];
    }
    get nodes() {
        return this.nodes$.value;
    }
    async destroy() {
        this.nodes$.next([]);
    }
    delete(_options) {
        return new server_plugin_1.TaskList({
            tasks: [
                {
                    title: 'Clean up local files',
                    task: async () => {
                        await fs.remove(this.dataPath);
                    },
                },
            ],
        });
    }
    start(_options) {
        return new server_plugin_1.TaskList({
            tasks: [
                {
                    title: 'Start nodes',
                    task: () => new server_plugin_1.TaskList({
                        tasks: this.nodes.map((node) => ({
                            title: `Start node ${node.name}`,
                            task: async () => {
                                await node.start();
                            },
                        })),
                        concurrent: true,
                    }),
                },
                {
                    title: 'Wait for network to be alive',
                    task: async () => {
                        const start = utils_1.utils.nowSeconds();
                        await this.live();
                        this.resourceType.plugin.monitor.log({
                            name: 'neo_network_resource_adapter_node_live',
                            message: `Started in ${utils_1.utils.nowSeconds() - start} seconds`,
                        });
                    },
                },
            ],
        });
    }
    stop(_options) {
        return new server_plugin_1.TaskList({
            tasks: [
                {
                    title: 'Stop nodes',
                    task: () => new server_plugin_1.TaskList({
                        tasks: this.nodes.map((node) => ({
                            title: `Stop node ${node.name}`,
                            task: async () => {
                                await node.stop();
                            },
                        })),
                        concurrent: true,
                    }),
                },
            ],
        });
    }
}
exports.NetworkResourceAdapter = NetworkResourceAdapter;

//# sourceMappingURL=data:application/json;charset=utf8;base64,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b3VyY2VBZGFwdGVyLmpzIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgY29tbW9uLCBjcnlwdG8gfSBmcm9tICdAbmVvLW9uZS9jbGllbnQtY29tbW9uJztcbmltcG9ydCB7IE5FT09ORURhdGFQcm92aWRlciB9IGZyb20gJ0BuZW8tb25lL2NsaWVudC1jb3JlJztcbmltcG9ydCB7IFJlYWRDbGllbnQgfSBmcm9tICdAbmVvLW9uZS9jbGllbnQtZnVsbC1jb3JlJztcbmltcG9ydCB7IGNyZWF0ZUVuZHBvaW50LCBFbmRwb2ludENvbmZpZyB9IGZyb20gJ0BuZW8tb25lL25vZGUtY29yZSc7XG5pbXBvcnQge1xuICBCaW5hcnksXG4gIERlc2NyaWJlVGFibGUsXG4gIFBvcnRBbGxvY2F0b3IsXG4gIFJlc291cmNlU3RhdGUsXG4gIFN1YkRlc2NyaWJlVGFibGUsXG4gIFRhc2tMaXN0LFxufSBmcm9tICdAbmVvLW9uZS9zZXJ2ZXItcGx1Z2luJztcbmltcG9ydCB7IGxhYmVscywgbWVyZ2VTY2FuTGF0ZXN0LCB1dGlscyB9IGZyb20gJ0BuZW8tb25lL3V0aWxzJztcbmltcG9ydCAqIGFzIGZzIGZyb20gJ2ZzLWV4dHJhJztcbmltcG9ydCAqIGFzIHBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgeyBCZWhhdmlvclN1YmplY3QsIGNvbWJpbmVMYXRlc3QsIE9ic2VydmFibGUsIHRpbWVyIH0gZnJvbSAncnhqcyc7XG5pbXBvcnQgeyBzaGFyZVJlcGxheSwgc3dpdGNoTWFwIH0gZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xuaW1wb3J0IHsgY29uc3RhbnRzIH0gZnJvbSAnLi9jb25zdGFudHMnO1xuaW1wb3J0IHsgTmV0d29yaywgTmV0d29ya1Jlc291cmNlT3B0aW9ucywgTmV0d29ya1Jlc291cmNlVHlwZSB9IGZyb20gJy4vTmV0d29ya1Jlc291cmNlVHlwZSc7XG5pbXBvcnQgeyBORU9PTkVOb2RlQWRhcHRlciwgTm9kZSwgTm9kZUFkYXB0ZXIgfSBmcm9tICcuL25vZGUnO1xuaW1wb3J0IHsgTmV0d29ya1R5cGUsIE5vZGVTZXR0aW5ncyB9IGZyb20gJy4vdHlwZXMnO1xuXG5leHBvcnQgaW50ZXJmYWNlIE5vZGVPcHRpb25zIHtcbiAgcmVhZG9ubHkgdHlwZTogTmV0d29ya1R5cGU7XG4gIHJlYWRvbmx5IG5hbWU6IHN0cmluZztcbiAgcmVhZG9ubHkgZGF0YVBhdGg6IHN0cmluZztcbiAgcmVhZG9ubHkgc2V0dGluZ3M6IE5vZGVTZXR0aW5ncztcbiAgcmVhZG9ubHkgb3B0aW9uczogTmV0d29ya1Jlc291cmNlT3B0aW9ucztcbn1cblxuY29uc3QgTk9ERVNfUEFUSCA9ICdub2Rlcyc7XG5jb25zdCBOT0RFU19PUFRJT05TX1BBVEggPSAnb3B0aW9ucyc7XG5cbmV4cG9ydCBpbnRlcmZhY2UgTmV0d29ya1Jlc291cmNlQWRhcHRlckluaXRPcHRpb25zIHtcbiAgcmVhZG9ubHkgbmFtZTogc3RyaW5nO1xuICByZWFkb25seSBkYXRhUGF0aDogc3RyaW5nO1xuICByZWFkb25seSBiaW5hcnk6IEJpbmFyeTtcbiAgcmVhZG9ubHkgcG9ydEFsbG9jYXRvcjogUG9ydEFsbG9jYXRvcjtcbiAgcmVhZG9ubHkgcmVzb3VyY2VUeXBlOiBOZXR3b3JrUmVzb3VyY2VUeXBlO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIE5ldHdvcmtSZXNvdXJjZUFkYXB0ZXJTdGF0aWNPcHRpb25zIGV4dGVuZHMgTmV0d29ya1Jlc291cmNlQWRhcHRlckluaXRPcHRpb25zIHtcbiAgcmVhZG9ubHkgbm9kZXNQYXRoOiBzdHJpbmc7XG4gIHJlYWRvbmx5IG5vZGVzT3B0aW9uc1BhdGg6IHN0cmluZztcbn1cblxuZXhwb3J0IGludGVyZmFjZSBOZXR3b3JrUmVzb3VyY2VBZGFwdGVyT3B0aW9ucyBleHRlbmRzIE5ldHdvcmtSZXNvdXJjZUFkYXB0ZXJTdGF0aWNPcHRpb25zIHtcbiAgcmVhZG9ubHkgdHlwZTogTmV0d29ya1R5cGU7XG4gIHJlYWRvbmx5IG5vZGVzOiBSZWFkb25seUFycmF5PE5vZGVBZGFwdGVyPjtcbn1cblxuY29uc3QgREVGQVVMVF9NQUlOX1NFRURTOiBSZWFkb25seUFycmF5PEVuZHBvaW50Q29uZmlnPiA9IFtcbiAgeyB0eXBlOiAndGNwJywgaG9zdDogJ25vZGUxLm55YzMuYnJpZGdlcHJvdG9jb2wuaW8nLCBwb3J0OiAxMDMzMyB9LFxuICB7IHR5cGU6ICd0Y3AnLCBob3N0OiAnbm9kZTIubnljMy5icmlkZ2Vwcm90b2NvbC5pbycsIHBvcnQ6IDEwMzMzIH0sXG4gIHsgdHlwZTogJ3RjcCcsIGhvc3Q6ICdzZWVkMS5zd2l0Y2hlby5jb20nLCBwb3J0OiAxMDMzMyB9LFxuICB7IHR5cGU6ICd0Y3AnLCBob3N0OiAnc2VlZDIuc3dpdGNoZW8uY29tJywgcG9ydDogMTAzMzMgfSxcbiAgeyB0eXBlOiAndGNwJywgaG9zdDogJ3NlZWQzLnN3aXRjaGVvLmNvbScsIHBvcnQ6IDEwMzMzIH0sXG4gIHsgdHlwZTogJ3RjcCcsIGhvc3Q6ICdzZWVkMS5hcGhlbGlvbi1uZW8uY29tJywgcG9ydDogMTAzMzMgfSxcbiAgeyB0eXBlOiAndGNwJywgaG9zdDogJ3NlZWQyLmFwaGVsaW9uLW5lby5jb20nLCBwb3J0OiAxMDMzMyB9LFxuICB7IHR5cGU6ICd0Y3AnLCBob3N0OiAnc2VlZDMuYXBoZWxpb24tbmVvLmNvbScsIHBvcnQ6IDEwMzMzIH0sXG4gIHsgdHlwZTogJ3RjcCcsIGhvc3Q6ICdzZWVkNC5hcGhlbGlvbi1uZW8uY29tJywgcG9ydDogMTAzMzMgfSxcbl07XG5cbmNvbnN0IERFRkFVTFRfVEVTVF9TRUVEUzogUmVhZG9ubHlBcnJheTxFbmRwb2ludENvbmZpZz4gPSBbXG4gIHsgdHlwZTogJ3RjcCcsIGhvc3Q6ICdzZWVkMS5uZW8ub3JnJywgcG9ydDogMjAzMzMgfSxcbiAgeyB0eXBlOiAndGNwJywgaG9zdDogJ3NlZWQyLm5lby5vcmcnLCBwb3J0OiAyMDMzMyB9LFxuICB7IHR5cGU6ICd0Y3AnLCBob3N0OiAnc2VlZDMubmVvLm9yZycsIHBvcnQ6IDIwMzMzIH0sXG4gIHsgdHlwZTogJ3RjcCcsIGhvc3Q6ICdzZWVkNC5uZW8ub3JnJywgcG9ydDogMjAzMzMgfSxcbiAgeyB0eXBlOiAndGNwJywgaG9zdDogJ3NlZWQ1Lm5lby5vcmcnLCBwb3J0OiAyMDMzMyB9LFxuXTtcblxuZXhwb3J0IGNsYXNzIE5ldHdvcmtSZXNvdXJjZUFkYXB0ZXIge1xuICBwdWJsaWMgc3RhdGljIGFzeW5jIGluaXQob3B0aW9uczogTmV0d29ya1Jlc291cmNlQWRhcHRlckluaXRPcHRpb25zKTogUHJvbWlzZTxOZXR3b3JrUmVzb3VyY2VBZGFwdGVyPiB7XG4gICAgY29uc3Qgc3RhdGljT3B0aW9ucyA9IHRoaXMuZ2V0U3RhdGljT3B0aW9ucyhvcHRpb25zKTtcbiAgICBjb25zdCBmaWxlcyA9IGF3YWl0IGZzLnJlYWRkaXIoc3RhdGljT3B0aW9ucy5ub2Rlc09wdGlvbnNQYXRoKTtcbiAgICBjb25zdCBub2RlT3B0aW9uc3MgPSBhd2FpdCBQcm9taXNlLmFsbChcbiAgICAgIGZpbGVzLm1hcChhc3luYyAoZmlsZSkgPT5cbiAgICAgICAgdGhpcy5yZWFkTm9kZU9wdGlvbnMoc3RhdGljT3B0aW9ucywgcGF0aC5yZXNvbHZlKHN0YXRpY09wdGlvbnMubm9kZXNPcHRpb25zUGF0aCwgZmlsZSkpLFxuICAgICAgKSxcbiAgICApO1xuXG4gICAgY29uc3Qgbm9kZXMgPSBub2RlT3B0aW9uc3MubWFwKChub2RlT3B0aW9ucykgPT4gdGhpcy5jcmVhdGVOb2RlQWRhcHRlcihzdGF0aWNPcHRpb25zLCBub2RlT3B0aW9ucykpO1xuXG4gICAgcmV0dXJuIG5ldyB0aGlzKHtcbiAgICAgIG5hbWU6IHN0YXRpY09wdGlvbnMubmFtZSxcbiAgICAgIGJpbmFyeTogc3RhdGljT3B0aW9ucy5iaW5hcnksXG4gICAgICBkYXRhUGF0aDogc3RhdGljT3B0aW9ucy5kYXRhUGF0aCxcbiAgICAgIHBvcnRBbGxvY2F0b3I6IHN0YXRpY09wdGlvbnMucG9ydEFsbG9jYXRvcixcbiAgICAgIHJlc291cmNlVHlwZTogc3RhdGljT3B0aW9ucy5yZXNvdXJjZVR5cGUsXG4gICAgICBub2Rlc1BhdGg6IHN0YXRpY09wdGlvbnMubm9kZXNQYXRoLFxuICAgICAgbm9kZXNPcHRpb25zUGF0aDogc3RhdGljT3B0aW9ucy5ub2Rlc09wdGlvbnNQYXRoLFxuICAgICAgdHlwZTogbm9kZU9wdGlvbnNzWzBdLnR5cGUsXG4gICAgICBub2RlcyxcbiAgICB9KTtcbiAgfVxuXG4gIHB1YmxpYyBzdGF0aWMgY3JlYXRlKGFkYXB0ZXJPcHRpb25zOiBOZXR3b3JrUmVzb3VyY2VBZGFwdGVySW5pdE9wdGlvbnMsIG9wdGlvbnM6IE5ldHdvcmtSZXNvdXJjZU9wdGlvbnMpOiBUYXNrTGlzdCB7XG4gICAgY29uc3Qgc3RhdGljT3B0aW9ucyA9IHRoaXMuZ2V0U3RhdGljT3B0aW9ucyhhZGFwdGVyT3B0aW9ucyk7XG4gICAgbGV0IHR5cGU6IE5vZGVPcHRpb25zWyd0eXBlJ107XG4gICAgbGV0IG5vZGVTZXR0aW5nczogUmVhZG9ubHlBcnJheTxbc3RyaW5nLCBOb2RlU2V0dGluZ3NdPjtcbiAgICBpZiAoc3RhdGljT3B0aW9ucy5uYW1lID09PSBjb25zdGFudHMuTkVUV09SS19OQU1FLk1BSU4pIHtcbiAgICAgIHR5cGUgPSBOZXR3b3JrVHlwZS5NYWluO1xuICAgICAgbm9kZVNldHRpbmdzID0gW1tzdGF0aWNPcHRpb25zLm5hbWUsIHRoaXMuZ2V0TWFpblNldHRpbmdzKHN0YXRpY09wdGlvbnMpXV07XG4gICAgfSBlbHNlIGlmIChzdGF0aWNPcHRpb25zLm5hbWUgPT09IGNvbnN0YW50cy5ORVRXT1JLX05BTUUuVEVTVCkge1xuICAgICAgdHlwZSA9IE5ldHdvcmtUeXBlLlRlc3Q7XG4gICAgICBub2RlU2V0dGluZ3MgPSBbW3N0YXRpY09wdGlvbnMubmFtZSwgdGhpcy5nZXRUZXN0U2V0dGluZ3Moc3RhdGljT3B0aW9ucyldXTtcbiAgICB9IGVsc2Uge1xuICAgICAgdHlwZSA9IE5ldHdvcmtUeXBlLlByaXZhdGU7XG4gICAgICBub2RlU2V0dGluZ3MgPSB0aGlzLmdldFByaXZhdGVOZXRTZXR0aW5ncyhzdGF0aWNPcHRpb25zKTtcbiAgICB9XG5cbiAgICBjb25zdCBub2RlT3B0aW9uc3MgPSBub2RlU2V0dGluZ3MubWFwPE5vZGVPcHRpb25zPigoW25hbWUsIHNldHRpbmdzXSkgPT4gKHtcbiAgICAgIHR5cGUsXG4gICAgICBuYW1lLFxuICAgICAgZGF0YVBhdGg6IHBhdGgucmVzb2x2ZShzdGF0aWNPcHRpb25zLm5vZGVzUGF0aCwgbmFtZSksXG4gICAgICBzZXR0aW5ncyxcbiAgICAgIG9wdGlvbnMsXG4gICAgfSkpO1xuXG4gICAgY29uc3Qgbm9kZU9wdGlvbnNBbmROb2RlcyA9IG5vZGVPcHRpb25zcy5tYXA8W05vZGVPcHRpb25zLCBOb2RlQWRhcHRlcl0+KChub2RlT3B0aW9ucykgPT4gW1xuICAgICAgbm9kZU9wdGlvbnMsXG4gICAgICB0aGlzLmNyZWF0ZU5vZGVBZGFwdGVyKHN0YXRpY09wdGlvbnMsIG5vZGVPcHRpb25zKSxcbiAgICBdKTtcblxuICAgIHJldHVybiBuZXcgVGFza0xpc3Qoe1xuICAgICAgaW5pdGlhbENvbnRleHQ6IHtcbiAgICAgICAgcmVzb3VyY2VBZGFwdGVyOiBuZXcgdGhpcyh7XG4gICAgICAgICAgbmFtZTogc3RhdGljT3B0aW9ucy5uYW1lLFxuICAgICAgICAgIGJpbmFyeTogc3RhdGljT3B0aW9ucy5iaW5hcnksXG4gICAgICAgICAgZGF0YVBhdGg6IHN0YXRpY09wdGlvbnMuZGF0YVBhdGgsXG4gICAgICAgICAgcG9ydEFsbG9jYXRvcjogc3RhdGljT3B0aW9ucy5wb3J0QWxsb2NhdG9yLFxuICAgICAgICAgIHJlc291cmNlVHlwZTogc3RhdGljT3B0aW9ucy5yZXNvdXJjZVR5cGUsXG4gICAgICAgICAgbm9kZXNQYXRoOiBzdGF0aWNPcHRpb25zLm5vZGVzUGF0aCxcbiAgICAgICAgICBub2Rlc09wdGlvbnNQYXRoOiBzdGF0aWNPcHRpb25zLm5vZGVzT3B0aW9uc1BhdGgsXG4gICAgICAgICAgdHlwZTogbm9kZVNldHRpbmdzWzBdWzFdLnR5cGUsXG4gICAgICAgICAgbm9kZXM6IG5vZGVPcHRpb25zQW5kTm9kZXMubWFwKCh2YWx1ZSkgPT4gdmFsdWVbMV0pLFxuICAgICAgICB9KSxcblxuICAgICAgICBkZXBlbmRlbmNpZXM6IFtdLFxuICAgICAgfSxcbiAgICAgIHRhc2tzOiBbXG4gICAgICAgIHtcbiAgICAgICAgICB0aXRsZTogJ0NyZWF0ZSBkYXRhIGRpcmVjdG9yaWVzJyxcbiAgICAgICAgICB0YXNrOiBhc3luYyAoKSA9PiB7XG4gICAgICAgICAgICBhd2FpdCBQcm9taXNlLmFsbChbZnMuZW5zdXJlRGlyKHN0YXRpY09wdGlvbnMubm9kZXNQYXRoKSwgZnMuZW5zdXJlRGlyKHN0YXRpY09wdGlvbnMubm9kZXNPcHRpb25zUGF0aCldKTtcbiAgICAgICAgICB9LFxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgdGl0bGU6ICdDcmVhdGUgbm9kZXMnLFxuICAgICAgICAgIHRhc2s6ICgpID0+XG4gICAgICAgICAgICBuZXcgVGFza0xpc3Qoe1xuICAgICAgICAgICAgICB0YXNrczogbm9kZU9wdGlvbnNBbmROb2Rlcy5tYXAoKFtub2RlT3B0aW9ucywgbm9kZV0pID0+ICh7XG4gICAgICAgICAgICAgICAgdGl0bGU6IGBDcmVhdGUgbm9kZSAke25vZGVPcHRpb25zLm5hbWV9YCxcbiAgICAgICAgICAgICAgICB0YXNrOiBhc3luYyAoKSA9PiB7XG4gICAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLndyaXRlTm9kZU9wdGlvbnMoc3RhdGljT3B0aW9ucywgbm9kZU9wdGlvbnMpO1xuICAgICAgICAgICAgICAgICAgYXdhaXQgbm9kZS5jcmVhdGUoKTtcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICB9KSksXG5cbiAgICAgICAgICAgICAgY29uY3VycmVudDogdHJ1ZSxcbiAgICAgICAgICAgIH0pLFxuICAgICAgICB9LFxuICAgICAgXSxcbiAgICB9KTtcbiAgfVxuXG4gIHByaXZhdGUgc3RhdGljIGdldFN0YXRpY09wdGlvbnMob3B0aW9uczogTmV0d29ya1Jlc291cmNlQWRhcHRlckluaXRPcHRpb25zKTogTmV0d29ya1Jlc291cmNlQWRhcHRlclN0YXRpY09wdGlvbnMge1xuICAgIHJldHVybiB7XG4gICAgICBuYW1lOiBvcHRpb25zLm5hbWUsXG4gICAgICBiaW5hcnk6IG9wdGlvbnMuYmluYXJ5LFxuICAgICAgZGF0YVBhdGg6IG9wdGlvbnMuZGF0YVBhdGgsXG4gICAgICBwb3J0QWxsb2NhdG9yOiBvcHRpb25zLnBvcnRBbGxvY2F0b3IsXG4gICAgICByZXNvdXJjZVR5cGU6IG9wdGlvbnMucmVzb3VyY2VUeXBlLFxuICAgICAgbm9kZXNQYXRoOiBwYXRoLnJlc29sdmUob3B0aW9ucy5kYXRhUGF0aCwgTk9ERVNfUEFUSCksXG4gICAgICBub2Rlc09wdGlvbnNQYXRoOiBwYXRoLnJlc29sdmUob3B0aW9ucy5kYXRhUGF0aCwgTk9ERVNfT1BUSU9OU19QQVRIKSxcbiAgICB9O1xuICB9XG5cbiAgcHJpdmF0ZSBzdGF0aWMgZ2V0UHJpdmF0ZU5ldFNldHRpbmdzKFxuICAgIG9wdGlvbnM6IE5ldHdvcmtSZXNvdXJjZUFkYXB0ZXJTdGF0aWNPcHRpb25zLFxuICApOiBSZWFkb25seUFycmF5PFtzdHJpbmcsIE5vZGVTZXR0aW5nc10+IHtcbiAgICBjb25zdCBwcmltYXJ5UHJpdmF0ZUtleSA9IGNyeXB0by53aWZUb1ByaXZhdGVLZXkoY29uc3RhbnRzLlBSSVZBVEVfTkVUX1BSSVZBVEVfS0VZLCBjb21tb24uTkVPX1BSSVZBVEVfS0VZX1ZFUlNJT04pO1xuICAgIGNvbnN0IHByaW1hcnlQdWJsaWNLZXkgPSBjb21tb24uc3RyaW5nVG9FQ1BvaW50KGNvbnN0YW50cy5QUklWQVRFX05FVF9QVUJMSUNfS0VZKTtcbiAgICBjcnlwdG8uYWRkUHVibGljS2V5KHByaW1hcnlQcml2YXRlS2V5LCBwcmltYXJ5UHVibGljS2V5KTtcblxuICAgIGNvbnN0IHByaW1hcnlBZGRyZXNzID0gY29tbW9uLnVJbnQxNjBUb1N0cmluZyhjcnlwdG8ucHJpdmF0ZUtleVRvU2NyaXB0SGFzaChwcmltYXJ5UHJpdmF0ZUtleSkpO1xuXG4gICAgY29uc3QgY29uZmlndXJhdGlvbk5hbWUgPSBgJHtvcHRpb25zLm5hbWV9LTBgO1xuICAgIGNvbnN0IGNvbmZpZ3VyYXRpb24gPSBbXG4gICAgICB7XG4gICAgICAgIG5hbWU6IGNvbmZpZ3VyYXRpb25OYW1lLFxuICAgICAgICBycGNQb3J0OiB0aGlzLmdldFJQQ1BvcnQob3B0aW9ucywgY29uZmlndXJhdGlvbk5hbWUpLFxuICAgICAgICBsaXN0ZW5UQ1BQb3J0OiB0aGlzLmdldExpc3RlblRDUFBvcnQob3B0aW9ucywgY29uZmlndXJhdGlvbk5hbWUpLFxuICAgICAgICB0ZWxlbWV0cnlQb3J0OiB0aGlzLmdldFRlbGVtZXRyeVBvcnQob3B0aW9ucywgY29uZmlndXJhdGlvbk5hbWUpLFxuICAgICAgICBwcml2YXRlS2V5OiBwcmltYXJ5UHJpdmF0ZUtleSxcbiAgICAgICAgcHVibGljS2V5OiBwcmltYXJ5UHVibGljS2V5LFxuICAgICAgfSxcbiAgICBdO1xuICAgIGNvbnN0IHNlY29uZHNQZXJCbG9jayA9IDE1O1xuICAgIGNvbnN0IHN0YW5kYnlWYWxpZGF0b3JzID0gY29uZmlndXJhdGlvbi5tYXAoKHsgcHVibGljS2V5IH0pID0+IGNvbW1vbi5lY1BvaW50VG9TdHJpbmcocHVibGljS2V5KSk7XG5cbiAgICByZXR1cm4gY29uZmlndXJhdGlvbi5tYXA8W3N0cmluZywgTm9kZVNldHRpbmdzXT4oKGNvbmZpZykgPT4ge1xuICAgICAgY29uc3QgeyBuYW1lLCBycGNQb3J0LCBsaXN0ZW5UQ1BQb3J0LCB0ZWxlbWV0cnlQb3J0LCBwcml2YXRlS2V5IH0gPSBjb25maWc7XG4gICAgICBjb25zdCBvdGhlckNvbmZpZ3VyYXRpb24gPSBjb25maWd1cmF0aW9uLmZpbHRlcigoeyBuYW1lOiBvdGhlck5hbWUgfSkgPT4gbmFtZSAhPT0gb3RoZXJOYW1lKTtcblxuICAgICAgY29uc3Qgc2V0dGluZ3MgPSB7XG4gICAgICAgIHR5cGU6IE5ldHdvcmtUeXBlLlByaXZhdGUsXG4gICAgICAgIGlzVGVzdE5ldDogZmFsc2UsXG4gICAgICAgIHJwY1BvcnQsXG4gICAgICAgIGxpc3RlblRDUFBvcnQsXG4gICAgICAgIHRlbGVtZXRyeVBvcnQsXG4gICAgICAgIHByaXZhdGVOZXQ6IHRydWUsXG4gICAgICAgIHNlY29uZHNQZXJCbG9jayxcbiAgICAgICAgc3RhbmRieVZhbGlkYXRvcnMsXG4gICAgICAgIGFkZHJlc3M6IHByaW1hcnlBZGRyZXNzLFxuICAgICAgICBjb25zZW5zdXM6IHtcbiAgICAgICAgICBlbmFibGVkOiB0cnVlLFxuICAgICAgICAgIG9wdGlvbnM6IHtcbiAgICAgICAgICAgIHByaXZhdGVLZXk6IGNvbW1vbi5wcml2YXRlS2V5VG9TdHJpbmcocHJpdmF0ZUtleSksXG4gICAgICAgICAgICBwcml2YXRlTmV0OiB0cnVlLFxuICAgICAgICAgIH0sXG4gICAgICAgIH0sXG5cbiAgICAgICAgc2VlZHM6IG90aGVyQ29uZmlndXJhdGlvbi5tYXAoKG90aGVyQ29uZmlnKSA9PlxuICAgICAgICAgIGNyZWF0ZUVuZHBvaW50KHtcbiAgICAgICAgICAgIHR5cGU6ICd0Y3AnLFxuICAgICAgICAgICAgaG9zdDogJ2xvY2FsaG9zdCcsXG4gICAgICAgICAgICBwb3J0OiBvdGhlckNvbmZpZy5saXN0ZW5UQ1BQb3J0LFxuICAgICAgICAgIH0pLFxuICAgICAgICApLFxuXG4gICAgICAgIHJwY0VuZHBvaW50czogb3RoZXJDb25maWd1cmF0aW9uLm1hcCgob3RoZXJDb25maWcpID0+IGBodHRwOi8vbG9jYWxob3N0OiR7b3RoZXJDb25maWcucnBjUG9ydH0vcnBjYCksXG4gICAgICB9O1xuXG4gICAgICByZXR1cm4gW25hbWUsIHNldHRpbmdzXTtcbiAgICB9KTtcbiAgfVxuXG4gIHByaXZhdGUgc3RhdGljIGdldE1haW5TZXR0aW5ncyhvcHRpb25zOiBOZXR3b3JrUmVzb3VyY2VBZGFwdGVyU3RhdGljT3B0aW9ucyk6IE5vZGVTZXR0aW5ncyB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHR5cGU6IE5ldHdvcmtUeXBlLk1haW4sXG4gICAgICBpc1Rlc3ROZXQ6IGZhbHNlLFxuICAgICAgcnBjUG9ydDogdGhpcy5nZXRSUENQb3J0KG9wdGlvbnMsIG9wdGlvbnMubmFtZSksXG4gICAgICBsaXN0ZW5UQ1BQb3J0OiB0aGlzLmdldExpc3RlblRDUFBvcnQob3B0aW9ucywgb3B0aW9ucy5uYW1lKSxcbiAgICAgIHRlbGVtZXRyeVBvcnQ6IHRoaXMuZ2V0VGVsZW1ldHJ5UG9ydChvcHRpb25zLCBvcHRpb25zLm5hbWUpLFxuICAgICAgY29uc2Vuc3VzOiB7XG4gICAgICAgIGVuYWJsZWQ6IGZhbHNlLFxuICAgICAgICBvcHRpb25zOiB7XG4gICAgICAgICAgcHJpdmF0ZUtleTogJ2RvZXNudG1hdHRlcicsXG4gICAgICAgICAgcHJpdmF0ZU5ldDogZmFsc2UsXG4gICAgICAgIH0sXG4gICAgICB9LFxuICAgICAgc2VlZHM6IERFRkFVTFRfTUFJTl9TRUVEUy5tYXAoY3JlYXRlRW5kcG9pbnQpLFxuICAgICAgcnBjRW5kcG9pbnRzOiBbXG4gICAgICAgICdodHRwOi8vbm9kZTEubnljMy5icmlkZ2Vwcm90b2NvbC5pbzoxMDMzMicsXG4gICAgICAgICdodHRwOi8vbm9kZTIubnljMy5icmlkZ2Vwcm90b2NvbC5pbzoxMDMzMicsXG4gICAgICAgICdodHRwczovL3NlZWQxLnN3aXRjaGVvLm5ldHdvcms6MTAzMzEnLFxuICAgICAgICAnaHR0cHM6Ly9zZWVkMi5zd2l0Y2hlby5uZXR3b3JrOjEwMzMxJyxcbiAgICAgICAgJ2h0dHBzOi8vc2VlZDMuc3dpdGNoZW8ubmV0d29yazoxMDMzMScsXG4gICAgICAgICdodHRwOi8vc2VlZDEuYXBoZWxpb24tbmVvLmNvbToxMDMzMicsXG4gICAgICAgICdodHRwOi8vc2VlZDIuYXBoZWxpb24tbmVvLmNvbToxMDMzMicsXG4gICAgICAgICdodHRwOi8vc2VlZDMuYXBoZWxpb24tbmVvLmNvbToxMDMzMicsXG4gICAgICAgICdodHRwOi8vc2VlZDQuYXBoZWxpb24tbmVvLmNvbToxMDMzMicsXG4gICAgICBdLFxuICAgIH07XG4gIH1cblxuICBwcml2YXRlIHN0YXRpYyBnZXRUZXN0U2V0dGluZ3Mob3B0aW9uczogTmV0d29ya1Jlc291cmNlQWRhcHRlclN0YXRpY09wdGlvbnMpOiBOb2RlU2V0dGluZ3Mge1xuICAgIHJldHVybiB7XG4gICAgICB0eXBlOiBOZXR3b3JrVHlwZS5UZXN0LFxuICAgICAgaXNUZXN0TmV0OiB0cnVlLFxuICAgICAgcnBjUG9ydDogdGhpcy5nZXRSUENQb3J0KG9wdGlvbnMsIG9wdGlvbnMubmFtZSksXG4gICAgICBsaXN0ZW5UQ1BQb3J0OiB0aGlzLmdldExpc3RlblRDUFBvcnQob3B0aW9ucywgb3B0aW9ucy5uYW1lKSxcbiAgICAgIHRlbGVtZXRyeVBvcnQ6IHRoaXMuZ2V0VGVsZW1ldHJ5UG9ydChvcHRpb25zLCBvcHRpb25zLm5hbWUpLFxuICAgICAgY29uc2Vuc3VzOiB7XG4gICAgICAgIGVuYWJsZWQ6IGZhbHNlLFxuICAgICAgICBvcHRpb25zOiB7XG4gICAgICAgICAgcHJpdmF0ZUtleTogJ2RvZXNudG1hdHRlcicsXG4gICAgICAgICAgcHJpdmF0ZU5ldDogZmFsc2UsXG4gICAgICAgIH0sXG4gICAgICB9LFxuXG4gICAgICBzZWVkczogREVGQVVMVF9URVNUX1NFRURTLm1hcChjcmVhdGVFbmRwb2ludCksXG4gICAgICBycGNFbmRwb2ludHM6IFtcbiAgICAgICAgJ2h0dHA6Ly90ZXN0MS5jaXR5b2Z6aW9uLmlvOjg4ODAnLFxuICAgICAgICAnaHR0cDovL3Rlc3QyLmNpdHlvZnppb24uaW86ODg4MCcsXG4gICAgICAgICdodHRwOi8vdGVzdDMuY2l0eW9memlvbi5pbzo4ODgwJyxcbiAgICAgICAgJ2h0dHA6Ly90ZXN0NC5jaXR5b2Z6aW9uLmlvOjg4ODAnLFxuICAgICAgICAnaHR0cDovL3Rlc3Q1LmNpdHlvZnppb24uaW86ODg4MCcsXG4gICAgICAgICdodHRwczovL3NlZWQxLm5lby5vcmc6MjAzMzInLFxuICAgICAgICAnaHR0cDovL3NlZWQyLm5lby5vcmc6MjAzMzInLFxuICAgICAgICAnaHR0cDovL3NlZWQzLm5lby5vcmc6MjAzMzInLFxuICAgICAgICAnaHR0cDovL3NlZWQ0Lm5lby5vcmc6MjAzMzInLFxuICAgICAgICAnaHR0cDovL3NlZWQ1Lm5lby5vcmc6MjAzMzInLFxuICAgICAgXSxcbiAgICB9O1xuICB9XG5cbiAgcHJpdmF0ZSBzdGF0aWMgY3JlYXRlTm9kZUFkYXB0ZXIoXG4gICAgeyByZXNvdXJjZVR5cGUsIGJpbmFyeSB9OiBOZXR3b3JrUmVzb3VyY2VBZGFwdGVyU3RhdGljT3B0aW9ucyxcbiAgICB7IG5hbWUsIGRhdGFQYXRoLCBzZXR0aW5ncywgb3B0aW9ucyB9OiBOb2RlT3B0aW9ucyxcbiAgKTogTm9kZUFkYXB0ZXIge1xuICAgIGlmIChvcHRpb25zLnR5cGUgPT09IHVuZGVmaW5lZCB8fCBvcHRpb25zLnR5cGUgPT09ICduZW8tb25lJykge1xuICAgICAgcmV0dXJuIG5ldyBORU9PTkVOb2RlQWRhcHRlcih7XG4gICAgICAgIG1vbml0b3I6IHJlc291cmNlVHlwZS5wbHVnaW4ubW9uaXRvcixcbiAgICAgICAgbmFtZSxcbiAgICAgICAgYmluYXJ5LFxuICAgICAgICBkYXRhUGF0aCxcbiAgICAgICAgc2V0dGluZ3MsXG4gICAgICB9KTtcbiAgICB9XG5cbiAgICB0aHJvdyBuZXcgRXJyb3IoYFVua25vd24gTm9kZSB0eXBlICR7b3B0aW9ucy50eXBlfWApO1xuICB9XG5cbiAgcHJpdmF0ZSBzdGF0aWMgZ2V0UlBDUG9ydChvcHRpb25zOiBOZXR3b3JrUmVzb3VyY2VBZGFwdGVyU3RhdGljT3B0aW9ucywgbmFtZTogc3RyaW5nKTogbnVtYmVyIHtcbiAgICByZXR1cm4gdGhpcy5nZXRQb3J0KG9wdGlvbnMsIGAke25hbWV9LXJwYy1odHRwYCk7XG4gIH1cblxuICBwcml2YXRlIHN0YXRpYyBnZXRMaXN0ZW5UQ1BQb3J0KG9wdGlvbnM6IE5ldHdvcmtSZXNvdXJjZUFkYXB0ZXJTdGF0aWNPcHRpb25zLCBuYW1lOiBzdHJpbmcpOiBudW1iZXIge1xuICAgIHJldHVybiB0aGlzLmdldFBvcnQob3B0aW9ucywgYCR7bmFtZX0tbGlzdGVuLXRjcGApO1xuICB9XG5cbiAgcHJpdmF0ZSBzdGF0aWMgZ2V0VGVsZW1ldHJ5UG9ydChvcHRpb25zOiBOZXR3b3JrUmVzb3VyY2VBZGFwdGVyU3RhdGljT3B0aW9ucywgbmFtZTogc3RyaW5nKTogbnVtYmVyIHtcbiAgICByZXR1cm4gdGhpcy5nZXRQb3J0KG9wdGlvbnMsIGAke25hbWV9LXRlbGVtZXRyeWApO1xuICB9XG5cbiAgcHJpdmF0ZSBzdGF0aWMgZ2V0UG9ydChvcHRpb25zOiBOZXR3b3JrUmVzb3VyY2VBZGFwdGVyU3RhdGljT3B0aW9ucywgbmFtZTogc3RyaW5nKTogbnVtYmVyIHtcbiAgICByZXR1cm4gb3B0aW9ucy5wb3J0QWxsb2NhdG9yLmFsbG9jYXRlUG9ydCh7XG4gICAgICBwbHVnaW46IG9wdGlvbnMucmVzb3VyY2VUeXBlLnBsdWdpbi5uYW1lLFxuICAgICAgcmVzb3VyY2VUeXBlOiBvcHRpb25zLnJlc291cmNlVHlwZS5uYW1lLFxuICAgICAgcmVzb3VyY2U6IG9wdGlvbnMubmFtZSxcbiAgICAgIG5hbWUsXG4gICAgfSk7XG4gIH1cblxuICBwcml2YXRlIHN0YXRpYyBhc3luYyB3cml0ZU5vZGVPcHRpb25zKFxuICAgIG9wdGlvbnM6IE5ldHdvcmtSZXNvdXJjZUFkYXB0ZXJTdGF0aWNPcHRpb25zLFxuICAgIG5vZGVPcHRpb25zOiBOb2RlT3B0aW9ucyxcbiAgKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IG5vZGVPcHRpb25zUGF0aCA9IHRoaXMuZ2V0Tm9kZU9wdGlvbnNQYXRoKG9wdGlvbnMsIG5vZGVPcHRpb25zLm5hbWUpO1xuXG4gICAgICBhd2FpdCBmcy53cml0ZUZpbGUobm9kZU9wdGlvbnNQYXRoLCBKU09OLnN0cmluZ2lmeShub2RlT3B0aW9ucykpO1xuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICBvcHRpb25zLnJlc291cmNlVHlwZS5wbHVnaW4ubW9uaXRvclxuICAgICAgICAud2l0aERhdGEoe1xuICAgICAgICAgIFtsYWJlbHMuTk9ERV9OQU1FXTogbm9kZU9wdGlvbnMubmFtZSxcbiAgICAgICAgfSlcbiAgICAgICAgLmxvZ0Vycm9yKHtcbiAgICAgICAgICBuYW1lOiAnbmVvX25ldHdvcmtfcmVzb3VyY2VfYWRhcHRlcl93cml0ZV9ub2RlX29wdGlvbnNfZXJyb3InLFxuICAgICAgICAgIG1lc3NhZ2U6ICdGYWlsZWQgdG8gcGVyc2lzdCBub2RlIG9wdGlvbnMnLFxuICAgICAgICAgIGVycm9yLFxuICAgICAgICB9KTtcblxuICAgICAgdGhyb3cgZXJyb3I7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBzdGF0aWMgYXN5bmMgcmVhZE5vZGVPcHRpb25zKFxuICAgIHsgcmVzb3VyY2VUeXBlIH06IE5ldHdvcmtSZXNvdXJjZUFkYXB0ZXJTdGF0aWNPcHRpb25zLFxuICAgIG5vZGVPcHRpb25zUGF0aDogc3RyaW5nLFxuICApOiBQcm9taXNlPE5vZGVPcHRpb25zPiB7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IGNvbnRlbnRzID0gYXdhaXQgZnMucmVhZEZpbGUobm9kZU9wdGlvbnNQYXRoLCAndXRmOCcpO1xuXG4gICAgICByZXR1cm4gSlNPTi5wYXJzZShjb250ZW50cyk7XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIHJlc291cmNlVHlwZS5wbHVnaW4ubW9uaXRvclxuICAgICAgICAud2l0aERhdGEoe1xuICAgICAgICAgIFtsYWJlbHMuTk9ERV9PUFRJT05TUEFUSF06IG5vZGVPcHRpb25zUGF0aCxcbiAgICAgICAgfSlcbiAgICAgICAgLmxvZ0Vycm9yKHtcbiAgICAgICAgICBuYW1lOiAnbmVvX25ldHdvcmtfcmVzb3VyY2VfYWRhcHRlcl9yZWFkX25vZGVfb3B0aW9uc19lcnJvcicsXG4gICAgICAgICAgbWVzc2FnZTogJ0ZhaWxlZCB0byByZWFkIG5vZGUgb3B0aW9ucy4nLFxuICAgICAgICAgIGVycm9yLFxuICAgICAgICB9KTtcblxuICAgICAgdGhyb3cgZXJyb3I7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBzdGF0aWMgZ2V0Tm9kZU9wdGlvbnNQYXRoKHsgbm9kZXNPcHRpb25zUGF0aCB9OiBOZXR3b3JrUmVzb3VyY2VBZGFwdGVyU3RhdGljT3B0aW9ucywgbmFtZTogc3RyaW5nKTogc3RyaW5nIHtcbiAgICByZXR1cm4gcGF0aC5yZXNvbHZlKG5vZGVzT3B0aW9uc1BhdGgsIGAke25hbWV9Lmpzb25gKTtcbiAgfVxuXG4gIHB1YmxpYyByZWFkb25seSByZXNvdXJjZSQ6IE9ic2VydmFibGU8TmV0d29yaz47XG4gIHByaXZhdGUgcmVhZG9ubHkgbmFtZTogc3RyaW5nO1xuICBwcml2YXRlIHJlYWRvbmx5IHR5cGU6IE5ldHdvcmtUeXBlO1xuICBwcml2YXRlIHJlYWRvbmx5IGRhdGFQYXRoOiBzdHJpbmc7XG4gIHByaXZhdGUgcmVhZG9ubHkgcmVzb3VyY2VUeXBlOiBOZXR3b3JrUmVzb3VyY2VUeXBlO1xuICBwcml2YXRlIHJlYWRvbmx5IG5vZGVzUGF0aDogc3RyaW5nO1xuICBwcml2YXRlIHJlYWRvbmx5IG5vZGVzT3B0aW9uc1BhdGg6IHN0cmluZztcbiAgcHJpdmF0ZSByZWFkb25seSBzdGF0ZTogUmVzb3VyY2VTdGF0ZTtcbiAgcHJpdmF0ZSByZWFkb25seSBub2RlcyQ6IEJlaGF2aW9yU3ViamVjdDxSZWFkb25seUFycmF5PE5vZGVBZGFwdGVyPj47XG5cbiAgcHVibGljIGNvbnN0cnVjdG9yKHtcbiAgICBuYW1lLFxuICAgIHR5cGUsXG4gICAgZGF0YVBhdGgsXG4gICAgcmVzb3VyY2VUeXBlLFxuICAgIG5vZGVzUGF0aCxcbiAgICBub2Rlc09wdGlvbnNQYXRoLFxuICAgIG5vZGVzOiBub2Rlc0luLFxuICB9OiBOZXR3b3JrUmVzb3VyY2VBZGFwdGVyT3B0aW9ucykge1xuICAgIHRoaXMubmFtZSA9IG5hbWU7XG4gICAgdGhpcy50eXBlID0gdHlwZTtcbiAgICB0aGlzLmRhdGFQYXRoID0gZGF0YVBhdGg7XG4gICAgdGhpcy5yZXNvdXJjZVR5cGUgPSByZXNvdXJjZVR5cGU7XG4gICAgdGhpcy5ub2Rlc1BhdGggPSBub2Rlc1BhdGg7XG4gICAgdGhpcy5ub2Rlc09wdGlvbnNQYXRoID0gbm9kZXNPcHRpb25zUGF0aDtcbiAgICB0aGlzLm5vZGVzJCA9IG5ldyBCZWhhdmlvclN1YmplY3Qobm9kZXNJbik7XG4gICAgdGhpcy5zdGF0ZSA9ICdzdG9wcGVkJztcblxuICAgIHRoaXMucmVzb3VyY2UkID0gdGhpcy5ub2RlcyQucGlwZShcbiAgICAgIHN3aXRjaE1hcCgobm9kZXMpID0+XG4gICAgICAgIGNvbWJpbmVMYXRlc3QodGltZXIoMCwgMjUwMCksIGNvbWJpbmVMYXRlc3Qobm9kZXMubWFwKChub2RlKSA9PiBub2RlLm5vZGUkKSkpLnBpcGUoXG4gICAgICAgICAgbWVyZ2VTY2FuTGF0ZXN0PFtudW1iZXIsIFJlYWRvbmx5QXJyYXk8Tm9kZT5dLCBOZXR3b3JrPihcbiAgICAgICAgICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZSBuby11bnVzZWRcbiAgICAgICAgICAgIGFzeW5jIChfcHJldiwgW190aW1lLCBjdXJyZW50Tm9kZXNdKTogUHJvbWlzZTxOZXR3b3JrPiA9PiB7XG4gICAgICAgICAgICAgIGNvbnN0IHJlYWR5Tm9kZSA9XG4gICAgICAgICAgICAgICAgY3VycmVudE5vZGVzLmZpbmQoKG5vZGUpID0+IG5vZGUucmVhZHkpIHx8XG4gICAgICAgICAgICAgICAgY3VycmVudE5vZGVzLmZpbmQoKG5vZGUpID0+IG5vZGUubGl2ZSkgfHxcbiAgICAgICAgICAgICAgICAoY3VycmVudE5vZGVzWzBdIGFzIE5vZGUgfCB1bmRlZmluZWQpO1xuICAgICAgICAgICAgICBsZXQgaGVpZ2h0O1xuICAgICAgICAgICAgICBsZXQgcGVlcnM7XG4gICAgICAgICAgICAgIGlmIChyZWFkeU5vZGUgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgIGNvbnN0IGNsaWVudCA9IG5ldyBSZWFkQ2xpZW50KFxuICAgICAgICAgICAgICAgICAgbmV3IE5FT09ORURhdGFQcm92aWRlcih7XG4gICAgICAgICAgICAgICAgICAgIG5ldHdvcms6IHRoaXMubmFtZSxcbiAgICAgICAgICAgICAgICAgICAgcnBjVVJMOiByZWFkeU5vZGUucnBjQWRkcmVzcyxcbiAgICAgICAgICAgICAgICAgIH0pLFxuICAgICAgICAgICAgICAgICk7XG5cbiAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgW2hlaWdodCwgcGVlcnNdID0gYXdhaXQgUHJvbWlzZS5hbGwoW2NsaWVudC5nZXRCbG9ja0NvdW50KCksIGNsaWVudC5nZXRDb25uZWN0ZWRQZWVycygpXSk7XG4gICAgICAgICAgICAgICAgfSBjYXRjaCB7XG4gICAgICAgICAgICAgICAgICAvLyBpZ25vcmUgZXJyb3JzXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICBwbHVnaW46IHRoaXMucmVzb3VyY2VUeXBlLnBsdWdpbi5uYW1lLFxuICAgICAgICAgICAgICAgIHJlc291cmNlVHlwZTogdGhpcy5yZXNvdXJjZVR5cGUubmFtZSxcbiAgICAgICAgICAgICAgICBuYW1lOiB0aGlzLm5hbWUsXG4gICAgICAgICAgICAgICAgYmFzZU5hbWU6IHRoaXMubmFtZSxcbiAgICAgICAgICAgICAgICBzdGF0ZTogdGhpcy5zdGF0ZSxcbiAgICAgICAgICAgICAgICB0eXBlOiB0aGlzLnR5cGUsXG4gICAgICAgICAgICAgICAgaGVpZ2h0LFxuICAgICAgICAgICAgICAgIHBlZXJzOiBwZWVycyA9PT0gdW5kZWZpbmVkID8gcGVlcnMgOiBwZWVycy5sZW5ndGgsXG4gICAgICAgICAgICAgICAgbm9kZXM6IGN1cnJlbnROb2RlcyxcbiAgICAgICAgICAgICAgICBsaXZlOiB0aGlzLmxpdmUsXG4gICAgICAgICAgICAgICAgcmVhZHk6IHRoaXMucmVhZHksXG4gICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICksXG4gICAgICAgICksXG4gICAgICApLFxuICAgICAgc2hhcmVSZXBsYXkoMSksXG4gICAgKTtcbiAgfVxuXG4gIHB1YmxpYyBnZXREZWJ1ZygpOiBEZXNjcmliZVRhYmxlIHtcbiAgICByZXR1cm4gW1xuICAgICAgWydUeXBlJywgdGhpcy50eXBlXSxcbiAgICAgIFsnRGF0YSBQYXRoJywgdGhpcy5kYXRhUGF0aF0sXG4gICAgICBbJ05vZGVzIFBhdGgnLCB0aGlzLm5vZGVzUGF0aF0sXG4gICAgICBbJ05vZGVzIE9wdGlvbnMgUGF0aCcsIHRoaXMubm9kZXNPcHRpb25zUGF0aF0sXG4gICAgICBbJ1N0YXRlJywgdGhpcy5zdGF0ZV0sXG4gICAgICBbXG4gICAgICAgICdOb2RlcycsXG4gICAgICAgIHtcbiAgICAgICAgICB0eXBlOiAnZGVzY3JpYmUnLFxuICAgICAgICAgIHRhYmxlOiB0aGlzLm5vZGVzLm1hcDxbc3RyaW5nLCBTdWJEZXNjcmliZVRhYmxlXT4oKG5vZGUpID0+IFtcbiAgICAgICAgICAgIG5vZGUubmFtZSxcbiAgICAgICAgICAgIHsgdHlwZTogJ2Rlc2NyaWJlJywgdGFibGU6IG5vZGUuZ2V0RGVidWcoKSB9LFxuICAgICAgICAgIF0pLFxuICAgICAgICB9LFxuICAgICAgXSxcbiAgICBdO1xuICB9XG5cbiAgcHJpdmF0ZSBnZXQgbm9kZXMoKTogUmVhZG9ubHlBcnJheTxOb2RlQWRhcHRlcj4ge1xuICAgIHJldHVybiB0aGlzLm5vZGVzJC52YWx1ZTtcbiAgfVxuXG4gIHB1YmxpYyBhc3luYyBkZXN0cm95KCk6IFByb21pc2U8dm9pZD4ge1xuICAgIHRoaXMubm9kZXMkLm5leHQoW10pO1xuICB9XG5cbiAgcHVibGljIGRlbGV0ZShfb3B0aW9uczogTmV0d29ya1Jlc291cmNlT3B0aW9ucyk6IFRhc2tMaXN0IHtcbiAgICByZXR1cm4gbmV3IFRhc2tMaXN0KHtcbiAgICAgIHRhc2tzOiBbXG4gICAgICAgIHtcbiAgICAgICAgICB0aXRsZTogJ0NsZWFuIHVwIGxvY2FsIGZpbGVzJyxcbiAgICAgICAgICB0YXNrOiBhc3luYyAoKSA9PiB7XG4gICAgICAgICAgICBhd2FpdCBmcy5yZW1vdmUodGhpcy5kYXRhUGF0aCk7XG4gICAgICAgICAgfSxcbiAgICAgICAgfSxcbiAgICAgIF0sXG4gICAgfSk7XG4gIH1cblxuICBwdWJsaWMgc3RhcnQoX29wdGlvbnM6IE5ldHdvcmtSZXNvdXJjZU9wdGlvbnMpOiBUYXNrTGlzdCB7XG4gICAgcmV0dXJuIG5ldyBUYXNrTGlzdCh7XG4gICAgICB0YXNrczogW1xuICAgICAgICB7XG4gICAgICAgICAgdGl0bGU6ICdTdGFydCBub2RlcycsXG4gICAgICAgICAgdGFzazogKCkgPT5cbiAgICAgICAgICAgIG5ldyBUYXNrTGlzdCh7XG4gICAgICAgICAgICAgIHRhc2tzOiB0aGlzLm5vZGVzLm1hcCgobm9kZSkgPT4gKHtcbiAgICAgICAgICAgICAgICB0aXRsZTogYFN0YXJ0IG5vZGUgJHtub2RlLm5hbWV9YCxcbiAgICAgICAgICAgICAgICB0YXNrOiBhc3luYyAoKSA9PiB7XG4gICAgICAgICAgICAgICAgICBhd2FpdCBub2RlLnN0YXJ0KCk7XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgfSkpLFxuICAgICAgICAgICAgICBjb25jdXJyZW50OiB0cnVlLFxuICAgICAgICAgICAgfSksXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICB0aXRsZTogJ1dhaXQgZm9yIG5ldHdvcmsgdG8gYmUgYWxpdmUnLFxuICAgICAgICAgIHRhc2s6IGFzeW5jICgpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHN0YXJ0ID0gdXRpbHMubm93U2Vjb25kcygpO1xuICAgICAgICAgICAgYXdhaXQgdGhpcy5saXZlKCk7XG4gICAgICAgICAgICB0aGlzLnJlc291cmNlVHlwZS5wbHVnaW4ubW9uaXRvci5sb2coe1xuICAgICAgICAgICAgICBuYW1lOiAnbmVvX25ldHdvcmtfcmVzb3VyY2VfYWRhcHRlcl9ub2RlX2xpdmUnLFxuICAgICAgICAgICAgICBtZXNzYWdlOiBgU3RhcnRlZCBpbiAke3V0aWxzLm5vd1NlY29uZHMoKSAtIHN0YXJ0fSBzZWNvbmRzYCxcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH0sXG4gICAgICAgIH0sXG4gICAgICBdLFxuICAgIH0pO1xuICB9XG5cbiAgcHVibGljIHJlYWRvbmx5IGxpdmUgPSBhc3luYyAoKSA9PiB7XG4gICAgYXdhaXQgUHJvbWlzZS5hbGwoXG4gICAgICB0aGlzLm5vZGVzLm1hcChhc3luYyAobm9kZSkgPT4ge1xuICAgICAgICB0cnkge1xuICAgICAgICAgIGF3YWl0IG5vZGUubGl2ZSgzMCk7XG4gICAgICAgIH0gY2F0Y2gge1xuICAgICAgICAgIGF3YWl0IG5vZGUuc3RvcCgpO1xuICAgICAgICAgIGF3YWl0IG5vZGUuc3RhcnQoKTtcbiAgICAgICAgICBhd2FpdCBub2RlLmxpdmUoMzApO1xuICAgICAgICB9XG4gICAgICB9KSxcbiAgICApO1xuICB9O1xuXG4gIHB1YmxpYyByZWFkb25seSByZWFkeSA9IGFzeW5jICgpID0+IHtcbiAgICBhd2FpdCBQcm9taXNlLmFsbChcbiAgICAgIHRoaXMubm9kZXMubWFwKGFzeW5jIChub2RlKSA9PiB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgYXdhaXQgbm9kZS5yZWFkeSgzMCk7XG4gICAgICAgIH0gY2F0Y2gge1xuICAgICAgICAgIGF3YWl0IG5vZGUuc3RvcCgpO1xuICAgICAgICAgIGF3YWl0IG5vZGUuc3RhcnQoKTtcbiAgICAgICAgICBhd2FpdCBub2RlLnJlYWR5KDMwKTtcbiAgICAgICAgfVxuICAgICAgfSksXG4gICAgKTtcbiAgfTtcblxuICBwdWJsaWMgc3RvcChfb3B0aW9uczogTmV0d29ya1Jlc291cmNlT3B0aW9ucyk6IFRhc2tMaXN0IHtcbiAgICByZXR1cm4gbmV3IFRhc2tMaXN0KHtcbiAgICAgIHRhc2tzOiBbXG4gICAgICAgIHtcbiAgICAgICAgICB0aXRsZTogJ1N0b3Agbm9kZXMnLFxuICAgICAgICAgIHRhc2s6ICgpID0+XG4gICAgICAgICAgICBuZXcgVGFza0xpc3Qoe1xuICAgICAgICAgICAgICB0YXNrczogdGhpcy5ub2Rlcy5tYXAoKG5vZGUpID0+ICh7XG4gICAgICAgICAgICAgICAgdGl0bGU6IGBTdG9wIG5vZGUgJHtub2RlLm5hbWV9YCxcbiAgICAgICAgICAgICAgICB0YXNrOiBhc3luYyAoKSA9PiB7XG4gICAgICAgICAgICAgICAgICBhd2FpdCBub2RlLnN0b3AoKTtcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICB9KSksXG4gICAgICAgICAgICAgIGNvbmN1cnJlbnQ6IHRydWUsXG4gICAgICAgICAgICB9KSxcbiAgICAgICAgfSxcbiAgICAgIF0sXG4gICAgfSk7XG4gIH1cbn1cbiJdfQ==
