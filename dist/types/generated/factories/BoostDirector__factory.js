"use strict";
/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */
Object.defineProperty(exports, "__esModule", { value: true });
exports.BoostDirector__factory = void 0;
const ethers_1 = require("ethers");
const _abi = [
    {
        inputs: [
            {
                internalType: "address",
                name: "_nexus",
                type: "address",
            },
            {
                internalType: "address",
                name: "_stakingContract",
                type: "address",
            },
        ],
        stateMutability: "nonpayable",
        type: "constructor",
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: false,
                internalType: "address",
                name: "user",
                type: "address",
            },
            {
                indexed: false,
                internalType: "address",
                name: "boosted",
                type: "address",
            },
        ],
        name: "Directed",
        type: "event",
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: false,
                internalType: "address",
                name: "user",
                type: "address",
            },
            {
                indexed: false,
                internalType: "address",
                name: "boosted",
                type: "address",
            },
            {
                indexed: false,
                internalType: "address",
                name: "replaced",
                type: "address",
            },
        ],
        name: "RedirectedBoost",
        type: "event",
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: false,
                internalType: "address",
                name: "vaultAddress",
                type: "address",
            },
            {
                indexed: false,
                internalType: "uint8",
                name: "vaultId",
                type: "uint8",
            },
        ],
        name: "Whitelisted",
        type: "event",
    },
    {
        inputs: [
            {
                internalType: "address",
                name: "",
                type: "address",
            },
        ],
        name: "_directedBitmap",
        outputs: [
            {
                internalType: "uint128",
                name: "",
                type: "uint128",
            },
        ],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [
            {
                internalType: "address",
                name: "",
                type: "address",
            },
        ],
        name: "_vaults",
        outputs: [
            {
                internalType: "uint8",
                name: "",
                type: "uint8",
            },
        ],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [
            {
                internalType: "address",
                name: "_user",
                type: "address",
            },
        ],
        name: "getBalance",
        outputs: [
            {
                internalType: "uint256",
                name: "",
                type: "uint256",
            },
        ],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [
            {
                internalType: "address[]",
                name: "_newVaults",
                type: "address[]",
            },
        ],
        name: "initialize",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [],
        name: "nexus",
        outputs: [
            {
                internalType: "contract INexus",
                name: "",
                type: "address",
            },
        ],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [
            {
                internalType: "address",
                name: "_old",
                type: "address",
            },
            {
                internalType: "address",
                name: "_new",
                type: "address",
            },
            {
                internalType: "bool",
                name: "_pokeNew",
                type: "bool",
            },
        ],
        name: "setDirection",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [],
        name: "stakingContract",
        outputs: [
            {
                internalType: "contract IIncentivisedVotingLockup",
                name: "",
                type: "address",
            },
        ],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [
            {
                internalType: "address[]",
                name: "_newVaults",
                type: "address[]",
            },
        ],
        name: "whitelistVaults",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
];
const _bytecode = "0x60c060405234801561001057600080fd5b50604051610d58380380610d5883398101604081905261002f916100c6565b816001600160a01b03811661008a5760405162461bcd60e51b815260206004820152601560248201527f4e657875732061646472657373206973207a65726f0000000000000000000000604482015260640160405180910390fd5b6001600160601b0319606091821b811660805291901b1660a052506100f8565b80516001600160a01b03811681146100c157600080fd5b919050565b600080604083850312156100d8578182fd5b6100e1836100aa565b91506100ef602084016100aa565b90509250929050565b60805160601c60a05160601c610c286101306000396000818161017301526104d001526000818160ff01526109bc0152610c286000f3fe608060405234801561001057600080fd5b50600436106100875760003560e01c8063e85a89fd1161005b578063e85a89fd14610139578063ee99205c1461016e578063f8b2cb4f14610195578063fcb248f9146101b657610087565b8062b38b751461008c57806326603afc146100d2578063a224cee7146100e7578063a3f5c1d2146100fa575b600080fd5b6100b561009a366004610a50565b6002602052600090815260409020546001600160801b031681565b6040516001600160801b0390911681526020015b60405180910390f35b6100e56100e0366004610a8f565b6101c9565b005b6100e56100f5366004610add565b61041a565b6101217f000000000000000000000000000000000000000000000000000000000000000081565b6040516001600160a01b0390911681526020016100c9565b61015c610147366004610a50565b60016020526000908152604090205460ff1681565b60405160ff90911681526020016100c9565b6101217f000000000000000000000000000000000000000000000000000000000000000081565b6101a86101a3366004610a50565b610471565b6040519081526020016100c9565b6100e56101c4366004610add565b61062e565b6001600160a01b0380841660009081526001602052604080822054928516825290205460ff91821691168115801590610205575060008160ff16115b61024f5760405162461bcd60e51b815260206004820152601660248201527515985d5b1d1cc81b9bdd081dda1a5d195b1a5cdd195960521b60448201526064015b60405180910390fd5b336000908152600260205260408120546001600160801b03169080806102758487610636565b92509250925082801561028c575060038260ff1610155b6102d15760405162461bcd60e51b8152602060048201526016602482015275139bc81b995959081d1bc81c995c1b1858d9481bdb1960521b6044820152606401610246565b6102dc8482876106ab565b336000818152600260205260409081902080546001600160801b0319166001600160801b039490941693909317909255905163cf7bf6b760e01b815260048101919091526001600160a01b038a169063cf7bf6b790602401600060405180830381600087803b15801561034e57600080fd5b505af1158015610362573d6000803e3d6000fd5b5050505086156103c65760405163cf7bf6b760e01b81523360048201526001600160a01b0389169063cf7bf6b790602401600060405180830381600087803b1580156103ad57600080fd5b505af11580156103c1573d6000803e3d6000fd5b505050505b604080513381526001600160a01b038a811660208301528b168183015290517f96e457192e990ea428b6f1ec9774dec2368ee81910ce56c3fdc51a65536d58bd9181900360600190a1505050505050505050565b60005460ff16156104635760405162461bcd60e51b8152602060048201526013602482015272105b1c9958591e481a5b9a5d1a585b1a5e9959606a1b6044820152606401610246565b61046d8282610715565b5050565b3360009081526001602052604081205460ff1680610493576000915050610629565b6001600160a01b038381166000818152600260205260408082205490516370a0823160e01b815260048101939093526001600160801b03169290917f0000000000000000000000000000000000000000000000000000000000000000909116906370a082319060240160206040518083038186803b15801561051457600080fd5b505afa158015610528573d6000803e3d6000fd5b505050506040513d601f19601f8201168201806040525081019061054c9190610b4c565b905060008061055b8486610636565b50915091508115610573578295505050505050610629565b60038160ff16101561060a5761058a8482876106ab565b6001600160a01b03881660008181526002602090815260409182902080546001600160801b0319166001600160801b039590951694909417909355805191825233928201929092527fa9422dd63708544dd1d6bab7030a79821296b3ccfc25d7bffa7c4cc63eae4927910160405180910390a18295505050505050610629565b60038160ff161061062357600095505050505050610629565b50505050505b919050565b61046361094e565b60008060008060005b60038160ff1610156106a2578060080260ff16876001600160801b0316901c915060008260ff16111561067a57610677600185610b64565b93505b8560ff168260ff16141561069057600194508092505b8061069a81610ba4565b91505061063f565b50509250925092565b60008080805b60038160ff16101561070b578060ff168660ff16146106e1576001600160801b03871660ff60088302161c6106e3565b845b60ff818116600884029091161b9485179490935091508061070381610ba4565b9150506106b1565b5050509392505050565b80806107635760405162461bcd60e51b815260206004820152601a60248201527f4d757374206265206174206c65617374206f6e65207661756c740000000000006044820152606401610246565b60005b818110156109485760006001600086868581811061079457634e487b7160e01b600052603260045260246000fd5b90506020020160208101906107a99190610a50565b6001600160a01b0316815260208101919091526040016000205460ff16905080156108165760405162461bcd60e51b815260206004820152601960248201527f5661756c7420616c72656164792077686974656c6973746564000000000000006044820152606401610246565b6000805460019190819061082e90849060ff16610b64565b92506101000a81548160ff021916908360ff16021790555060008054906101000a900460ff166001600087878681811061087857634e487b7160e01b600052603260045260246000fd5b905060200201602081019061088d9190610a50565b6001600160a01b031681526020810191909152604001600020805460ff191660ff929092169190911790557fc7bf79a3be1a40b7b3c72951d6f8e32eb2e537c58d2947c91af23897388ef8258585848181106108f957634e487b7160e01b600052603260045260246000fd5b905060200201602081019061090e9190610a50565b600054604080516001600160a01b03909316835260ff90911660208301520160405180910390a1508061094081610b89565b915050610766565b50505050565b6109566109b8565b6001600160a01b0316336001600160a01b0316146109b65760405162461bcd60e51b815260206004820152601960248201527f4f6e6c7920676f7665726e6f722063616e2065786563757465000000000000006044820152606401610246565b565b60007f00000000000000000000000000000000000000000000000000000000000000006001600160a01b0316630c340a246040518163ffffffff1660e01b815260040160206040518083038186803b158015610a1357600080fd5b505afa158015610a27573d6000803e3d6000fd5b505050506040513d601f19601f82011682018060405250810190610a4b9190610a73565b905090565b600060208284031215610a61578081fd5b8135610a6c81610bda565b9392505050565b600060208284031215610a84578081fd5b8151610a6c81610bda565b600080600060608486031215610aa3578182fd5b8335610aae81610bda565b92506020840135610abe81610bda565b915060408401358015158114610ad2578182fd5b809150509250925092565b60008060208385031215610aef578182fd5b823567ffffffffffffffff80821115610b06578384fd5b818501915085601f830112610b19578384fd5b813581811115610b27578485fd5b8660208083028501011115610b3a578485fd5b60209290920196919550909350505050565b600060208284031215610b5d578081fd5b5051919050565b600060ff821660ff84168060ff03821115610b8157610b81610bc4565b019392505050565b6000600019821415610b9d57610b9d610bc4565b5060010190565b600060ff821660ff811415610bbb57610bbb610bc4565b60010192915050565b634e487b7160e01b600052601160045260246000fd5b6001600160a01b0381168114610bef57600080fd5b5056fea2646970667358221220532c23449d4d4f56231da79d8097f45440ebf65f1b7b9b9ded66529065e2161f64736f6c63430008020033";
class BoostDirector__factory extends ethers_1.ContractFactory {
    constructor(signer) {
        super(_abi, _bytecode, signer);
    }
    deploy(_nexus, _stakingContract, overrides) {
        return super.deploy(_nexus, _stakingContract, overrides || {});
    }
    getDeployTransaction(_nexus, _stakingContract, overrides) {
        return super.getDeployTransaction(_nexus, _stakingContract, overrides || {});
    }
    attach(address) {
        return super.attach(address);
    }
    connect(signer) {
        return super.connect(signer);
    }
    static createInterface() {
        return new ethers_1.utils.Interface(_abi);
    }
    static connect(address, signerOrProvider) {
        return new ethers_1.Contract(address, _abi, signerOrProvider);
    }
}
exports.BoostDirector__factory = BoostDirector__factory;
BoostDirector__factory.bytecode = _bytecode;
BoostDirector__factory.abi = _abi;
//# sourceMappingURL=BoostDirector__factory.js.map