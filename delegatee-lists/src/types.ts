export type DelegateeInfo = (
  | {
      readonly address: string
      readonly ensName?: string
    }
  | { readonly ensName: string; readonly address?: string }
) & {
  readonly chainId: number
  readonly displayName: string
  readonly avatarURI?: string
  readonly profileURI?: string
  readonly bio?: string
  readonly tags?: string[]
  readonly extensions?: {
    readonly [key: string]: string | number | boolean | null
  }
}

export type DelegateeInfoWithAddress = Extract<DelegateeInfo, { address: string }>

export type DelegateeInfoWithENSName = Extract<DelegateeInfo, { ensName: string }>

export interface Version {
  readonly major: number
  readonly minor: number
  readonly patch: number
}

export interface Tags {
  readonly [tagId: string]: {
    readonly name: string
    readonly description: string
  }
}

export interface DelegateeList {
  readonly name: string
  readonly timestamp: string
  readonly version: Version
  readonly delegatees: DelegateeInfo[]
  readonly keywords?: string[]
  readonly tags?: Tags
  readonly logoURI?: string
}
