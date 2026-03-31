# src/test/suite/fileAnalyzer.test.ts
**Language:** typescript  
**Analyzed:** 2026-03-30T21:28:48.253Z  

## Overview
This file contains tests for the fileAnalyzer module, which provides functions for extracting JSON data, normalizing symbol data, rendering context markdown, and partitioning files for batching.

## Dependencies
- `src/core/analyzer/graphBuilder.ts`

## Symbols

### `extractJson` *(function)*
**Purpose:** Extracts JSON data from a string, handling various edge cases and formats.  

**Behavior:** Parses JSON strings, stripping markdown code fences and handling nested objects, escaped quotes, and braces inside strings.

**Parameters:** raw string (string)  
**Returns:** Parsed JSON object (object)  
**Limitations:** Returns null for empty strings, invalid/truncated JSON, or when no JSON object is found.  

### `normalizeSymbols` *(function)*
**Purpose:** Normalizes symbol data, filling in default values for missing fields.  

**Behavior:** Takes an array of symbol objects and returns a new array with default values filled in for missing fields.

**Parameters:** array of symbol objects (array)  
**Returns:** Normalized array of symbol objects (array)  
**Limitations:** Preserves optional fields when present, but returns an empty array for empty input.  

### `renderContextMarkdown` *(function)*
**Purpose:** Renders context markdown, including file path, language, overview, symbol names, and dependencies.  

**Behavior:** Takes a file context object and returns a markdown string with the specified information.

**Parameters:** file context object (object)  
**Returns:** Markdown string (string)  
**Limitations:** Shows a failure notice for empty context, but returns a non-empty string otherwise.  

### `partitionForBatching` *(function)*
**Purpose:** Partitions files into batches and large files, based on size thresholds.  

**Behavior:** Takes an array of file nodes and returns an object with batches and large files.

**Parameters:** array of file nodes (array)  
**Returns:** Object with batches and large files (object)  
**Limitations:** Treats files exactly at the threshold as small, but all large files go into the large list.  
