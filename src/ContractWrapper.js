
import Web3 from 'web3';

export default class ContractWrapper {
  constructor({abi, networks, ast}, web3 = false, network = 'http://127.0.0.1:8545') {

    const provider = new Web3.providers.HttpProvider(network);

    const finalWeb3 = web3 ? web3 : new Web3(provider);

    this.web3 = finalWeb3;

    console.log(networks);

    const address = Object.entries(networks)
      .map( ([id, {address}]) => address)
      .filter(a => a)[0];

    // proxy target
    this.web3Contract = new finalWeb3.eth.Contract(abi, address);
    this.proxyContract = this.createContractProxy(this.web3Contract);

    this.structs = this.buildStructs(ast);
    this.interface = this.buildInterface(ast);
    this.events = this.buildEvents(ast);

    console.log(this.web3);

    //console.log(this.web3Contract.methods);

    //return this.createContractProxy(decoratedContract);
  }

  buildStructs({nodes}) {
    return nodes[2].nodes
      .filter(({nodeType}) => nodeType === 'StructDefinition')
      .reduce((defsObject, {name, members}) => {
        members = members.reduce((memberObject, {name, typeDescriptions: {typeString: type}}) => {
          memberObject[name] = { name, type };
          return memberObject;
        }, {});

        defsObject[name] = { name, members };
        return defsObject;
      }, {});
  }

  buildEvents({nodes}){
    return nodes[2].nodes
    .filter(({nodeType}) => nodeType === 'EventDefinition')
    .reduce((events, {name, parameters = []}) => {

      parameters = this.mapParameters(parameters);

      events[name] = { name, parameters };
      return events;
    }, {});
  }

  buildInterface({nodes}){

    return nodes[2].nodes
      .filter(({nodeType, visibility, isConstructor}) => {
        return (nodeType === 'FunctionDefinition'
        || nodeType ===  'VariableDeclaration')
          && visibility === "public"
          && !isConstructor;
      })
      .reduce((functions, {name, nodeType, typeDescriptions = null, parameters = {parameters: []}, returnParameters = {parameters: []}}) => {
        parameters = this.mapParameters(parameters);
        returnParameters = this.mapParameters(returnParameters);

        if (!returnParameters.count && nodeType === 'VariableDeclaration') {
          returnParameters.push({name: "", type: typeDescriptions.typeString});
        }

        functions[name] = {
          name, parameters, returnParameters
        };

        return functions;
      },  {});
  }

  mapParameters({parameters}){
    return parameters.map(({name, typeDescriptions: {typeString: type}}) => {
      return { name, type };
    });
  }

  inputType(value, type){
    switch(type) {
      case 'bytes32': return this.web3.utils.utf8ToHex(value);
      default: return value;
    }
  }

  returnType(value, type){
    switch(type) {
      case 'bytes32': return this.web3.utils.hexToUtf8(value);
      case 'uint256':
      case 'uint': return Number(value);
      default: return value;
    }
  }

  createContractProxy(decoratedContract) {
    let handler = {
      get: (target, name) => {
        if(target.methods.hasOwnProperty(name) &&
            typeof target.methods[name] === 'function'){
          return async (...args) => {
            args.forEach((arg, index) => {
              let { type } = this.interface[name].parameters[index];
              args[index] = this.inputType(arg, type);
            });

            let result = await target.methods[name](...args).call();

            if (this.interface[name].returnParameters.length === 0) {
              return null;
            }
            if(typeof result !== "array") {
              return await this.returnType(result, this.interface[name].returnParameters[0].type);
            }

            return result;

          }
        }
        throw `"${name}" is not a valid method on this contract`;
      }
    }

    return new Proxy(decoratedContract, handler);
  }
}