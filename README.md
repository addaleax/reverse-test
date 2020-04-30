# reverse-test

Test your package’s dependents!

[![Build Status](https://travis-ci.org/addaleax/reverse-test.svg?style=flat&branch=master)](https://travis-ci.org/addaleax/reverse-test?branch=master)
[![Coverage Status](https://coveralls.io/repos/addaleax/reverse-test/badge.svg?branch=master)](https://coveralls.io/r/addaleax/reverse-test?branch=master)
[![Dependency Status](https://david-dm.org/addaleax/reverse-test.svg?style=flat)](https://david-dm.org/addaleax/reverse-test)

Fetches your package’s top `n` dependents (by download count) and tests them with the package you’re currently in.

```sh
npm install -g reverse-test
cd /path/to/my/project
reverse-test -c 3
```

Or specify a list of dependent packages to test:

```sh
npm install -g reverse-test
cd /path/to/my/project
reverse-test dependent-package-1 dependent-package-2 ...
```
