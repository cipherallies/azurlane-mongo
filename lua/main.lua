pg = {};
local json = require('json.json');
dofile(arg[1]);
print(json.encode(pg))