# src/test/suite/fileAnalyzer.test.ts
**Language:** typescript  
**Analyzed:** 2026-04-01T19:49:19.662Z  

## Overview
This file contains a suite of tests for the fileAnalyzer module, which is responsible for analyzing files and extracting semantic information.

## Dependencies
- `src/core/analyzer/graphBuilder.ts`

## Symbols

### `extractJson` *(function)*
**Purpose:** Extracts JSON data from a given string, handling various edge cases such as trailing text, markdown code fences, and nested objects.  

**Behavior:** Parses the input string to extract a JSON object, using a combination of regular expressions and JSON parsing.

**Parameters:** raw (string)  
**Returns:** JSON object or null if no valid JSON is found  
**Limitations:** Does not handle invalid or truncated JSON  

### `normalizeSymbols` *(function)*
**Purpose:** Normalizes an array of symbol objects, filling in default values for missing fields.  

**Behavior:** Iterates over the input array, checking each symbol object for completeness and filling in default values as needed.

**Parameters:** symbols (array of symbol objects)  
**Returns:** Array of normalized symbol objects  
**Limitations:** Does not modify the original input array  

### `renderContextMarkdown` *(function)*
**Purpose:** Renders a file context as Markdown, including file path, language, overview, symbols, and dependencies.  

**Behavior:** Constructs a Markdown string by concatenating various components, including file path, language, overview, symbols, and dependencies.

**Parameters:** ctx (file context object)  
**Returns:** Markdown string  
**Limitations:** Does not handle empty or null input  

### `partitionForBatching` *(function)*
**Purpose:** Partitions an array of file nodes into batches based on their size, grouping small files together and large files separately.  

**Behavior:** Iterates over the input array, checking each file node's size and grouping them accordingly.

**Parameters:** files (array of file nodes)  
**Returns:** Object with two properties: batches (array of file node arrays) and large (array of file nodes)  
**Limitations:** Does not handle empty or null input  

### `isTrivialFile` *(function)*
**Purpose:** Determines whether a file is trivial or not, based on its size and content.  

**Behavior:** Checks the file's size and content, returning true if it is trivial and false otherwise.

**Parameters:** node (file node object), content (string)  
**Returns:** Boolean indicating whether the file is trivial or not  
**Limitations:** Does not handle empty or null input  

### `extractSemanticChunks` *(function)*
**Purpose:** Extracts semantic chunks from a file's content, including symbols, referenced symbols, and chunk content.  

**Behavior:** Iterates over the file's content, extracting semantic chunks based on various criteria such as symbol names, referenced symbols, and chunk content.

**Parameters:** node (file node object), content (string), graph (dependency graph object), budget (number)  
**Returns:** Object with two properties: chunks (array of semantic chunk objects) and preamble (string)  
**Limitations:** Does not handle empty or null input  

### `packChunksForAnalysis` *(function)*
**Purpose:** Packs an array of semantic chunks into groups based on their size and content, filling gaps with smaller chunks.  

**Behavior:** Iterates over the input array, packing semantic chunks into groups based on their size and content, filling gaps with smaller chunks.

**Parameters:** chunks (array of semantic chunk objects), preamble (string), node (file node object), graph (dependency graph object), budget (number)  
**Returns:** Array of group objects, each containing an array of semantic chunk objects and a combined content string  
**Limitations:** Does not handle empty or null input  
