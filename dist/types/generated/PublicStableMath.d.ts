/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */

import {
  ethers,
  EventFilter,
  Signer,
  BigNumber,
  BigNumberish,
  PopulatedTransaction,
  BaseContract,
  ContractTransaction,
  CallOverrides,
} from "ethers";
import { BytesLike } from "@ethersproject/bytes";
import { Listener, Provider } from "@ethersproject/providers";
import { FunctionFragment, EventFragment, Result } from "@ethersproject/abi";
import { TypedEventFilter, TypedEvent, TypedListener } from "./commons";

interface PublicStableMathInterface extends ethers.utils.Interface {
  functions: {
    "clamp(uint256,uint256)": FunctionFragment;
    "divPrecisely(uint256,uint256)": FunctionFragment;
    "divRatioPrecisely(uint256,uint256)": FunctionFragment;
    "getFullScale()": FunctionFragment;
    "getRatioScale()": FunctionFragment;
    "max(uint256,uint256)": FunctionFragment;
    "min(uint256,uint256)": FunctionFragment;
    "mulRatioTruncate(uint256,uint256)": FunctionFragment;
    "mulRatioTruncateCeil(uint256,uint256)": FunctionFragment;
    "mulTruncate(uint256,uint256)": FunctionFragment;
    "mulTruncateCeil(uint256,uint256)": FunctionFragment;
    "mulTruncateScale(uint256,uint256,uint256)": FunctionFragment;
    "scaleInteger(uint256)": FunctionFragment;
  };

  encodeFunctionData(
    functionFragment: "clamp",
    values: [BigNumberish, BigNumberish]
  ): string;
  encodeFunctionData(
    functionFragment: "divPrecisely",
    values: [BigNumberish, BigNumberish]
  ): string;
  encodeFunctionData(
    functionFragment: "divRatioPrecisely",
    values: [BigNumberish, BigNumberish]
  ): string;
  encodeFunctionData(
    functionFragment: "getFullScale",
    values?: undefined
  ): string;
  encodeFunctionData(
    functionFragment: "getRatioScale",
    values?: undefined
  ): string;
  encodeFunctionData(
    functionFragment: "max",
    values: [BigNumberish, BigNumberish]
  ): string;
  encodeFunctionData(
    functionFragment: "min",
    values: [BigNumberish, BigNumberish]
  ): string;
  encodeFunctionData(
    functionFragment: "mulRatioTruncate",
    values: [BigNumberish, BigNumberish]
  ): string;
  encodeFunctionData(
    functionFragment: "mulRatioTruncateCeil",
    values: [BigNumberish, BigNumberish]
  ): string;
  encodeFunctionData(
    functionFragment: "mulTruncate",
    values: [BigNumberish, BigNumberish]
  ): string;
  encodeFunctionData(
    functionFragment: "mulTruncateCeil",
    values: [BigNumberish, BigNumberish]
  ): string;
  encodeFunctionData(
    functionFragment: "mulTruncateScale",
    values: [BigNumberish, BigNumberish, BigNumberish]
  ): string;
  encodeFunctionData(
    functionFragment: "scaleInteger",
    values: [BigNumberish]
  ): string;

  decodeFunctionResult(functionFragment: "clamp", data: BytesLike): Result;
  decodeFunctionResult(
    functionFragment: "divPrecisely",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "divRatioPrecisely",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "getFullScale",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "getRatioScale",
    data: BytesLike
  ): Result;
  decodeFunctionResult(functionFragment: "max", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "min", data: BytesLike): Result;
  decodeFunctionResult(
    functionFragment: "mulRatioTruncate",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "mulRatioTruncateCeil",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "mulTruncate",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "mulTruncateCeil",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "mulTruncateScale",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "scaleInteger",
    data: BytesLike
  ): Result;

  events: {};
}

export class PublicStableMath extends BaseContract {
  connect(signerOrProvider: Signer | Provider | string): this;
  attach(addressOrName: string): this;
  deployed(): Promise<this>;

  listeners<EventArgsArray extends Array<any>, EventArgsObject>(
    eventFilter?: TypedEventFilter<EventArgsArray, EventArgsObject>
  ): Array<TypedListener<EventArgsArray, EventArgsObject>>;
  off<EventArgsArray extends Array<any>, EventArgsObject>(
    eventFilter: TypedEventFilter<EventArgsArray, EventArgsObject>,
    listener: TypedListener<EventArgsArray, EventArgsObject>
  ): this;
  on<EventArgsArray extends Array<any>, EventArgsObject>(
    eventFilter: TypedEventFilter<EventArgsArray, EventArgsObject>,
    listener: TypedListener<EventArgsArray, EventArgsObject>
  ): this;
  once<EventArgsArray extends Array<any>, EventArgsObject>(
    eventFilter: TypedEventFilter<EventArgsArray, EventArgsObject>,
    listener: TypedListener<EventArgsArray, EventArgsObject>
  ): this;
  removeListener<EventArgsArray extends Array<any>, EventArgsObject>(
    eventFilter: TypedEventFilter<EventArgsArray, EventArgsObject>,
    listener: TypedListener<EventArgsArray, EventArgsObject>
  ): this;
  removeAllListeners<EventArgsArray extends Array<any>, EventArgsObject>(
    eventFilter: TypedEventFilter<EventArgsArray, EventArgsObject>
  ): this;

  listeners(eventName?: string): Array<Listener>;
  off(eventName: string, listener: Listener): this;
  on(eventName: string, listener: Listener): this;
  once(eventName: string, listener: Listener): this;
  removeListener(eventName: string, listener: Listener): this;
  removeAllListeners(eventName?: string): this;

  queryFilter<EventArgsArray extends Array<any>, EventArgsObject>(
    event: TypedEventFilter<EventArgsArray, EventArgsObject>,
    fromBlockOrBlockhash?: string | number | undefined,
    toBlock?: string | number | undefined
  ): Promise<Array<TypedEvent<EventArgsArray & EventArgsObject>>>;

  interface: PublicStableMathInterface;

  functions: {
    clamp(
      x: BigNumberish,
      upperBound: BigNumberish,
      overrides?: CallOverrides
    ): Promise<[BigNumber]>;

    divPrecisely(
      x: BigNumberish,
      y: BigNumberish,
      overrides?: CallOverrides
    ): Promise<[BigNumber]>;

    divRatioPrecisely(
      x: BigNumberish,
      ratio: BigNumberish,
      overrides?: CallOverrides
    ): Promise<[BigNumber]>;

    getFullScale(overrides?: CallOverrides): Promise<[BigNumber]>;

    getRatioScale(overrides?: CallOverrides): Promise<[BigNumber]>;

    max(
      x: BigNumberish,
      y: BigNumberish,
      overrides?: CallOverrides
    ): Promise<[BigNumber]>;

    min(
      x: BigNumberish,
      y: BigNumberish,
      overrides?: CallOverrides
    ): Promise<[BigNumber]>;

    mulRatioTruncate(
      x: BigNumberish,
      ratio: BigNumberish,
      overrides?: CallOverrides
    ): Promise<[BigNumber]>;

    mulRatioTruncateCeil(
      x: BigNumberish,
      ratio: BigNumberish,
      overrides?: CallOverrides
    ): Promise<[BigNumber]>;

    mulTruncate(
      x: BigNumberish,
      y: BigNumberish,
      overrides?: CallOverrides
    ): Promise<[BigNumber]>;

    mulTruncateCeil(
      x: BigNumberish,
      y: BigNumberish,
      overrides?: CallOverrides
    ): Promise<[BigNumber]>;

    mulTruncateScale(
      x: BigNumberish,
      y: BigNumberish,
      scale: BigNumberish,
      overrides?: CallOverrides
    ): Promise<[BigNumber]>;

    scaleInteger(
      x: BigNumberish,
      overrides?: CallOverrides
    ): Promise<[BigNumber]>;
  };

  clamp(
    x: BigNumberish,
    upperBound: BigNumberish,
    overrides?: CallOverrides
  ): Promise<BigNumber>;

  divPrecisely(
    x: BigNumberish,
    y: BigNumberish,
    overrides?: CallOverrides
  ): Promise<BigNumber>;

  divRatioPrecisely(
    x: BigNumberish,
    ratio: BigNumberish,
    overrides?: CallOverrides
  ): Promise<BigNumber>;

  getFullScale(overrides?: CallOverrides): Promise<BigNumber>;

  getRatioScale(overrides?: CallOverrides): Promise<BigNumber>;

  max(
    x: BigNumberish,
    y: BigNumberish,
    overrides?: CallOverrides
  ): Promise<BigNumber>;

  min(
    x: BigNumberish,
    y: BigNumberish,
    overrides?: CallOverrides
  ): Promise<BigNumber>;

  mulRatioTruncate(
    x: BigNumberish,
    ratio: BigNumberish,
    overrides?: CallOverrides
  ): Promise<BigNumber>;

  mulRatioTruncateCeil(
    x: BigNumberish,
    ratio: BigNumberish,
    overrides?: CallOverrides
  ): Promise<BigNumber>;

  mulTruncate(
    x: BigNumberish,
    y: BigNumberish,
    overrides?: CallOverrides
  ): Promise<BigNumber>;

  mulTruncateCeil(
    x: BigNumberish,
    y: BigNumberish,
    overrides?: CallOverrides
  ): Promise<BigNumber>;

  mulTruncateScale(
    x: BigNumberish,
    y: BigNumberish,
    scale: BigNumberish,
    overrides?: CallOverrides
  ): Promise<BigNumber>;

  scaleInteger(x: BigNumberish, overrides?: CallOverrides): Promise<BigNumber>;

  callStatic: {
    clamp(
      x: BigNumberish,
      upperBound: BigNumberish,
      overrides?: CallOverrides
    ): Promise<BigNumber>;

    divPrecisely(
      x: BigNumberish,
      y: BigNumberish,
      overrides?: CallOverrides
    ): Promise<BigNumber>;

    divRatioPrecisely(
      x: BigNumberish,
      ratio: BigNumberish,
      overrides?: CallOverrides
    ): Promise<BigNumber>;

    getFullScale(overrides?: CallOverrides): Promise<BigNumber>;

    getRatioScale(overrides?: CallOverrides): Promise<BigNumber>;

    max(
      x: BigNumberish,
      y: BigNumberish,
      overrides?: CallOverrides
    ): Promise<BigNumber>;

    min(
      x: BigNumberish,
      y: BigNumberish,
      overrides?: CallOverrides
    ): Promise<BigNumber>;

    mulRatioTruncate(
      x: BigNumberish,
      ratio: BigNumberish,
      overrides?: CallOverrides
    ): Promise<BigNumber>;

    mulRatioTruncateCeil(
      x: BigNumberish,
      ratio: BigNumberish,
      overrides?: CallOverrides
    ): Promise<BigNumber>;

    mulTruncate(
      x: BigNumberish,
      y: BigNumberish,
      overrides?: CallOverrides
    ): Promise<BigNumber>;

    mulTruncateCeil(
      x: BigNumberish,
      y: BigNumberish,
      overrides?: CallOverrides
    ): Promise<BigNumber>;

    mulTruncateScale(
      x: BigNumberish,
      y: BigNumberish,
      scale: BigNumberish,
      overrides?: CallOverrides
    ): Promise<BigNumber>;

    scaleInteger(
      x: BigNumberish,
      overrides?: CallOverrides
    ): Promise<BigNumber>;
  };

  filters: {};

  estimateGas: {
    clamp(
      x: BigNumberish,
      upperBound: BigNumberish,
      overrides?: CallOverrides
    ): Promise<BigNumber>;

    divPrecisely(
      x: BigNumberish,
      y: BigNumberish,
      overrides?: CallOverrides
    ): Promise<BigNumber>;

    divRatioPrecisely(
      x: BigNumberish,
      ratio: BigNumberish,
      overrides?: CallOverrides
    ): Promise<BigNumber>;

    getFullScale(overrides?: CallOverrides): Promise<BigNumber>;

    getRatioScale(overrides?: CallOverrides): Promise<BigNumber>;

    max(
      x: BigNumberish,
      y: BigNumberish,
      overrides?: CallOverrides
    ): Promise<BigNumber>;

    min(
      x: BigNumberish,
      y: BigNumberish,
      overrides?: CallOverrides
    ): Promise<BigNumber>;

    mulRatioTruncate(
      x: BigNumberish,
      ratio: BigNumberish,
      overrides?: CallOverrides
    ): Promise<BigNumber>;

    mulRatioTruncateCeil(
      x: BigNumberish,
      ratio: BigNumberish,
      overrides?: CallOverrides
    ): Promise<BigNumber>;

    mulTruncate(
      x: BigNumberish,
      y: BigNumberish,
      overrides?: CallOverrides
    ): Promise<BigNumber>;

    mulTruncateCeil(
      x: BigNumberish,
      y: BigNumberish,
      overrides?: CallOverrides
    ): Promise<BigNumber>;

    mulTruncateScale(
      x: BigNumberish,
      y: BigNumberish,
      scale: BigNumberish,
      overrides?: CallOverrides
    ): Promise<BigNumber>;

    scaleInteger(
      x: BigNumberish,
      overrides?: CallOverrides
    ): Promise<BigNumber>;
  };

  populateTransaction: {
    clamp(
      x: BigNumberish,
      upperBound: BigNumberish,
      overrides?: CallOverrides
    ): Promise<PopulatedTransaction>;

    divPrecisely(
      x: BigNumberish,
      y: BigNumberish,
      overrides?: CallOverrides
    ): Promise<PopulatedTransaction>;

    divRatioPrecisely(
      x: BigNumberish,
      ratio: BigNumberish,
      overrides?: CallOverrides
    ): Promise<PopulatedTransaction>;

    getFullScale(overrides?: CallOverrides): Promise<PopulatedTransaction>;

    getRatioScale(overrides?: CallOverrides): Promise<PopulatedTransaction>;

    max(
      x: BigNumberish,
      y: BigNumberish,
      overrides?: CallOverrides
    ): Promise<PopulatedTransaction>;

    min(
      x: BigNumberish,
      y: BigNumberish,
      overrides?: CallOverrides
    ): Promise<PopulatedTransaction>;

    mulRatioTruncate(
      x: BigNumberish,
      ratio: BigNumberish,
      overrides?: CallOverrides
    ): Promise<PopulatedTransaction>;

    mulRatioTruncateCeil(
      x: BigNumberish,
      ratio: BigNumberish,
      overrides?: CallOverrides
    ): Promise<PopulatedTransaction>;

    mulTruncate(
      x: BigNumberish,
      y: BigNumberish,
      overrides?: CallOverrides
    ): Promise<PopulatedTransaction>;

    mulTruncateCeil(
      x: BigNumberish,
      y: BigNumberish,
      overrides?: CallOverrides
    ): Promise<PopulatedTransaction>;

    mulTruncateScale(
      x: BigNumberish,
      y: BigNumberish,
      scale: BigNumberish,
      overrides?: CallOverrides
    ): Promise<PopulatedTransaction>;

    scaleInteger(
      x: BigNumberish,
      overrides?: CallOverrides
    ): Promise<PopulatedTransaction>;
  };
}