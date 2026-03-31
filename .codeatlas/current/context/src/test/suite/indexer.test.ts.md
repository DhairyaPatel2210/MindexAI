# src/test/suite/indexer.test.ts
**Language:** typescript  
**Analyzed:** 2026-03-30T21:28:59.056Z  

## Overview
This file contains unit tests for the indexer functionality, which is responsible for building and populating a semantic index of code. The tests cover various scenarios, including building the index structure, counting symbols, handling symbol collisions, and extracting meaningful words from symbol descriptions.

## Dependencies
- `src/core/analyzer/indexer.ts`
- `src/core/analyzer/fileAnalyzer.ts`
- `src/core/analyzer/graphBuilder.ts`

## Symbols

### `buildIndex` *(function)*
**Purpose:** Builds and populates a semantic index of code  

**Behavior:** Takes a list of file contexts and a dependency graph as input, and returns a populated semantic index

**Parameters:** file contexts, dependency graph  
**Returns:** semantic index  
**Limitations:** Assumes that the input file contexts and dependency graph are valid and well-formed  

### `extractMeaningfulWords` *(function)*
**Purpose:** Extracts meaningful words from a given string  

**Behavior:** Takes a string as input, and returns a list of meaningful words extracted from the string

**Parameters:** string  
**Returns:** list of meaningful words  
**Limitations:** Assumes that the input string is a valid string and does not contain any special characters  
