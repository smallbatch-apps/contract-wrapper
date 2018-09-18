
import ContractWrapper from './src/ContractWrapper';
import contract from './build/FindMe.json';
import 'babel-polyfill';

import './styles/style.scss';

let decoratedContract = new ContractWrapper(contract);