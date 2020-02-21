import { config } from 'dotenv'; config();
import { execSync } from 'child_process';
import { readdirSync, mkdirSync, writeFileSync, statSync, readFileSync, unlinkSync, rmdirSync } from 'fs';
import { basename, join, resolve } from 'path';
import chalk from 'chalk';
import rr from 'rimraf';

const { LUA_EXE, HOST, USER, PASSWORD } = process.env
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

function pressF (l: string, p: string) {
    console.log(l);
    unlinkSync(p);
}

readdirSync(workDir).forEach(locale => {
    readdirSync(join(workDir, locale)).forEach(jsonRecord => {
        let f = join(workDir, locale, jsonRecord);
        let a = JSON.parse(readFileSync(f, { encoding: 'utf8' })),
            p = `${locale}/${jsonRecord}`
        const base = basename(jsonRecord, '.json');
        if (!a[base]) return pressF(`Property ${base} not found in ${p}. It will be deleted.`, f)

        let r = a[base].all
        if (!r) return pressF(`Dataset full description not found in ${p}. Deleting.`, f)
        if (!Array.isArray(r)) return pressF(`Full description not an array in ${p}. Deleting.`, f)
        let out = r.map(id => a[base][id]);
        writeFileSync(f, JSON.stringify(out));
        console.log(`Repacked ${p}.`)
    })
})

rr.sync(join(workDir, 'zh-CN'));

readdirSync(workDir).forEach(locale => {
    readdirSync(join(workDir, locale)).forEach(jsonRecord => {
        let f = join(workDir, locale, jsonRecord);

        const collectionName = basename(jsonRecord, '.json')
        const cmd = `mongoimport --host ${HOST} --port 27017 --username ${USER} --password ${PASSWORD} --ssl --collection ${
            collectionName
        } --file ${f} --jsonArray --drop --authenticationDatabase admin --db ${locale}`
        try { execSync(cmd, { stdio: 'inherit' }) }
        catch {
            console.log(`Failed: ${chalk.green(f)} to ${locale}.${chalk.yellow(collectionName)}`)
        }
    })
})
