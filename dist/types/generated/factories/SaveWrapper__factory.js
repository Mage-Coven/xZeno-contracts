"use strict";
/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SaveWrapper__factory = void 0;
const ethers_1 = require("ethers");
const _abi = [
    {
        anonymous: false,
        inputs: [
            {
                indexed: true,
                internalType: "address",
                name: "previousOwner",
                type: "address",
            },
            {
                indexed: true,
                internalType: "address",
                name: "newOwner",
                type: "address",
            },
        ],
        name: "OwnershipTransferred",
        type: "event",
    },
    {
        inputs: [
            {
                internalType: "address[]",
                name: "_tokens",
                type: "address[]",
            },
            {
                internalType: "address",
                name: "_spender",
                type: "address",
            },
        ],
        name: "approve",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [
            {
                internalType: "address",
                name: "_token",
                type: "address",
            },
            {
                internalType: "address",
                name: "_spender",
                type: "address",
            },
        ],
        name: "approve",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [
            {
                internalType: "address",
                name: "_mAsset",
                type: "address",
            },
            {
                internalType: "address[]",
                name: "_bAssets",
                type: "address[]",
            },
            {
                internalType: "address[]",
                name: "_fPools",
                type: "address[]",
            },
            {
                internalType: "address[]",
                name: "_fAssets",
                type: "address[]",
            },
            {
                internalType: "address",
                name: "_save",
                type: "address",
            },
            {
                internalType: "address",
                name: "_vault",
                type: "address",
            },
        ],
        name: "approve",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [
            {
                internalType: "address",
                name: "_mAsset",
                type: "address",
            },
            {
                internalType: "address",
                name: "_uniswap",
                type: "address",
            },
            {
                internalType: "uint256",
                name: "_ethAmount",
                type: "uint256",
            },
            {
                internalType: "address[]",
                name: "_path",
                type: "address[]",
            },
        ],
        name: "estimate_saveViaUniswapETH",
        outputs: [
            {
                internalType: "uint256",
                name: "out",
                type: "uint256",
            },
        ],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [],
        name: "owner",
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
        inputs: [],
        name: "renounceOwnership",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [
            {
                internalType: "address",
                name: "_mAsset",
                type: "address",
            },
            {
                internalType: "address",
                name: "_save",
                type: "address",
            },
            {
                internalType: "address",
                name: "_vault",
                type: "address",
            },
            {
                internalType: "uint256",
                name: "_amount",
                type: "uint256",
            },
        ],
        name: "saveAndStake",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [
            {
                internalType: "address",
                name: "_mAsset",
                type: "address",
            },
            {
                internalType: "address",
                name: "_save",
                type: "address",
            },
            {
                internalType: "address",
                name: "_vault",
                type: "address",
            },
            {
                internalType: "address",
                name: "_bAsset",
                type: "address",
            },
            {
                internalType: "uint256",
                name: "_amount",
                type: "uint256",
            },
            {
                internalType: "uint256",
                name: "_minOut",
                type: "uint256",
            },
            {
                internalType: "bool",
                name: "_stake",
                type: "bool",
            },
        ],
        name: "saveViaMint",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [
            {
                internalType: "address",
                name: "_mAsset",
                type: "address",
            },
            {
                internalType: "address",
                name: "_save",
                type: "address",
            },
            {
                internalType: "address",
                name: "_vault",
                type: "address",
            },
            {
                internalType: "address",
                name: "_feeder",
                type: "address",
            },
            {
                internalType: "address",
                name: "_fAsset",
                type: "address",
            },
            {
                internalType: "uint256",
                name: "_fAssetQuantity",
                type: "uint256",
            },
            {
                internalType: "uint256",
                name: "_minOutputQuantity",
                type: "uint256",
            },
            {
                internalType: "bool",
                name: "_stake",
                type: "bool",
            },
        ],
        name: "saveViaSwap",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [
            {
                internalType: "address",
                name: "_mAsset",
                type: "address",
            },
            {
                internalType: "address",
                name: "_save",
                type: "address",
            },
            {
                internalType: "address",
                name: "_vault",
                type: "address",
            },
            {
                internalType: "address",
                name: "_uniswap",
                type: "address",
            },
            {
                internalType: "uint256",
                name: "_amountOutMin",
                type: "uint256",
            },
            {
                internalType: "address[]",
                name: "_path",
                type: "address[]",
            },
            {
                internalType: "uint256",
                name: "_minOutMStable",
                type: "uint256",
            },
            {
                internalType: "bool",
                name: "_stake",
                type: "bool",
            },
        ],
        name: "saveViaUniswapETH",
        outputs: [],
        stateMutability: "payable",
        type: "function",
    },
    {
        inputs: [
            {
                internalType: "address",
                name: "newOwner",
                type: "address",
            },
        ],
        name: "transferOwnership",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
];
const _bytecode = "0x608060405234801561001057600080fd5b50600080546001600160a01b031916339081178255604051909182917f8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e0908290a350611cad806100616000396000f3fe60806040526004361061009c5760003560e01c80637e5465ba116100645780637e5465ba1461012b5780638da5cb5b1461014b578063b132fdc214610178578063b6623e4c14610198578063f2fde38b146101c6578063fa635f2b146101e65761009c565b806338111242146100a15780635011fe4e146100c357806364202c9f146100d6578063715018a6146100f657806372a9f0421461010b575b600080fd5b3480156100ad57600080fd5b506100c16100bc3660046116cd565b610206565b005b6100c16100d1366004611622565b610388565b3480156100e257600080fd5b506100c16100f13660046118c6565b61060a565b34801561010257600080fd5b506100c1610644565b34801561011757600080fd5b506100c1610126366004611748565b6106b8565b34801561013757600080fd5b506100c1610146366004611564565b610752565b34801561015757600080fd5b506000546040516001600160a01b0390911681526020015b60405180910390f35b34801561018457600080fd5b506100c16101933660046117ff565b61078a565b3480156101a457600080fd5b506101b86101b3366004611792565b6108bd565b60405190815260200161016f565b3480156101d257600080fd5b506100c16101e136600461154a565b610a46565b3480156101f257600080fd5b506100c1610201366004611596565b610b30565b6001600160a01b0387166102355760405162461bcd60e51b815260040161022c90611aa7565b60405180910390fd5b6001600160a01b03861661025b5760405162461bcd60e51b815260040161022c90611a81565b6001600160a01b0385166102815760405162461bcd60e51b815260040161022c90611a5a565b6001600160a01b0384166102c85760405162461bcd60e51b815260206004820152600e60248201526d125b9d985b1a590818905cdcd95d60921b604482015260640161022c565b6102dd6001600160a01b038516333086610cf8565b604051637ba5ff4760e11b81526001600160a01b03858116600483015260248201859052604482018490523060648301526000919089169063f74bfe8e90608401602060405180830381600087803b15801561033857600080fd5b505af115801561034c573d6000803e3d6000fd5b505050506040513d601f19601f8201168201806040525081019061037091906119f3565b905061037e87878385610d63565b5050505050505050565b6001600160a01b0389166103ae5760405162461bcd60e51b815260040161022c90611aa7565b6001600160a01b0388166103d45760405162461bcd60e51b815260040161022c90611a81565b6001600160a01b0387166103fa5760405162461bcd60e51b815260040161022c90611a5a565b6001600160a01b0386166104425760405162461bcd60e51b815260206004820152600f60248201526e0496e76616c696420756e697377617608c1b604482015260640161022c565b60006001600160a01b038716637ff36ab53488888830610464426103e8611bc4565b6040518763ffffffff1660e01b8152600401610484959493929190611b04565b6000604051808303818588803b15801561049d57600080fd5b505af11580156104b1573d6000803e3d6000fd5b50505050506040513d6000823e601f3d908101601f191682016040526104da9190810190611918565b905060006001600160a01b038b1663f74bfe8e87876104fa600182611bdc565b81811061051757634e487b7160e01b600052603260045260246000fd5b905060200201602081019061052c919061154a565b846001865161053b9190611bdc565b8151811061055957634e487b7160e01b600052603260045260246000fd5b60209081029190910101516040516001600160e01b031960e085901b1681526001600160a01b039092166004830152602482015260448101879052306064820152608401602060405180830381600087803b1580156105b757600080fd5b505af11580156105cb573d6000803e3d6000fd5b505050506040513d601f19601f820116820180604052508101906105ef91906119f3565b90506105fd8a8a8386610d63565b5050505050505050505050565b6000546001600160a01b031633146106345760405162461bcd60e51b815260040161022c90611acf565b61063f838383610edc565b505050565b6000546001600160a01b0316331461066e5760405162461bcd60e51b815260040161022c90611acf565b600080546040516001600160a01b03909116907f8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e0908390a3600080546001600160a01b0319169055565b6001600160a01b0384166106de5760405162461bcd60e51b815260040161022c90611aa7565b6001600160a01b0383166107045760405162461bcd60e51b815260040161022c90611a81565b6001600160a01b03821661072a5760405162461bcd60e51b815260040161022c90611a5a565b61073f6001600160a01b038516333084610cf8565b61074c8383836001610d63565b50505050565b6000546001600160a01b0316331461077c5760405162461bcd60e51b815260040161022c90611acf565b610786828261100b565b5050565b6000546001600160a01b031633146107b45760405162461bcd60e51b815260040161022c90611acf565b6107be898361100b565b6107c8828261100b565b6107d388888b610edc565b8483146108225760405162461bcd60e51b815260206004820152601a60248201527f4d69736d61746368696e672066506f6f6c732f66417373657473000000000000604482015260640161022c565b60005b858110156108b15761089f85858381811061085057634e487b7160e01b600052603260045260246000fd5b9050602002016020810190610865919061154a565b88888481811061088557634e487b7160e01b600052603260045260246000fd5b905060200201602081019061089a919061154a565b61100b565b806108a981611c1f565b915050610825565b50505050505050505050565b60006001600160a01b0386166108e55760405162461bcd60e51b815260040161022c90611aa7565b6001600160a01b03851661092d5760405162461bcd60e51b815260206004820152600f60248201526e0496e76616c696420756e697377617608c1b604482015260640161022c565b600061096d86868686808060200260200160405190810160405280939291908181526020018383602002808284376000920191909152506110af92505050565b90506001600160a01b03871663119849cf858561098b600182611bdc565b8181106109a857634e487b7160e01b600052603260045260246000fd5b90506020020160208101906109bd919061154a565b6040516001600160e01b031960e084901b1681526001600160a01b0390911660048201526024810184905260440160206040518083038186803b158015610a0357600080fd5b505afa158015610a17573d6000803e3d6000fd5b505050506040513d601f19601f82011682018060405250810190610a3b91906119f3565b979650505050505050565b6000546001600160a01b03163314610a705760405162461bcd60e51b815260040161022c90611acf565b6001600160a01b038116610ad55760405162461bcd60e51b815260206004820152602660248201527f4f776e61626c653a206e6577206f776e657220697320746865207a65726f206160448201526564647265737360d01b606482015260840161022c565b600080546040516001600160a01b03808516939216917f8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e091a3600080546001600160a01b0319166001600160a01b0392909216919091179055565b6001600160a01b038516610b775760405162461bcd60e51b815260206004820152600e60248201526d24b73b30b634b2103332b2b232b960911b604482015260640161022c565b6001600160a01b038816610b9d5760405162461bcd60e51b815260040161022c90611aa7565b6001600160a01b038716610bc35760405162461bcd60e51b815260040161022c90611a81565b6001600160a01b038616610be95760405162461bcd60e51b815260040161022c90611a5a565b6001600160a01b038416610c2f5760405162461bcd60e51b815260206004820152600d60248201526c125b9d985b1a59081a5b9c1d5d609a1b604482015260640161022c565b610c446001600160a01b038516333086610cf8565b60405163d5bcb9b560e01b81526001600160a01b038581166004830152898116602483015260448201859052606482018490523060848301526000919087169063d5bcb9b59060a401602060405180830381600087803b158015610ca757600080fd5b505af1158015610cbb573d6000803e3d6000fd5b505050506040513d601f19601f82011682018060405250810190610cdf91906119f3565b9050610ced88888385610d63565b505050505050505050565b6040516001600160a01b038085166024830152831660448201526064810182905261074c9085906323b872dd60e01b906084015b60408051601f198184030181529190526020810180516001600160e01b03166001600160e01b031990931692909217909152611176565b8015610e555760405163590745c560e01b8152600481018390523060248201526000906001600160a01b0386169063590745c590604401602060405180830381600087803b158015610db457600080fd5b505af1158015610dc8573d6000803e3d6000fd5b505050506040513d601f19601f82011682018060405250810190610dec91906119f3565b6040516356e4bb9760e11b8152336004820152602481018290529091506001600160a01b0385169063adc9772e90604401600060405180830381600087803b158015610e3757600080fd5b505af1158015610e4b573d6000803e3d6000fd5b505050505061074c565b60405163590745c560e01b8152600481018390523360248201526001600160a01b0385169063590745c590604401602060405180830381600087803b158015610e9d57600080fd5b505af1158015610eb1573d6000803e3d6000fd5b505050506040513d601f19601f82011682018060405250810190610ed591906119f3565b5050505050565b6001600160a01b038116610f245760405162461bcd60e51b815260206004820152600f60248201526e24b73b30b634b21039b832b73232b960891b604482015260640161022c565b60005b8281101561074c576000848483818110610f5157634e487b7160e01b600052603260045260246000fd5b9050602002016020810190610f66919061154a565b6001600160a01b03161415610fad5760405162461bcd60e51b815260206004820152600d60248201526c24b73b30b634b2103a37b5b2b760991b604482015260640161022c565b610ff982600019868685818110610fd457634e487b7160e01b600052603260045260246000fd5b9050602002016020810190610fe9919061154a565b6001600160a01b03169190611248565b8061100381611c1f565b915050610f27565b6001600160a01b0381166110535760405162461bcd60e51b815260206004820152600f60248201526e24b73b30b634b21039b832b73232b960891b604482015260640161022c565b6001600160a01b0382166110995760405162461bcd60e51b815260206004820152600d60248201526c24b73b30b634b2103a37b5b2b760991b604482015260640161022c565b6107866001600160a01b03831682600019611248565b600080846001600160a01b031663d06ca61f85856040518363ffffffff1660e01b81526004016110e0929190611b6e565b60006040518083038186803b1580156110f857600080fd5b505afa15801561110c573d6000803e3d6000fd5b505050506040513d6000823e601f3d908101601f191682016040526111349190810190611918565b905080600182516111459190611bdc565b8151811061116357634e487b7160e01b600052603260045260246000fd5b60200260200101519150505b9392505050565b60006111cb826040518060400160405280602081526020017f5361666545524332303a206c6f772d6c6576656c2063616c6c206661696c6564815250856001600160a01b031661136c9092919063ffffffff16565b80519091501561063f57808060200190518101906111e991906119d7565b61063f5760405162461bcd60e51b815260206004820152602a60248201527f5361666545524332303a204552433230206f7065726174696f6e20646964206e6044820152691bdd081cdd58d8d9595960b21b606482015260840161022c565b8015806112d15750604051636eb1769f60e11b81523060048201526001600160a01b03838116602483015284169063dd62ed3e9060440160206040518083038186803b15801561129757600080fd5b505afa1580156112ab573d6000803e3d6000fd5b505050506040513d601f19601f820116820180604052508101906112cf91906119f3565b155b61133c5760405162461bcd60e51b815260206004820152603660248201527f5361666545524332303a20617070726f76652066726f6d206e6f6e2d7a65726f60448201527520746f206e6f6e2d7a65726f20616c6c6f77616e636560501b606482015260840161022c565b6040516001600160a01b03831660248201526044810182905261063f90849063095ea7b360e01b90606401610d2c565b606061137b8484600085611383565b949350505050565b6060824710156113e45760405162461bcd60e51b815260206004820152602660248201527f416464726573733a20696e73756666696369656e742062616c616e636520666f6044820152651c8818d85b1b60d21b606482015260840161022c565b6113ed856114a7565b6114395760405162461bcd60e51b815260206004820152601d60248201527f416464726573733a2063616c6c20746f206e6f6e2d636f6e7472616374000000604482015260640161022c565b600080866001600160a01b031685876040516114559190611a0b565b60006040518083038185875af1925050503d8060008114611492576040519150601f19603f3d011682016040523d82523d6000602084013e611497565b606091505b5091509150610a3b8282866114b1565b803b15155b919050565b606083156114c057508161116f565b8251156114d05782518084602001fd5b8160405162461bcd60e51b815260040161022c9190611a27565b80356001600160a01b03811681146114ac57600080fd5b60008083601f840112611512578081fd5b50813567ffffffffffffffff811115611529578182fd5b602083019150836020808302850101111561154357600080fd5b9250929050565b60006020828403121561155b578081fd5b61116f826114ea565b60008060408385031215611576578081fd5b61157f836114ea565b915061158d602084016114ea565b90509250929050565b600080600080600080600080610100898b0312156115b2578384fd5b6115bb896114ea565b97506115c960208a016114ea565b96506115d760408a016114ea565b95506115e560608a016114ea565b94506115f360808a016114ea565b935060a0890135925060c0890135915060e089013561161181611c66565b809150509295985092959890939650565b60008060008060008060008060006101008a8c031215611640578081fd5b6116498a6114ea565b985061165760208b016114ea565b975061166560408b016114ea565b965061167360608b016114ea565b955060808a0135945060a08a013567ffffffffffffffff811115611695578182fd5b6116a18c828d01611501565b90955093505060c08a0135915060e08a01356116bc81611c66565b809150509295985092959850929598565b600080600080600080600060e0888a0312156116e7578283fd5b6116f0886114ea565b96506116fe602089016114ea565b955061170c604089016114ea565b945061171a606089016114ea565b93506080880135925060a0880135915060c088013561173881611c66565b8091505092959891949750929550565b6000806000806080858703121561175d578384fd5b611766856114ea565b9350611774602086016114ea565b9250611782604086016114ea565b9396929550929360600135925050565b6000806000806000608086880312156117a9578081fd5b6117b2866114ea565b94506117c0602087016114ea565b935060408601359250606086013567ffffffffffffffff8111156117e2578182fd5b6117ee88828901611501565b969995985093965092949392505050565b600080600080600080600080600060c08a8c03121561181c578283fd5b6118258a6114ea565b985060208a013567ffffffffffffffff80821115611841578485fd5b61184d8d838e01611501565b909a50985060408c0135915080821115611865578485fd5b6118718d838e01611501565b909850965060608c0135915080821115611889578485fd5b506118968c828d01611501565b90955093506118a9905060808b016114ea565b91506118b760a08b016114ea565b90509295985092959850929598565b6000806000604084860312156118da578081fd5b833567ffffffffffffffff8111156118f0578182fd5b6118fc86828701611501565b909450925061190f9050602085016114ea565b90509250925092565b6000602080838503121561192a578182fd5b825167ffffffffffffffff80821115611941578384fd5b818501915085601f830112611954578384fd5b81518181111561196657611966611c50565b838102604051601f19603f8301168101818110858211171561198a5761198a611c50565b604052828152858101935084860182860187018a10156119a8578788fd5b8795505b838610156119ca5780518552600195909501949386019386016119ac565b5098975050505050505050565b6000602082840312156119e8578081fd5b815161116f81611c66565b600060208284031215611a04578081fd5b5051919050565b60008251611a1d818460208701611bf3565b9190910192915050565b6000602082528251806020840152611a46816040850160208701611bf3565b601f01601f19169190910160400192915050565b6020808252600d908201526c125b9d985b1a59081d985d5b1d609a1b604082015260600190565b6020808252600c908201526b496e76616c6964207361766560a01b604082015260600190565b6020808252600e908201526d125b9d985b1a59081b505cdcd95d60921b604082015260600190565b6020808252818101527f4f776e61626c653a2063616c6c6572206973206e6f7420746865206f776e6572604082015260600190565b85815260806020808301829052908201859052600090869060a08401835b88811015611b4e576001600160a01b03611b3b856114ea565b1682529282019290820190600101611b22565b506001600160a01b03969096166040850152505050606001529392505050565b60006040820184835260206040818501528185518084526060860191508287019350845b81811015611bb75784516001600160a01b031683529383019391830191600101611b92565b5090979650505050505050565b60008219821115611bd757611bd7611c3a565b500190565b600082821015611bee57611bee611c3a565b500390565b60005b83811015611c0e578181015183820152602001611bf6565b8381111561074c5750506000910152565b6000600019821415611c3357611c33611c3a565b5060010190565b634e487b7160e01b600052601160045260246000fd5b634e487b7160e01b600052604160045260246000fd5b8015158114611c7457600080fd5b5056fea264697066735822122087ed92ce6c12a7cf6de40c9db10c8658f92c3b83034f23507f35989b0f70834364736f6c63430008020033";
class SaveWrapper__factory extends ethers_1.ContractFactory {
    constructor(signer) {
        super(_abi, _bytecode, signer);
    }
    deploy(overrides) {
        return super.deploy(overrides || {});
    }
    getDeployTransaction(overrides) {
        return super.getDeployTransaction(overrides || {});
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
exports.SaveWrapper__factory = SaveWrapper__factory;
SaveWrapper__factory.bytecode = _bytecode;
SaveWrapper__factory.abi = _abi;
//# sourceMappingURL=SaveWrapper__factory.js.map