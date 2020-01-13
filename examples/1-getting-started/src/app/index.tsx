import React, { FC, Suspense } from 'react';
import * as ReactDOM from 'react-dom';
import { createClient, Provider, dedupExchange, cacheExchange, fetchExchange } from 'urql';
import { suspenseExchange } from '@urql/exchange-suspense';
import { Home } from './Home';
import './index.css';

const client = createClient({
  url: 'http://localhost:3001/graphql',
  suspense: true,
  exchanges: [
    dedupExchange,
    suspenseExchange, // Add suspenseExchange to your urql exchanges
    cacheExchange,
    fetchExchange,
  ],
});

export const App: FC = () => (
  <Suspense fallback={<p>Loading...</p>}>
    <Provider value={client}>
      <main>
        <h1>Todos</h1>
        <Home />
      </main>
    </Provider>
  </Suspense>
);

App.displayName = 'App';

ReactDOM.render(<App />, document.getElementById('root'));
