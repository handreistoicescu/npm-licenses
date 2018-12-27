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
  let resultJSON = parseDependencies(stdoutJSON, []);
  let resultCSV = jsonToCSV(resultJSON, ['name', 'license', 'direct parent']);

  // TODO: arrange CSV in alphabetical order, maybe?

  createAsset('./licenses', 'licenses.csv', resultCSV);
});

function parseDependencies(json, resultArray) {
  if (!json.dependencies || Object.keys(json.dependencies).length === 0) {
    return;
  }

  Object.values(json.dependencies).forEach((currentValue, idx, array) => {
    // TODO: Check if name entry already exists; if it does, add multiple parents
    resultArray.push({
      name: currentValue.name,
      license: currentValue.license,
      directParent: json.name
    });

    parseDependencies(json.dependencies[currentValue.name], resultArray);
  });

  return resultArray;
}

function csvLine(array) {
  let result = '';

  array.forEach((curr, idx, arr) => {
    let separator = idx === arr.length - 1 ? '\r\n' : ',';
    result = result + curr + separator;
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