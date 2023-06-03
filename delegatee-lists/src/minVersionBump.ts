import { diffDelegateeLists } from './diffDelegateeLists'
import { VersionUpgrade } from './getVersionUpgrade'
import { DelegateeInfoWithAddress } from './types'

/**
 * Returns the minimum version bump for the given list
 * @param baseList the base list of delegatees
 * @param updatedList the updated list of delegatees
 */
export function minVersionBump(baseList: DelegateeInfoWithAddress[], updatedList: DelegateeInfoWithAddress[]): VersionUpgrade {
  const diff = diffDelegateeLists(baseList, updatedList)
  if (diff.removed.length > 0) return VersionUpgrade.MAJOR
  if (diff.added.length > 0) return VersionUpgrade.MINOR
  if (Object.keys(diff.changed).length > 0) return VersionUpgrade.PATCH
  return VersionUpgrade.NONE
}
