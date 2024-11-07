import mysql from "mysql2/promise";

const pool = mysql.createPool({
	host: "127.0.0.1",
	user: "pradra01",
	password: "pradra01",
	database: "f24_cs440_waldo",
	port: 3306,
});

(async () => {
	try {
		const [rows] = await pool.query("SELECT * FROM user");
		console.log(rows);
	} catch (error) {
		console.error("Error executing query:", error.message);
	} finally {
		await pool.end();
	}
})();

export default pool;
