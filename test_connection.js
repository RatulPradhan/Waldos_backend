import pool from "./db_connect.js"; // Import the connection pool

(async function testConnection() {
	try {
		// Execute a simple query to test the connection
		const [rows] = await pool.query("SELECT 1 + 1 AS solution");
		console.log("Query result:", rows[0].solution); // Should print: 2
	} catch (error) {
		console.error("Query failed:", error.message);
	} finally {
		// Close the pool when done
		await pool.end();
	}
})();
