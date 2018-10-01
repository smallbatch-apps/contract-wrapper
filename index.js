
import ContractWrapper from './src/ContractWrapper';
import contract from './build/contracts/Flight.json';
import 'babel-polyfill';

import './styles/style.scss';

let decoratedContract = new ContractWrapper(contract);
//console.log(contract.ast);
//console.log(decoratedContract);
decoratedContract.proxyContract.setFlightId("DJ420").then(result => {
  console.log(result);
  decoratedContract.proxyContract.flightId().then(flightid => {
    console.log(flightid);
  });
});

