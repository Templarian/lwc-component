#!/usr/bin/env node

var fs = require('fs');
var path = require('path');
var yargsInteractive = require("yargs-interactive");
var colors = require('colors');
var root = process.cwd();

const getDirectories = source =>
  fs.readdirSync(source, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);

const hyphenToCamel = str =>
    str.replace(/-([a-z])/g, function (g) { return g[1].toUpperCase(); });

const camelToHyphen = str =>
    str.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();

const error = (msg) => console.log(colors.red(msg));

var modulesFolder = path.join(root, 'src', 'modules');
var tsConfig = path.join(root, 'tsconfig.json');

if (!fs.existsSync(modulesFolder)) {
    error('Error: Two assumptions... you are in the root of your project and src/modules exists!');
    process.exit(0);
}

// TypeScript 😇 or JavaScript 😈
var isTypeScript = false;
if (fs.existsSync(tsConfig)) {
    isTypeScript = true;
}

var namespaceChoices = [];
getDirectories(modulesFolder).forEach(dir => {
    namespaceChoices.push(dir);
});

if (namespaceChoices.length === 0) {
    error('Error: Add a namespace folder to "src/modules"');
    process.exit();
}

var questions = [];

if (namespaceChoices.length > 1) {
    questions.push({
        name: 'namespace',
        type: 'list',
        describe: 'Component Namespace',
        choices: namespaceChoices,
        default: namespaceChoices[0],
        prompt: 'always'
    });
}

questions.push({
    name: 'component',
    type: 'input',
    describe: 'Component Name',
    prompt: 'always'
});

questions.push({
    name: 'css',
    type: 'confirm',
    describe: 'CSS File',
    prompt: 'always',
    default: true
});

questions.push({
    name: 'unit',
    type: 'confirm',
    describe: 'Unit Test',
    prompt: 'always',
    default: false
});

questions.push({
    name: 'wdio',
    type: 'confirm',
    describe: 'WDIO Test',
    prompt: 'always',
    default: false
});

var options = questions.reduce((opts, opt) => {
    opts[opt.name] = opt;
    return opts;
}, {});
options['interactive'] = { default: true };

yargsInteractive()
    .usage("$0 [args]")
    .interactive(
        options
    ).then(result => {
        result.namespace = result.namespace || namespaceChoices[0];
        if (result.component === '') {
            error('Error: A component has to have a name!');
            process.exit();
        }
        if (result.component[0] !== result.component[0].toLowerCase()) {
            error('Error: Component name must start with a lowercase letter!');
            process.exit();
        }
        if (result.component.match(/-/)) {
            var original = result.component;
            result.component = hyphenToCamel(original);
            console.log(`Assuming "${result.component}" (was "${original}")`);
        }
        const file = path.join(modulesFolder, result.namespace, result.component);
        if (fs.existsSync(file)) {
            error('Error: Component already exists!');
            process.exit();
        }
        console.log(colors.green('Do you want to create:'));
        console.log(`  ${colors.blue(result.namespace)}/`);
        console.log(`  ├── ${colors.blue(result.component)}/`);
        if (result.unit) {
            console.log(`  │   ├── ${colors.blue(`__tests__`)}/`);
            console.log(`  │   │   └── ${colors.blue(`${result.component}.test.js`)}`);
        }
        if (result.wdio) {
            console.log(`  │   ├── ${colors.blue(`__wdio__`)}/`);
            console.log(`  │   │   └── ${colors.red(`Coming Soon`)}`);
        }
        if (result.css) {
            console.log(`  │   ├── ${colors.blue(`${result.component}.css`)}`);
        }
        console.log(`  │   ├── ${colors.blue(`${result.component}.html`)}`);
        console.log(`  │   └── ${colors.blue(`${result.component}.${isTypeScript ? 'ts' : 'js'}`)}`);
        yargsInteractive()
            .usage("$0 [args]")
            .interactive({
                interactive: { default: true },
                yn: {
                    type: 'confirm',
                    describe: 'Create Component',
                    prompt: 'always',
                    default: true
                }
            }).then(({ yn }) => {
                if (yn) {
                    // Write Files
                    writeFiles(
                        result.namespace,
                        result.component,
                        isTypeScript,
                        result.css,
                        result.unit,
                        result.wdio
                    );
                }
            });
    });

function writeFiles(namespace, component, isTypeScript, hasCss, hasUnit, hasWdio) {
    var namespaceC = namespace.replace(/^(\w)/, m => m[0].toUpperCase());
    var componentC = component.replace(/^(\w)/, m => m[0].toUpperCase());
    var tag = `${namespace}-${camelToHyphen(component)}`;
    var ext = isTypeScript ? 'ts' : 'js';
    var nsDir = path.join(modulesFolder, namespace);
    // comp/
    var componentDir = path.join(nsDir, component);
    fs.mkdirSync(componentDir);
    // comp/comp.ts or comp/comp.js
    var componentFile = path.join(componentDir, `${component}.${ext}`);
    fs.writeFileSync(componentFile, [
        `import { LightningElement } from 'lwc';`,
        ``,
        `export default class ${componentC} extends LightningElement { }`
    ].join(`\n`));
    // comp/comp.html
    var componentHtml = path.join(componentDir, `${component}.html`);
    fs.writeFileSync(componentHtml, `<template>\n\n</template>`);
    if (hasCss) {
        // comp/comp.css
        var componentCss = path.join(componentDir, `${component}.css`);
        fs.writeFileSync(componentCss, '');
    }
    if (hasUnit) {
        // comp/__tests__/
        var testsDir = path.join(componentDir, '__tests__');
        fs.mkdirSync(testsDir);
        // comp/__tests__/
        var testFile = path.join(testsDir, `${component}.test.${ext}`);
        fs.writeFileSync(testFile, [
            `import { createElement } from 'lwc';`,
            `import ${namespaceC}${componentC} from '${namespace}/${component}';`,
            ``,
            `describe('${tag}', () => {`,
            `    afterEach(() => {`,
            `        // The jsdom instance is shared across test cases in a single file so reset the DOM`,
            `        while (document.body.firstChild) {`,
            `            document.body.removeChild(document.body.firstChild);`,
            `        }`,
            `    });`,
            ``,
            `    it('render component', () => {`,
            `        const element = createElement('${tag}', {`,
            `            is: ${namespaceC}${componentC}`,
            `        });`,
            `        document.body.appendChild(element);`,
            `        expect(document.querySelector('${tag}')).toBe(true);`,
            `    });`,
            `});`
        ].join(`\n`));
    }
    if (hasWdio) {
        // Coming Soon
    }
};