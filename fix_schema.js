const db = require('./src/config/db');
db.promise().query("ALTER TABLE registration ADD COLUMN Role VARCHAR(20) DEFAULT 'VOLUNTEER'")
    .then(() => console.log('Column added'))
    .catch(console.error)
    .finally(() => process.exit());
