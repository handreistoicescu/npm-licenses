const { spawn } = require('child_process');
var fs = require('fs');

const npmList = spawn('npm', ['ls', '--json', '--prod', '--long']);

let stdoutData = [];

npmList.stdout.on('data', (chunk) => {
  stdoutData.push(chunk);
});

npmList.stderr.on('data', (data) => {
  console.log(`stderr: ${data}`);
});

npmList.on('close', (code) => {
  let stdoutText = stdoutData.join('');
  let stdoutJSON = JSON.parse(stdoutText);
  let resultJSON = parseDependencies(stdoutJSON, [], {}, 'npm-licenses');
  let resultCSV = jsonToCSV(resultJSON, ['name', 'direct parents', 'root parent', 'license']);

  // TODO: arrange CSV in alphabetical order, maybe?

  createAsset('./licenses', 'licenses.csv', resultCSV);
});

function parseDependencies(json, resultArray, indexStore, appRoot) {
  // store the main application name
  const appRootName = appRoot;

  if (!json.dependencies || Object.keys(json.dependencies).length === 0) {
    return;
  }

  Object.values(json.dependencies).forEach((currentValue, idx, array) => {
    // Check if name entry already exists; if it does, add multiple parents
    if (indexStore[currentValue.name]) {
      // if the parent is already added from another instance, don't add it again
      let parentText = resultArray[indexStore[currentValue.name]].directParents;

      if (parentText.indexOf(json.name) === -1) {
        resultArray[indexStore[currentValue.name]].directParents += '\r\n' + json.name;
      }
    } else {
      const entry = {
        name: currentValue.name,
        directParents: json.name
      }

      if (json.name === appRootName) {
        // if this is the first level of dependencies (root), assign rootParent to children as ''
        entry.rootParent = '';
      } else {
        // if it's not, assign rootParent as either the parent's previous rootParent value, or if there's no rootParent value assign the previous dependency's name
        if (resultArray[indexStore[json.name]] && resultArray[indexStore[json.name]].rootParent) {
          entry.rootParent = resultArray[indexStore[json.name]].rootParent;
        } else {
          entry.rootParent = json.name;
        }
      }

      // some licenses are stored in an array of objects that contain a 'type' property and a 'url' property
      // but most of them are primitives (strings)
      if (typeof currentValue.license === 'object') {
        entry.license = currentValue.license.type + '\r\n' + currentValue.license.url;
      } else if(typeof currentValue.licenses === 'object') {
        entry.license = currentValue.licenses[0].type + '\r\n' + currentValue.licenses[0].url;
      } else {
        entry.license = currentValue.license;
      }

      // entry.rootParent = 'Root Parent';

      const arrLength = resultArray.push(entry);

      // put the index in the index store
      indexStore[currentValue.name] = arrLength - 1;
    }


    parseDependencies(json.dependencies[currentValue.name], resultArray, indexStore, appRootName);
  });

  return resultArray;
}

function csvLine(array) {
  let result = '';

  array.forEach((curr, idx, arr) => {
    let separator = idx === arr.length - 1 ? '\r\n' : ',';

    // Fields containing line breaks (CRLF), double quotes, and commas should be enclosed in double quotes.
    result = result + '\"' + curr + '\"' + separator;
  });

  return result;
}

function jsonToCSV(json, fieldNamesArray) {
  // TODO: check if json fields number is equal to field names number
  let result = '';

  result = result + csvLine(fieldNamesArray);

  json.forEach((curr, idx, array) => {
    result = result + csvLine(Object.values(curr));
  });

  return result;
}

function createAsset(directoryName, fileName, data) {
  // TODO - check validity of path
  let path = directoryName + '/' + fileName;

  fs.access(directoryName, (err) => {
    if (err) {
      fs.mkdir(directoryName, (err) => {
        if (err) throw err;
        fs.writeFile(path, data, (err) => {
          if (err) throw err;
          console.log('Generated CSV');
        });
      })
    } else {
      fs.writeFile(path, data, (err) => {
        if (err) throw err;
        console.log('Generated CSV');
      });
    }
  })
}