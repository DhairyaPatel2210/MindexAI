# src/test/suite/indexer.test.ts
**Language:** typescript  
**Analyzed:** 2026-03-30T19:56:37.518Z  

## Overview
This file contains unit tests for the indexer functionality, which is responsible for building a semantic index of code files. The tests cover various aspects of the indexer, including building the index structure, counting symbols, handling symbol collisions, and populating the keyword index.

## Dependencies
- `src/core/analyzer/indexer.ts`
- `src/core/analyzer/fileAnalyzer.ts`
- `src/core/analyzer/graphBuilder.ts`

## Symbols

### `buildIndex` *(function)*
**Purpose:** Builds a semantic index of code files  

**Behavior:** Takes a list of file contexts and a dependency graph as input and returns a semantic index

**Parameters:** file contexts, dependency graph  
**Returns:** semantic index  
**Limitations:** Requires a valid dependency graph and file contexts  

### `extractMeaningfulWords` *(function)*
**Purpose:** Extracts meaningful words from a given text  

**Behavior:** Takes a string as input and returns a list of meaningful words

**Parameters:** text  
**Returns:** list of meaningful words  
**Limitations:** May not work correctly with non-English text or text with special characters  
