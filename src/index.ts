import { config } from 'dotenv'; config();
import { execSync } from 'child_process';
import { readdirSync, mkdtempSync, writeFileSync, statSync } from 'fs';
import { basename, join, resolve } from 'path';
import chalk from 'chalk';

const { HOST, USER, PASSWORD, LUA_EXE } = process.env
const cwd = process.cwd()
const s = join(cwd, 'AzurLaneData'); const workDir = mkdtempSync('al');

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

readdirSync(s).forEach(/** client locale */ variation => {
    const l = join(s, variation);
    if (variation.startsWith('.') /** hidden folder */ || !statSync(l).isDirectory()) return

    const basePath = join(l, 'sharecfg');

    readdirSync(basePath).forEach(async fileName => {
        const fullPath = join(basePath, fileName);

        let json = execSync(`${LUA_EXE} main.lua ${resolve(fullPath)}`, { cwd: './lua', encoding: 'utf8' });
        let base = basename(fileName, '.lua');
        (json as any) = (JSON.parse(json)[base]);
        if (!json) return; // invalid, pass
        delete (json as any).all;
        const _ : any[] = [];
        for (let key in (json as any)) { 
            _.push(
                Object.assign({}, json[key as any], { id: isNaN(+key) ? `${key}` : +key })
            ) 
        }

        const out = join(workDir, `${base}.json`);
        writeFileSync(out, JSON.stringify(_), { encoding: 'utf8' });

        // if ((require(`../${fullPath}`) as any[]).length == 0) return;
        const collectionName = base;
        console.log(`Pushing ${chalk.green(`${base}.json`)} to ${variation}.${chalk.yellow(collectionName)}`)
        const cmd = `mongoimport --host ${HOST} --port 27017 --username ${USER} --password ${PASSWORD} --ssl --collection ${
            collectionName
        } --file ${out} --jsonArray --drop --authenticationDatabase admin --db ${variation}`
        await sleep(2000);
        try { execSync(cmd, { stdio: 'inherit' }) }
        catch {
            console.log(`Failed: ${chalk.green(fullPath)} to ${variation}.${chalk.yellow(collectionName)}`)
        }
    })
})
