/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */

import {
  Signer,
  utils,
  BigNumberish,
  Contract,
  ContractFactory,
  Overrides,
} from "ethers";
import { Provider, TransactionRequest } from "@ethersproject/providers";
import type { TToken, TTokenInterface } from "../TToken";

const _abi = [
  {
    inputs: [
      {
        internalType: "string",
        name: "name",
        type: "string",
      },
      {
        internalType: "string",
        name: "symbol",
        type: "string",
      },
      {
        internalType: "uint8",
        name: "decimals",
        type: "uint8",
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
        name: "src",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "dst",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amt",
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
        name: "src",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "dst",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amt",
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
        name: "src",
        type: "address",
      },
      {
        internalType: "address",
        name: "dst",
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
        name: "dst",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "amt",
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
        name: "whom",
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
        internalType: "uint256",
        name: "amt",
        type: "uint256",
      },
    ],
    name: "burn",
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
        name: "dst",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "amt",
        type: "uint256",
      },
    ],
    name: "mint",
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
        name: "dst",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "amt",
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
        name: "src",
        type: "address",
      },
      {
        internalType: "address",
        name: "dst",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "amt",
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
];

const _bytecode =
  "0x60806040523480156200001157600080fd5b5060405162000c2d38038062000c2d8339810160408190526200003491620001e8565b8251620000499060009060208601906200008b565b5081516200005f9060019060208501906200008b565b506002805460ff929092166001600160a81b031990921691909117610100330217905550620002c09050565b82805462000099906200026d565b90600052602060002090601f016020900481019282620000bd576000855562000108565b82601f10620000d857805160ff191683800117855562000108565b8280016001018555821562000108579182015b8281111562000108578251825591602001919060010190620000eb565b50620001169291506200011a565b5090565b5b808211156200011657600081556001016200011b565b600082601f8301126200014357600080fd5b81516001600160401b0380821115620001605762000160620002aa565b604051601f8301601f19908116603f011681019082821181831017156200018b576200018b620002aa565b81604052838152602092508683858801011115620001a857600080fd5b600091505b83821015620001cc5785820183015181830184015290820190620001ad565b83821115620001de5760008385830101525b9695505050505050565b600080600060608486031215620001fe57600080fd5b83516001600160401b03808211156200021657600080fd5b620002248783880162000131565b945060208601519150808211156200023b57600080fd5b506200024a8682870162000131565b925050604084015160ff811681146200026257600080fd5b809150509250925092565b600181811c908216806200028257607f821691505b60208210811415620002a457634e487b7160e01b600052602260045260246000fd5b50919050565b634e487b7160e01b600052604160045260246000fd5b61095d80620002d06000396000f3fe608060405234801561001057600080fd5b50600436106100a95760003560e01c806340c10f191161007157806340c10f191461012957806342966c681461013c57806370a082311461014f57806395d89b4114610178578063a9059cbb14610180578063dd62ed3e1461019357600080fd5b806306fdde03146100ae578063095ea7b3146100cc57806318160ddd146100ef57806323b872dd14610101578063313ce56714610114575b600080fd5b6100b66101cc565b6040516100c39190610852565b60405180910390f35b6100df6100da36600461080f565b61025e565b60405190151581526020016100c3565b6003545b6040519081526020016100c3565b6100df61010f3660046107d3565b6102cb565b60025460405160ff90911681526020016100c3565b6100df61013736600461080f565b610436565b6100df61014a366004610839565b61049b565b6100f361015d36600461077e565b6001600160a01b031660009081526004602052604090205490565b6100b661056e565b6100df61018e36600461080f565b61057d565b6100f36101a13660046107a0565b6001600160a01b03918216600090815260056020908152604080832093909416825291909152205490565b6060600080546101db906108d6565b80601f0160208091040260200160405190810160405280929190818152602001828054610207906108d6565b80156102545780601f1061022957610100808354040283529160200191610254565b820191906000526020600020905b81548152906001019060200180831161023757829003601f168201915b5050505050905090565b3360008181526005602090815260408083206001600160a01b038716808552925280832085905551919290917f8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925906102b99086815260200190565b60405180910390a35060015b92915050565b6000336001600160a01b038516148061030757506001600160a01b03841660009081526005602090815260408083203384529091529020548211155b6103505760405162461bcd60e51b815260206004820152601560248201527422a9292faa2a27a5a2a72fa120a22fa1a0a62622a960591b60448201526064015b60405180910390fd5b61035b848484610586565b336001600160a01b0385161480159061039957506001600160a01b038416600090815260056020908152604080832033845290915290205460001914155b1561042c576001600160a01b03841660009081526005602090815260408083203384529091529020546103cc908361069b565b6001600160a01b0385811660009081526005602090815260408083203380855290835292819020859055519384529186169290917f8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925910160405180910390a35b5060019392505050565b60025460009061010090046001600160a01b031633146104885760405162461bcd60e51b815260206004820152600d60248201526c22a9292fa727aa2fa7aba722a960991b6044820152606401610347565b61049283836106b6565b50600192915050565b306000908152600460205260408120548211156104f45760405162461bcd60e51b815260206004820152601760248201527622a9292fa4a729aaa32324a1a4a2a72a2faa2a27a5a2a760491b6044820152606401610347565b3060009081526004602052604090205461050e908361069b565b3060009081526004602052604090205560035461052b908361069b565b60035560405182815260009030907fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef9060200160405180910390a3506001919050565b6060600180546101db906108d6565b60006104923384845b6001600160a01b0383166000908152600460205260409020548111156105e85760405162461bcd60e51b815260206004820152601760248201527622a9292fa4a729aaa32324a1a4a2a72a2faa2a27a5a2a760491b6044820152606401610347565b6001600160a01b03831660009081526004602052604090205461060b908261069b565b6001600160a01b03808516600090815260046020526040808220939093559084168152205461063a9082610747565b6001600160a01b0380841660008181526004602052604090819020939093559151908516907fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef9061068e9085815260200190565b60405180910390a3505050565b6000826106a883826108bf565b91508111156102c557600080fd5b6001600160a01b0382166000908152600460205260409020546106d99082610747565b6001600160a01b0383166000908152600460205260409020556003546106ff9082610747565b6003556040518181526001600160a01b038316906000907fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef9060200160405180910390a35050565b60008261075483826108a7565b91508110156102c557600080fd5b80356001600160a01b038116811461077957600080fd5b919050565b60006020828403121561079057600080fd5b61079982610762565b9392505050565b600080604083850312156107b357600080fd5b6107bc83610762565b91506107ca60208401610762565b90509250929050565b6000806000606084860312156107e857600080fd5b6107f184610762565b92506107ff60208501610762565b9150604084013590509250925092565b6000806040838503121561082257600080fd5b61082b83610762565b946020939093013593505050565b60006020828403121561084b57600080fd5b5035919050565b600060208083528351808285015260005b8181101561087f57858101830151858201604001528201610863565b81811115610891576000604083870101525b50601f01601f1916929092016040019392505050565b600082198211156108ba576108ba610911565b500190565b6000828210156108d1576108d1610911565b500390565b600181811c908216806108ea57607f821691505b6020821081141561090b57634e487b7160e01b600052602260045260246000fd5b50919050565b634e487b7160e01b600052601160045260246000fdfea264697066735822122032ed599219e776042d98fb49269398625e70497e3ae8b299c8d24048b63a8cdf64736f6c63430008070033";

export class TToken__factory extends ContractFactory {
  constructor(signer?: Signer) {
    super(_abi, _bytecode, signer);
  }

  deploy(
    name: string,
    symbol: string,
    decimals: BigNumberish,
    overrides?: Overrides & { from?: string | Promise<string> }
  ): Promise<TToken> {
    return super.deploy(
      name,
      symbol,
      decimals,
      overrides || {}
    ) as Promise<TToken>;
  }
  getDeployTransaction(
    name: string,
    symbol: string,
    decimals: BigNumberish,
    overrides?: Overrides & { from?: string | Promise<string> }
  ): TransactionRequest {
    return super.getDeployTransaction(name, symbol, decimals, overrides || {});
  }
  attach(address: string): TToken {
    return super.attach(address) as TToken;
  }
  connect(signer: Signer): TToken__factory {
    return super.connect(signer) as TToken__factory;
  }
  static readonly bytecode = _bytecode;
  static readonly abi = _abi;
  static createInterface(): TTokenInterface {
    return new utils.Interface(_abi) as TTokenInterface;
  }
  static connect(address: string, signerOrProvider: Signer | Provider): TToken {
    return new Contract(address, _abi, signerOrProvider) as TToken;
  }
}
