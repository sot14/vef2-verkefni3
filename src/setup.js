import dotenv from 'dotenv';
import fs from 'fs';
import util from 'util';
import pg from 'pg';
import faker from 'faker';

dotenv.config();

const connectionString = process.env.DATABASE_URL;

const readFileAsync = util.promisify(fs.readFile);

async function query(q, values = []) {
    const pool = new pg.Pool({ connectionString });


  const client = await pool.connect();

  try {
    const result = await client.query(q, values);

    const { rows } = result;
    return rows;
  // eslint-disable-next-line no-useless-catch
  } catch (err) {
    throw err;
  } finally {
    await client.end();
  }
}
async function insertFakes(n) {
  for(let i = 0; i < n; i++) {
    var name = faker.name.findName();
    var nationalId = "";
    var comment = Math.random() >= 0.5 ? faker.lorem.sentence() : "";
    var anonymous = Math.random() >= 0.5 ? false : true;
    var signed = faker.date.recent(14);
    
    for(let j = 0; j < 9; j++) {
      nationalId += `${Math.floor(Math.random()*10)}`
    }

    if(name.includes("'")) {
      name = name.replace('\'', '\'\'');
    }

    const nextQuery = `INSERT INTO signatures (name, nationalId, comment, anonymous, signed) VALUES ($1, $2, $3, $4, $5);`;
    await query(nextQuery, [name, nationalId, comment, anonymous, signed]);
    console.log("inserted query ", i);
  }
  // insert user admin
  const userQuery = 'INSERT INTO users (username, password, admin) VALUES ($1, $2, $3);';
  await query(userQuery, ["admin", "password", true]);
  await query(userQuery, ["normalUser", "password", false]);
}

async function main() {
  console.info(`Set upp gagnagrunn á ${connectionString}`);
  // droppa töflu ef til
  await query('DROP TABLE IF EXISTS signatures');
  await query('DROP TABLE IF EXISTS users');
  console.info('Töflum eytt');

  // búa til töflu út frá skema
  try {
    const createTable = await readFileAsync('./sql/schema.sql');
    await query(createTable.toString('utf8'));
    console.info('Tafla búin til');
  } catch (e) {
    console.error('Villa við að búa til töflu:', e.message);
    return;
  }

  // bæta faker færslum við töflu
  // try {
  //   const insert = await readFileAsync('./sql/fake.sql');
  //   await query(insert.toString('utf8'));
  //   console.info('Gögnum bætt við');
  // } catch (e) {
  //   console.error('Villa við að bæta gögnum við:', e.message);
  // }
  try {
    await insertFakes(500);
    console.info('Gögnum bætt við');
  } catch (e) {
    console.error('Villa við að bæta gögnum við:', e.message);
  }
}

main().catch((err) => {
  console.error(err);
});