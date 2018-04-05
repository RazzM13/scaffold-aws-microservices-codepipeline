const $RefParser = require('json-schema-ref-parser');
const Handlebars = require('handlebars');
const Promise = require('promise');
const yaml = require('js-yaml');
const fs   = require('fs-extra');
const Yargs = require('yargs')
.option('out', {
  alias: 'o',
  describe: 'output filename'
})
.default('out', 'out.yaml');

const argv = Yargs.argv;
const configurationFn = 'config.yaml';
const mainTemplateFn = 'template.yaml';

var templates = {};
var configuration = null;

var setup = function() {
  console.log('Loading configuration.');
  let promises = [];
  let templateFiles = fs.readdirSync('templates');
  promises.push(fs.readFile(configurationFn, {encoding: 'utf8'}));
  promises.push(fs.readFile(mainTemplateFn, {encoding: 'utf8'}));
  for (let file of templateFiles) {
    promises.push(fs.readFile(`templates/${file}`, {encoding: 'utf8'}));
  }

  return Promise.all(promises).then(function(data) {
    configuration = yaml.safeLoad(data[0]);
    templates['main'] = data[1];
    for (let x=0; x<templateFiles.length; x++) {
      templates[templateFiles[x].replace('.yaml', '')] = data[x+2];
    }
  });
};

var render = function() {
  console.log('Rendering templates.');
  for (let template in templates) {
    let data = templates[template];
    data = Handlebars.compile(data)(configuration);
    data = yaml.safeLoad(data);
    templates[template] = data;
  }
};

var dereference = function() {
  console.log('Dereferencing main template.');
  let mainTemplate = templates['main'];
  mainTemplate['templates'] = templates;
  delete templates['main'];
  return $RefParser.dereference(mainTemplate);
};

var save = function(template) {
  console.log(`Writing template to ${argv.out}.`);
  delete(template['templates']);
  let doc = yaml.safeDump(template, {noRefs: true});
  return fs.writeFile(argv.out, doc);
};

setup()
.then(render)
.then(dereference)
.then(save)
.catch(function(err) {
  console.error(err);
});
