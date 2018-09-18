
import Web3 from 'web3';

export default class ContractWrapper {
  constructor({abi, networks}, web3 = false, network = 'http://127.0.0.1:9545') {

    const provider = new Web3.providers.HttpProvider(network);
    
    const finalWeb3 = web3 ? web3 : new Web3(provider);

    const address = Object.entries(networks)
      .map( ([id, {address}]) => address)
      .filter(a => a)[0];

    let decoratedContract = new finalWeb3.eth.Contract(abi, address);

    return this.createContractProxy(decoratedContract);
  }

  createContractProxy(decoratedContract) {
    let handler = {
      get: (target, name) => {
        if(target.methods.hasOwnProperty(name) && 
            typeof target.methods[name] === 'function'){
          return (...args) => {
            target.methods[name](...args);
          }
        }
        throw `"${name}" is not a valid method on this contract`;
      }   
    }

    return new Proxy(decoratedContract, handler);
  }
}
