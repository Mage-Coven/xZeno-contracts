import { DelegateeInfoWithAddress } from './types'

export type DelegateeInfoChangeKey = Exclude<keyof DelegateeInfoWithAddress, 'address' | 'chainId'>
export type DelegateeInfoChanges = Array<DelegateeInfoChangeKey>

/**
 * compares two delegatee info key values
 * this subset of full deep equal functionality does not work on objects or object arrays
 * @param a comparison item a
 * @param b comparison item b
 */
function compareDelegateeInfoProperty(a: unknown, b: unknown): boolean {
  if (a === b) return true
  if (typeof a !== typeof b) return false
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.every((el, i) => b[i] === el)
  }
  return false
}

/**
 * Differences between a base list and an updated list.
 */
export interface DelegateeListDiff {
  /**
   * Delegatees from updated with chainId/address not present in base list
   */
  readonly added: DelegateeInfoWithAddress[]
  /**
   * Delegatees from base with chainId/address not present in the updated list
   */
  readonly removed: DelegateeInfoWithAddress[]
  /**
   * The delegatee info that changed
   */
  readonly changed: {
    [chainId: number]: {
      [address: string]: DelegateeInfoChanges
    }
  }
}

/**
 * Computes the diff of a delegatee list where the first argument is the base and the second argument is the updated list.
 * @param base base list
 * @param update updated list
 */
export function diffDelegateeLists(base: DelegateeInfoWithAddress[], update: DelegateeInfoWithAddress[]): DelegateeListDiff {
  const indexedBase = base.reduce<{
    [chainId: number]: { [address: string]: DelegateeInfoWithAddress }
  }>((memo, delegateeInfo) => {
    if (!memo[delegateeInfo.chainId]) memo[delegateeInfo.chainId] = {}
    memo[delegateeInfo.chainId][delegateeInfo.address] = delegateeInfo
    return memo
  }, {})

  const newListUpdates = update.reduce<{
    added: DelegateeInfoWithAddress[]
    changed: {
      [chainId: number]: {
        [address: string]: DelegateeInfoChanges
      }
    }
    index: {
      [chainId: number]: {
        [address: string]: true
      }
    }
  }>(
    (memo, delegateeInfo) => {
      const baseDelegatee = indexedBase[delegateeInfo.chainId]?.[delegateeInfo.address]
      if (!baseDelegatee) {
        memo.added.push(delegateeInfo)
      } else {
        const changes: DelegateeInfoChanges = Object.keys(delegateeInfo)
          .filter((s): s is DelegateeInfoChangeKey => s !== 'address' && s !== 'chainId')
          .filter(s => {
            return !compareDelegateeInfoProperty(delegateeInfo[s], baseDelegatee[s])
          })
        if (changes.length > 0) {
          if (!memo.changed[delegateeInfo.chainId]) {
            memo.changed[delegateeInfo.chainId] = {}
          }
          memo.changed[delegateeInfo.chainId][delegateeInfo.address] = changes
        }
      }

      if (!memo.index[delegateeInfo.chainId]) {
        memo.index[delegateeInfo.chainId] = {
          [delegateeInfo.address]: true,
        }
      } else {
        memo.index[delegateeInfo.chainId][delegateeInfo.address] = true
      }

      return memo
    },
    { added: [], changed: {}, index: {} },
  )

  const removed = base.reduce<DelegateeInfoWithAddress[]>((list, curr) => {
    if (!newListUpdates.index[curr.chainId] || !newListUpdates.index[curr.chainId][curr.address]) {
      list.push(curr)
    }
    return list
  }, [])

  return {
    added: newListUpdates.added,
    changed: newListUpdates.changed,
    removed,
  }
}
