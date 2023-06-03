# @xblackfury/delegatee-lists

Forked from Uniswap's [Token Lists](https://github.com/Uniswap/token-lists) specification.

[![Tests](https://github.com/xzeno/delegatee-lists/workflows/Tests/badge.svg)](https://github.com/xzeno/delegatee-lists/actions?query=workflow%3ATests)
[![npm](https://img.shields.io/npm/v/@xblackfury/delegatee-lists)](https://unpkg.com/@xblackfury/delegatee-lists@latest/)

This package includes a JSON schema for delegatee lists, and TypeScript utilities for working with delegatee lists.

The JSON schema represents the technical specification for a delegatee list which can be used in a dApp interface, such 
as the xZeno Governance app.

## What are delegatee lists?

xZeno Delegatee Lists is a specification for lists of delegatee metadata (e.g. address, name, avatar, ...) that can be
used by any dApp interfaces that needs one or more lists of delegatees.

Anyone can create and maintain a delegatee list, as long as they follow the specification.

Specifically an instance of a delegatee list is a [JSON](https://www.json.org/json-en.html) blob that contains a list of
delegatee metadata for use in dApp user interfaces.
Delegatee list JSON must validate against the [JSON schema](https://json-schema.org/) in order to be used in the xZeno
Governance app.
Delegatees on delegatee lists, and delegatee lists themselves, are tagged so that users can easily find them.

## JSON Schema $id

The JSON schema ID is [https://xzeno.org/delegateelist.schema.json](https://xzeno.org/delegateelist.schema.json)

## Validating delegatee lists

This package does not include code for delegatee list validation. You can easily do this by including a library such as 
[ajv](https://ajv.js.org/) to perform the validation against the JSON schema. The schema is exported from the package
for ease of use.

## Authoring delegatee lists

### Manual

The best way to manually author delegatee lists is to use an editor that supports JSON schema validation. Most popular
code editors do, such as [IntelliJ](https://www.jetbrains.com/help/idea/json.html#ws_json_schema_add_custom) or 
[VSCode](https://code.visualstudio.com/docs/languages/json#_json-schemas-and-settings). Other editors
can be found [here](https://json-schema.org/implementations.html#editors).

The schema is registered in the [SchemaStore](https://github.com/SchemaStore/schemastore), and any file that matches
the pattern `*.delegateelist.json` should 
[automatically utilize](https://www.jetbrains.com/help/idea/json.html#ws_json_using_schemas) 
the JSON schema for the [supported text editors](https://www.schemastore.org/json/#editors).

In order for your delegatee list to be able to be used, it must pass all JSON schema validation.

### Automated

If you want to automate delegatee listing, e.g. by pulling from a smart contract, or other sources, you can use this
npm package to take advantage of the JSON schema for validation and the TypeScript types.
Otherwise, you are simply working with JSON. All the usual tools apply, e.g.:

```typescript
import { DelegateeList, schema } from '@xblackfury/delegatee-lists'

// generate your delegatee list however you like.
const myList: DelegateeList = generateMyDelegateeList();

// use a tool like `ajv` to validate your generated delegatee list
validateMyDelegateeList(myList, schema);

// print the resulting JSON to stdout
process.stdout.write(JSON.stringify(myList));
```

## Semantic versioning

Lists include a `version` field, which follows [semantic versioning](https://semver.org/).

List versions must follow the rules:

- Increment major version when delegatees are removed
- Increment minor version when delegatees are added
- Increment patch version when delegatees already on the list have minor details changed (name, symbol, logo URL, decimals)

Changing a delegatee address is considered both a remove and an add, and should be a major version update.

Note that list versioning is used to improve the user experience, but not for security, i.e. list versions are not meant
to provide protection against malicious updates to a delegatee list; i.e. the list semver is used as a lossy compression
of the diff of list updates. List updates may still be diffed in the client dApp.

## Deploying your list

Once you have authored the list, you can make it available at any URI. Prefer pinning your list to IPFS 
(e.g. via [pinata.cloud](https://pinata.cloud)) and referencing the list by an ENS name that resolves to the 
[contenthash](https://eips.ethereum.org/EIPS/eip-1577).

If hosted on HTTPS, make sure the endpoint is configured to send an access-control-allow-origin header to avoid CORS errors.

### Linking an ENS name to the list

An ENS name can be assigned to an IPFS hash via the [contenthash](https://eips.ethereum.org/EIPS/eip-1577) text record.
This is the preferred way of referencing your list.

## Examples

You can find a simple example of a delegatee list in [test/schema/example.delegateelist.json](test/schema/example.delegateelist.json).
