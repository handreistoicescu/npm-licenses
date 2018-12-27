const { spawn } = require('child_process');
var fs = require('fs');

const npmList = spawn('npm', ['ls', '--json', '--prod', '--long']);
// const myWriteStream = fs.createWriteStream('./writeMe.txt');

// npmList.stdout.pipe(myWriteStream);

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

  console.log(resultCSV);
});

function parseDependencies(json, resultArray) {
  if (!json.dependencies || Object.keys(json.dependencies).length === 0) {
    return;
  }

  Object.values(json.dependencies).forEach((currentValue) => {
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

// TODO - create folder for licenses if it doesn't exist

// npmList.stdout.pipe(myWriteStream);