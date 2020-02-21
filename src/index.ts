import { config } from 'dotenv'; config();
import { execSync } from 'child_process';
import { readdirSync, mkdirSync, writeFileSync, statSync } from 'fs';
import { basename, join, resolve } from 'path';
import chalk from 'chalk';

const { LUA_EXE } = process.env
const cwd = process.cwd()
const s = join(cwd, 'AzurLaneData'), workDir = join(process.env.RUNNER_TEMP, 'al');
mkdirSync(workDir);


readdirSync(s).forEach(/** client locale */ variation => {
    const l = join(s, variation);
    if (variation.startsWith('.') /** hidden folder */ || !statSync(l).isDirectory()) return

    const basePath = join(l, 'sharecfg');
    const baseOut = join(workDir, variation);

    mkdirSync(baseOut)
    readdirSync(basePath).forEach(fileName => {
        const fullPath = join(basePath, fileName);
        process.stdout.write(`\nProcessing ${variation}/${chalk.green(fileName)}`);
        let json : string = ''; 
        try {
            json = execSync(`${LUA_EXE} main.lua ${resolve(fullPath)}`, { cwd: './lua', encoding: 'utf8', maxBuffer: Infinity });
        } catch {
            process.stdout.write(` | Error occurred, skipping`);
            return;
        }
        let base = basename(fileName, '.lua');
        const out = join(baseOut, `${base}.json`);
        writeFileSync(out, json);
        process.stdout.write(` | Completed -> ${variation}/${chalk.yellow(`${base}.json`)}`)
    })
})
