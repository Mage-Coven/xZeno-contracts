"use strict";
/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */
Object.defineProperty(exports, "__esModule", { value: true });
exports.MockATokenV2__factory = void 0;
const ethers_1 = require("ethers");
const _abi = [
    {
        inputs: [
            {
                internalType: "address",
                name: "_lendingPool",
                type: "address",
            },
            {
                internalType: "contract IERC20",
                name: "_underlyingToken",
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
                indexed: true,
                internalType: "address",
                name: "owner",
                type: "address",
            },
            {
                indexed: true,
                internalType: "address",
                name: "spender",
                type: "address",
            },
            {
                indexed: false,
                internalType: "uint256",
                name: "value",
                type: "uint256",
            },
        ],
        name: "Approval",
        type: "event",
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: true,
                internalType: "address",
                name: "from",
                type: "address",
            },
            {
                indexed: true,
                internalType: "address",
                name: "to",
                type: "address",
            },
            {
                indexed: false,
                internalType: "uint256",
                name: "value",
                type: "uint256",
            },
        ],
        name: "Transfer",
        type: "event",
    },
    {
        inputs: [
            {
                internalType: "address",
                name: "owner",
                type: "address",
            },
            {
                internalType: "address",
                name: "spender",
                type: "address",
            },
        ],
        name: "allowance",
        outputs: [
            {
                internalType: "uint256",
                name: "",
                type: "uint256",
            },
        ],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [
            {
                internalType: "address",
                name: "spender",
                type: "address",
            },
            {
                internalType: "uint256",
                name: "amount",
                type: "uint256",
            },
        ],
        name: "approve",
        outputs: [
            {
                internalType: "bool",
                name: "",
                type: "bool",
            },
        ],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [
            {
                internalType: "address",
                name: "account",
                type: "address",
            },
        ],
        name: "balanceOf",
        outputs: [
            {
                internalType: "uint256",
                name: "",
                type: "uint256",
            },
        ],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [
            {
                internalType: "address",
                name: "user",
                type: "address",
            },
            {
                internalType: "uint256",
                name: "amount",
                type: "uint256",
            },
        ],
        name: "burn",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [],
        name: "decimals",
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
                name: "spender",
                type: "address",
            },
            {
                internalType: "uint256",
                name: "subtractedValue",
                type: "uint256",
            },
        ],
        name: "decreaseAllowance",
        outputs: [
            {
                internalType: "bool",
                name: "",
                type: "bool",
            },
        ],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [
            {
                internalType: "address",
                name: "spender",
                type: "address",
            },
            {
                internalType: "uint256",
                name: "addedValue",
                type: "uint256",
            },
        ],
        name: "increaseAllowance",
        outputs: [
            {
                internalType: "bool",
                name: "",
                type: "bool",
            },
        ],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [],
        name: "lendingPool",
        outputs: [
            {
                internalType: "address",
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
                name: "user",
                type: "address",
            },
            {
                internalType: "uint256",
                name: "amount",
                type: "uint256",
            },
        ],
        name: "mint",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [],
        name: "name",
        outputs: [
            {
                internalType: "string",
                name: "",
                type: "string",
            },
        ],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [],
        name: "symbol",
        outputs: [
            {
                internalType: "string",
                name: "",
                type: "string",
            },
        ],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [],
        name: "totalSupply",
        outputs: [
            {
                internalType: "uint256",
                name: "",
                type: "uint256",
            },
        ],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [
            {
                internalType: "address",
                name: "recipient",
                type: "address",
            },
            {
                internalType: "uint256",
                name: "amount",
                type: "uint256",
            },
        ],
        name: "transfer",
        outputs: [
            {
                internalType: "bool",
                name: "",
                type: "bool",
            },
        ],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [
            {
                internalType: "address",
                name: "sender",
                type: "address",
            },
            {
                internalType: "address",
                name: "recipient",
                type: "address",
            },
            {
                internalType: "uint256",
                name: "amount",
                type: "uint256",
            },
        ],
        name: "transferFrom",
        outputs: [
            {
                internalType: "bool",
                name: "",
                type: "bool",
            },
        ],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [],
        name: "underlyingToken",
        outputs: [
            {
                internalType: "contract IERC20",
                name: "",
                type: "address",
            },
        ],
        stateMutability: "view",
        type: "function",
    },
];
const _bytecode = "0x60806040523480156200001157600080fd5b5060405162000e0b38038062000e0b833981016040819052620000349162000180565b6040518060400160405280600a81526020016926b7b1b5a0aa37b5b2b760b11b8152506040518060400160405280600381526020016213505560ea1b81525081600390805190602001906200008b929190620000da565b508051620000a1906004906020840190620000da565b5050600580546001600160a01b039485166001600160a01b03199182161790915560068054939094169216919091179091555062000214565b828054620000e890620001be565b90600052602060002090601f0160209004810192826200010c576000855562000157565b82601f106200012757805160ff191683800117855562000157565b8280016001018555821562000157579182015b82811115620001575782518255916020019190600101906200013a565b506200016592915062000169565b5090565b5b808211156200016557600081556001016200016a565b6000806040838503121562000193578182fd5b8251620001a081620001fb565b6020840151909250620001b381620001fb565b809150509250929050565b600281046001821680620001d357607f821691505b60208210811415620001f557634e487b7160e01b600052602260045260246000fd5b50919050565b6001600160a01b03811681146200021157600080fd5b50565b610be780620002246000396000f3fe608060405234801561001057600080fd5b50600436106100f55760003560e01c806340c10f1911610097578063a457c2d711610066578063a457c2d7146101f0578063a59a997314610203578063a9059cbb14610216578063dd62ed3e14610229576100f5565b806340c10f19146101ad57806370a08231146101c257806395d89b41146101d55780639dc29fac146101dd576100f5565b806323b872dd116100d357806323b872dd1461014d5780632495a59914610160578063313ce5671461018b578063395093511461019a576100f5565b806306fdde03146100fa578063095ea7b31461011857806318160ddd1461013b575b600080fd5b610102610262565b60405161010f9190610ade565b60405180910390f35b61012b610126366004610ab5565b6102f4565b604051901515815260200161010f565b6002545b60405190815260200161010f565b61012b61015b366004610a7a565b61030a565b600654610173906001600160a01b031681565b6040516001600160a01b03909116815260200161010f565b6040516012815260200161010f565b61012b6101a8366004610ab5565b6103c0565b6101c06101bb366004610ab5565b6103f7565b005b61013f6101d0366004610a27565b610405565b610102610424565b6101c06101eb366004610ab5565b610433565b61012b6101fe366004610ab5565b61043d565b600554610173906001600160a01b031681565b61012b610224366004610ab5565b6104d8565b61013f610237366004610a48565b6001600160a01b03918216600090815260016020908152604080832093909416825291909152205490565b60606003805461027190610b60565b80601f016020809104026020016040519081016040528092919081815260200182805461029d90610b60565b80156102ea5780601f106102bf576101008083540402835291602001916102ea565b820191906000526020600020905b8154815290600101906020018083116102cd57829003601f168201915b5050505050905090565b60006103013384846104e5565b50600192915050565b600061031784848461060a565b6001600160a01b0384166000908152600160209081526040808320338452909152902054828110156103a15760405162461bcd60e51b815260206004820152602860248201527f45524332303a207472616e7366657220616d6f756e74206578636565647320616044820152676c6c6f77616e636560c01b60648201526084015b60405180910390fd5b6103b585336103b08685610b49565b6104e5565b506001949350505050565b3360008181526001602090815260408083206001600160a01b038716845290915281205490916103019185906103b0908690610b31565b61040182826107e2565b5050565b6001600160a01b0381166000908152602081905260409020545b919050565b60606004805461027190610b60565b61040182826108c1565b3360009081526001602090815260408083206001600160a01b0386168452909152812054828110156104bf5760405162461bcd60e51b815260206004820152602560248201527f45524332303a2064656372656173656420616c6c6f77616e63652062656c6f77604482015264207a65726f60d81b6064820152608401610398565b6104ce33856103b08685610b49565b5060019392505050565b600061030133848461060a565b6001600160a01b0383166105475760405162461bcd60e51b8152602060048201526024808201527f45524332303a20617070726f76652066726f6d20746865207a65726f206164646044820152637265737360e01b6064820152608401610398565b6001600160a01b0382166105a85760405162461bcd60e51b815260206004820152602260248201527f45524332303a20617070726f766520746f20746865207a65726f206164647265604482015261737360f01b6064820152608401610398565b6001600160a01b0383811660008181526001602090815260408083209487168084529482529182902085905590518481527f8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b92591015b60405180910390a3505050565b6001600160a01b03831661066e5760405162461bcd60e51b815260206004820152602560248201527f45524332303a207472616e736665722066726f6d20746865207a65726f206164604482015264647265737360d81b6064820152608401610398565b6001600160a01b0382166106d05760405162461bcd60e51b815260206004820152602360248201527f45524332303a207472616e7366657220746f20746865207a65726f206164647260448201526265737360e81b6064820152608401610398565b6001600160a01b038316600090815260208190526040902054818110156107485760405162461bcd60e51b815260206004820152602660248201527f45524332303a207472616e7366657220616d6f756e7420657863656564732062604482015265616c616e636560d01b6064820152608401610398565b6107528282610b49565b6001600160a01b038086166000908152602081905260408082209390935590851681529081208054849290610788908490610b31565b92505081905550826001600160a01b0316846001600160a01b03167fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef846040516107d491815260200190565b60405180910390a350505050565b6001600160a01b0382166108385760405162461bcd60e51b815260206004820152601f60248201527f45524332303a206d696e7420746f20746865207a65726f2061646472657373006044820152606401610398565b806002600082825461084a9190610b31565b90915550506001600160a01b03821660009081526020819052604081208054839290610877908490610b31565b90915550506040518181526001600160a01b038316906000907fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef9060200160405180910390a35050565b6001600160a01b0382166109215760405162461bcd60e51b815260206004820152602160248201527f45524332303a206275726e2066726f6d20746865207a65726f206164647265736044820152607360f81b6064820152608401610398565b6001600160a01b038216600090815260208190526040902054818110156109955760405162461bcd60e51b815260206004820152602260248201527f45524332303a206275726e20616d6f756e7420657863656564732062616c616e604482015261636560f01b6064820152608401610398565b61099f8282610b49565b6001600160a01b038416600090815260208190526040812091909155600280548492906109cd908490610b49565b90915550506040518281526000906001600160a01b038516907fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef906020016105fd565b80356001600160a01b038116811461041f57600080fd5b600060208284031215610a38578081fd5b610a4182610a10565b9392505050565b60008060408385031215610a5a578081fd5b610a6383610a10565b9150610a7160208401610a10565b90509250929050565b600080600060608486031215610a8e578081fd5b610a9784610a10565b9250610aa560208501610a10565b9150604084013590509250925092565b60008060408385031215610ac7578182fd5b610ad083610a10565b946020939093013593505050565b6000602080835283518082850152825b81811015610b0a57858101830151858201604001528201610aee565b81811115610b1b5783604083870101525b50601f01601f1916929092016040019392505050565b60008219821115610b4457610b44610b9b565b500190565b600082821015610b5b57610b5b610b9b565b500390565b600281046001821680610b7457607f821691505b60208210811415610b9557634e487b7160e01b600052602260045260246000fd5b50919050565b634e487b7160e01b600052601160045260246000fdfea26469706673582212208058795fdce5e577cb8d36a75e15091b8baf2951d45ff915f77b85a623efaba264736f6c63430008020033";
class MockATokenV2__factory extends ethers_1.ContractFactory {
    constructor(signer) {
        super(_abi, _bytecode, signer);
    }
    deploy(_lendingPool, _underlyingToken, overrides) {
        return super.deploy(_lendingPool, _underlyingToken, overrides || {});
    }
    getDeployTransaction(_lendingPool, _underlyingToken, overrides) {
        return super.getDeployTransaction(_lendingPool, _underlyingToken, overrides || {});
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
exports.MockATokenV2__factory = MockATokenV2__factory;
MockATokenV2__factory.bytecode = _bytecode;
MockATokenV2__factory.abi = _abi;
//# sourceMappingURL=MockATokenV2__factory.js.map