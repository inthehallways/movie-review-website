const sql = require('mssql');

const config = {
    user: 'Allen',
    password: 'kalisqlserver',
    server: 'KALI\\SQLEXPRESS', // double backslash here
    database: 'SceneITDB',
    options: {
        encrypt: false, // or true if you use encryption
        trustServerCertificate: true
    } 
};

async function getPool() {
  return await sql.connect(config);
}

module.exports = { sql, getPool };