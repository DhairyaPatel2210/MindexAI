# src/test/suite/index.ts
**Language:** typescript  
**Analyzed:** 2026-03-30T21:28:27.515Z  

## Overview
Entry point for running tests

## Symbols

### `run` *(function)*
**Purpose:** Runs the tests  

**Behavior:** Creates a Mocha instance, adds test files, runs the tests, handles test failures

**Parameters:** None  
**Returns:** Promise<void>  
**Limitations:** Does not handle test failures with special characters  
