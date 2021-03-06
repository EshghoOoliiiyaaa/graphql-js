/**
 * Copyright (c) 2015-present, Facebook, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import { printError } from './printError';
import { getLocation } from '../language/location';
import type { SourceLocation } from '../language/location';
import type { ASTNode } from '../language/ast';
import type { Source } from '../language/source';

/**
 * A GraphQLError describes an Error found during the parse, validate, or
 * execute phases of performing a GraphQL operation. In addition to a message
 * and stack trace, it also includes information about the locations in a
 * GraphQL document and/or execution result that correspond to the Error.
 */
declare class GraphQLError extends Error {
  constructor(
    message: string,
    nodes?: $ReadOnlyArray<ASTNode> | ASTNode | void,
    source?: ?Source,
    positions?: ?$ReadOnlyArray<number>,
    path?: ?$ReadOnlyArray<string | number>,
    originalError?: ?Error,
    extensions?: ?{ [key: string]: mixed },
  ): void;

  /**
   * A message describing the Error for debugging purposes.
   *
   * Enumerable, and appears in the result of JSON.stringify().
   *
   * Note: should be treated as readonly, despite invariant usage.
   */
  message: string;

  /**
   * An array of { line, column } locations within the source GraphQL document
   * which correspond to this error.
   *
   * Errors during validation often contain multiple locations, for example to
   * point out two things with the same name. Errors during execution include a
   * single location, the field which produced the error.
   *
   * Enumerable, and appears in the result of JSON.stringify().
   */
  +locations: $ReadOnlyArray<SourceLocation> | void;

  /**
   * An array describing the JSON-path into the execution response which
   * corresponds to this error. Only included for errors during execution.
   *
   * Enumerable, and appears in the result of JSON.stringify().
   */
  +path: $ReadOnlyArray<string | number> | void;

  /**
   * An array of GraphQL AST Nodes corresponding to this error.
   */
  +nodes: $ReadOnlyArray<ASTNode> | void;

  /**
   * The source GraphQL document for the first location of this error.
   *
   * Note that if this Error represents more than one node, the source may not
   * represent nodes after the first node.
   */
  +source: Source | void;

  /**
   * An array of character offsets within the source GraphQL document
   * which correspond to this error.
   */
  +positions: $ReadOnlyArray<number> | void;

  /**
   * The original error thrown from a field resolver during execution.
   */
  +originalError: ?Error;

  /**
   * Extension fields to add to the formatted error.
   */
  +extensions: ?{ [key: string]: mixed };
}

export function GraphQLError( // eslint-disable-line no-redeclare
  message: string,
  nodes?: $ReadOnlyArray<ASTNode> | ASTNode | void,
  source?: ?Source,
  positions?: ?$ReadOnlyArray<number>,
  path?: ?$ReadOnlyArray<string | number>,
  originalError?: ?Error,
  extensions?: ?{ [key: string]: mixed },
) {
  // Compute list of blame nodes.
  const _nodes = Array.isArray(nodes)
    ? nodes.length !== 0 ? nodes : undefined
    : nodes ? [nodes] : undefined;

  // Compute locations in the source for the given nodes/positions.
  let _source = source;
  if (!_source && _nodes) {
    const node = _nodes[0];
    _source = node && node.loc && node.loc.source;
  }

  let _positions = positions;
  if (!_positions && _nodes) {
    _positions = _nodes.reduce((list, node) => {
      if (node.loc) {
        list.push(node.loc.start);
      }
      return list;
    }, []);
  }
  if (_positions && _positions.length === 0) {
    _positions = undefined;
  }

  let _locations;
  if (positions && source) {
    const providedSource = source;
    _locations = positions.map(pos => getLocation(providedSource, pos));
  } else if (_nodes) {
    _locations = _nodes.reduce((list, node) => {
      if (node.loc) {
        list.push(getLocation(node.loc.source, node.loc.start));
      }
      return list;
    }, []);
  }

  Object.defineProperties(this, {
    message: {
      value: message,
      // By being enumerable, JSON.stringify will include `message` in the
      // resulting output. This ensures that the simplest possible GraphQL
      // service adheres to the spec.
      enumerable: true,
      writable: true,
    },
    locations: {
      // Coercing falsey values to undefined ensures they will not be included
      // in JSON.stringify() when not provided.
      value: _locations || undefined,
      // By being enumerable, JSON.stringify will include `locations` in the
      // resulting output. This ensures that the simplest possible GraphQL
      // service adheres to the spec.
      enumerable: true,
    },
    path: {
      // Coercing falsey values to undefined ensures they will not be included
      // in JSON.stringify() when not provided.
      value: path || undefined,
      // By being enumerable, JSON.stringify will include `path` in the
      // resulting output. This ensures that the simplest possible GraphQL
      // service adheres to the spec.
      enumerable: true,
    },
    nodes: {
      value: _nodes || undefined,
    },
    source: {
      value: _source || undefined,
    },
    positions: {
      value: _positions || undefined,
    },
    originalError: {
      value: originalError,
    },
    extensions: {
      value: extensions || (originalError && (originalError: any).extensions),
    },
  });

  // Include (non-enumerable) stack trace.
  if (originalError && originalError.stack) {
    Object.defineProperty(this, 'stack', {
      value: originalError.stack,
      writable: true,
      configurable: true,
    });
  } else if (Error.captureStackTrace) {
    Error.captureStackTrace(this, GraphQLError);
  } else {
    Object.defineProperty(this, 'stack', {
      value: Error().stack,
      writable: true,
      configurable: true,
    });
  }
}

(GraphQLError: any).prototype = Object.create(Error.prototype, {
  constructor: { value: GraphQLError },
  name: { value: 'GraphQLError' },
  toString: {
    value: function toString() {
      return printError(this);
    },
  },
});
