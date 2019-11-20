import {
  extractSelectionsFromQuery,
  addFragmentsToQuery,
  populateExchange,
} from './populate';
import {
  buildSchema,
  print,
  introspectionFromSchema,
  visit,
  FragmentDefinitionNode,
  DocumentNode,
  ASTNode,
  ASTKindToNode,
} from 'graphql';
import gql from 'graphql-tag';
import { fromValue, pipe, toPromise, fromArray, toArray } from 'wonka';
import { Operation, OperationResult } from 'src/types';
import { Client } from 'src/client';

const schemaDef = `
  interface Node {
    id: ID!
  }

  type User implements Node {
    id: ID!
    name: String!
    age: Int!
    todos: [Todo]
  }

  type Todo implements Node {
    id: ID!
    text: String!
    creator: User!
  }

  type Query {
    todos: [Todo]
    users: [User]
  }

  type Mutation {
    addTodo: [Todo]
    removeTodo: [Node]
  }
`;

const getNodesByType = <T extends keyof ASTKindToNode, N = ASTKindToNode[T]>(
  query: DocumentNode,
  type: T
) => {
  let result: N[] = [];

  visit(query, {
    [type]: n => {
      result = [...result, n];
    },
  });
  return result;
};

const schema = introspectionFromSchema(buildSchema(schemaDef));

beforeEach(jest.clearAllMocks);

const exchangeArgs = {
  forward: a => a as any,
  client: {} as Client,
};

describe('on mutation without query', () => {
  const operation = {
    key: 1234,
    operationName: 'mutation',
    query: gql`
      mutation MyMutation {
        addTodo @populate
      }
    `,
  } as Operation;

  describe('mutation query', () => {
    it('matches snapshot', async () => {
      const response = pipe<Operation, any, Operation[]>(
        fromValue(operation),
        populateExchange({ schema })(exchangeArgs),
        toArray
      );
      expect(print(response[0].query)).toMatchSnapshot();
    });
  });
});

describe('on query then mutation', () => {
  const queryOp = {
    key: 1234,
    operationName: 'query',
    query: gql`
      query {
        todos {
          id
          text
          creator {
            id
            name
          }
        }
        users {
          todos {
            text
          }
        }
      }
    `,
  } as Operation;

  const mutationOp = {
    key: 5678,
    operationName: 'mutation',
    query: gql`
      mutation MyMutation {
        addTodo @populate
      }
    `,
  } as Operation;

  describe('mutation query', () => {
    it('matches snapshot', async () => {
      const response = pipe<Operation, any, Operation[]>(
        fromArray([queryOp, mutationOp]),
        populateExchange({ schema })(exchangeArgs),
        toArray
      );

      expect(print(response[1].query)).toMatchSnapshot();
    });
  });
});

describe('on query w/ fragment then mutation', () => {
  const queryOp = {
    key: 1234,
    operationName: 'query',
    query: gql`
      query {
        todos {
          ...TodoFragment
        }
      }

      fragment TodoFragment on Todo {
        id
        text
      }
    `,
  } as Operation;

  const mutationOp = {
    key: 5678,
    operationName: 'mutation',
    query: gql`
      mutation MyMutation {
        addTodo @populate
      }
    `,
  } as Operation;

  describe('mutation query', () => {
    it('matches snapshot', async () => {
      const response = pipe<Operation, any, Operation[]>(
        fromArray([queryOp, mutationOp]),
        populateExchange({ schema })(exchangeArgs),
        toArray
      );

      expect(print(response[1].query)).toMatchSnapshot();
    });

    it('includes user fragment', () => {
      const response = pipe<Operation, any, Operation[]>(
        fromArray([queryOp, mutationOp]),
        populateExchange({ schema })(exchangeArgs),
        toArray
      );

      const fragments = getNodesByType(response[1].query, 'FragmentDefinition');
      expect(
        fragments.filter(f => f.name.value === 'TodoFragment')
      ).toHaveLength(1);
    });
  });
});

describe('on query then mutation w/ interface return type', () => {
  const queryOp = {
    key: 1234,
    operationName: 'query',
    query: gql`
      query {
        todos {
          id
          name
        }
        users {
          id
          text
        }
      }
    `,
  } as Operation;

  const mutationOp = {
    key: 5678,
    operationName: 'mutation',
    query: gql`
      mutation MyMutation {
        removeTodo @populate
      }
    `,
  } as Operation;

  describe('mutation query', () => {
    it('matches snapshot', async () => {
      const response = pipe<Operation, any, Operation[]>(
        fromArray([queryOp, mutationOp]),
        populateExchange({ schema })(exchangeArgs),
        toArray
      );

      expect(print(response[1].query)).toMatchSnapshot();
    });
  });
});
